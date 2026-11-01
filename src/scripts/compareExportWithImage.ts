/* eslint-disable no-console */
/**
 * 납부현황 내보내기가 내는 칸 상태를 재무의 기존 표와 견준다. 읽기 전용이다.
 *
 * 재무의 표는 캡처에서 옮겨 적은 `docs/회비 정산/data/2026-05-25-이미지-데이터.json`이고
 * (실명이 들어 있어 저장소에는 없다. 로컬에 직접 둔다),
 * 비교 대상은 내보내기와 같은 조회·계산(`loadMemberYearData` + `buildMemberYearStatus`)이다.
 * 표에 값이 있는 달(1~4월)만 본다.
 *
 * 실행:
 *   TS_NODE_COMPILER_OPTIONS='{"module":"commonjs"}' npx ts-node src/scripts/compareExportWithImage.ts
 *   … --detail   어긋난 칸을 회원별로 함께 출력
 *
 * 마이그레이션(20261010120000_payment_record_kind_and_member_position)을 적용한 뒤에 돌린다.
 */
import fs from 'fs';
import path from 'path';

import { Prisma, PrismaClient } from '@prisma/client';

import {
  buildMemberYearStatus,
  type CellStatus,
} from '../lib/membership-fee/memberYearStatus';
import { loadMemberYearData } from '../lib/membership-fee/memberYearStatusLoader';

const prisma = new PrismaClient();
const detail = process.argv.includes('--detail');

const CLUB_ID = 1;
const COMPARE_MONTHS = [1, 2, 3, 4];
const IMAGE_DATA_PATH = path.resolve(
  __dirname,
  '../../docs/회비 정산/data/2026-05-25-이미지-데이터.json'
);

type ImageStatus = '완납' | '미납' | '면제' | '병가' | '해당없음';

interface ImageData {
  _meta: { year: number };
  members: { name: string; months: Record<string, ImageStatus> }[];
}

const LABEL: Record<CellStatus, ImageStatus | '빈칸'> = {
  PAID: '완납',
  UNPAID: '미납',
  EXEMPT: '면제',
  LEAVE: '병가',
  NONE: '해당없음',
  FUTURE: '빈칸',
};

function readImageData(): ImageData {
  if (!fs.existsSync(IMAGE_DATA_PATH)) {
    throw new Error(
      `재무 표 데이터가 없습니다: ${IMAGE_DATA_PATH}\n실명이 들어 있어 저장소에는 두지 않습니다. 로컬에 파일을 둔 뒤 다시 실행하세요.`
    );
  }
  const raw = fs.readFileSync(IMAGE_DATA_PATH, 'utf-8');
  // 파일에 `// prettier-ignore` 주석이 들어 있다 (JSON 표준 밖)
  return JSON.parse(raw.replace(/^\s*\/\/[^\n]*\n/gm, '')) as ImageData;
}

const percent = (part: number, whole: number) =>
  whole === 0 ? '-' : `${((part / whole) * 100).toFixed(1)}%`;

async function main() {
  const image = readImageData();
  const year = image._meta.year;

  const { members } = await loadMemberYearData(prisma, CLUB_ID, year);
  const rows = members.map((member) => buildMemberYearStatus(year, member));

  const rowsByName = new Map<string, typeof rows>();
  for (const row of rows) {
    rowsByName.set(row.name, [...(rowsByName.get(row.name) ?? []), row]);
  }

  let matchedMembers = 0;
  let sameNameSkipped = 0;
  let cells = 0;
  let agreed = 0;
  const notInDb: string[] = [];
  /** "표 → 내보내기" 꼴의 어긋남별 건수 */
  const mismatchCounts = new Map<string, number>();
  const mismatchLines: string[] = [];

  for (const imageMember of image.members) {
    const candidates = rowsByName.get(imageMember.name) ?? [];
    if (candidates.length === 0) {
      notInDb.push(imageMember.name);
      continue;
    }
    if (candidates.length > 1) {
      // 동명이인은 어느 줄인지 알 수 없어 뺀다
      sameNameSkipped += 1;
      continue;
    }
    matchedMembers += 1;
    const [row] = candidates;
    for (const month of COMPARE_MONTHS) {
      const expected = imageMember.months[String(month)];
      if (!expected) continue;
      const actual = LABEL[row.cells[month]];
      cells += 1;
      if (expected === actual) {
        agreed += 1;
        continue;
      }
      // 어긋난 까닭을 가리려고 그 달의 납부 유무를 함께 적는다
      const paid = row.payments[month] ? 'DB에 납부 있음' : 'DB에 납부 없음';
      const key = `${expected} → ${actual} (${paid})`;
      mismatchCounts.set(key, (mismatchCounts.get(key) ?? 0) + 1);
      mismatchLines.push(`  ${imageMember.name} ${month}월: ${key}`);
    }
  }

  const imageNames = new Set(image.members.map((member) => member.name));
  const onlyInExport = rows.filter(
    (row) =>
      !imageNames.has(row.name) &&
      (row.obligationMonths.length > 0 || row.leaveMonths.length > 0)
  );

  console.log(`${year}년 1~${COMPARE_MONTHS.length}월, 재무의 표 ↔ 내보내기`);
  console.log(
    `표의 회원 ${image.members.length}명 중 ${matchedMembers}명 대조 (DB에 없음 ${notInDb.length}명, 동명이인 제외 ${sameNameSkipped}명)`
  );
  console.log(`내보내기에만 있는 회원: ${onlyInExport.length}명`);
  console.log(
    `칸 일치: ${agreed}/${cells} (${percent(agreed, cells)}), 어긋남 ${cells - agreed}칸`
  );
  for (const [key, count] of [...mismatchCounts].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${key}: ${count}칸`);
  }

  if (detail) {
    console.log('\n어긋난 칸:');
    for (const line of mismatchLines) console.log(line);
    console.log(`\n표에만 있는 회원: ${notInDb.join(', ') || '없음'}`);
    console.log(
      `내보내기에만 있는 회원: ${onlyInExport.map((row) => row.name).join(', ') || '없음'}`
    );
  }
}

main()
  .catch((error) => {
    const columnMissing =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2022';
    if (columnMissing) {
      console.error(
        '회원의 직책 컬럼이 아직 없습니다 — 마이그레이션을 적용한 뒤에 돌려주세요.'
      );
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
