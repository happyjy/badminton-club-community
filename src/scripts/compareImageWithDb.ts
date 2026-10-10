/* eslint-disable no-console */
/**
 * 일회성 비교 스크립트
 *
 * 재무가 정리한 엑셀 캡처(이미지 3장)에서 추출한 회원별 월별 상태와,
 * DB에서 dashboard.ts와 동일한 로직으로 산출한 회원별 월별 상태를 비교한다.
 *
 * 입력·출력 파일(`docs/회비 정산/data/`)에는 회원 실명과 납부 상태가 들어 있어
 * 저장소에 두지 않는다(`.gitignore`). 로컬에 직접 둔다.
 *
 * 실행:
 *   pnpm exec tsx src/scripts/compareImageWithDb.ts
 *
 * 출력: 이름 매칭 결과 + 월별 상태 차이 표 (1~4월만)
 */
import fs from 'fs';
import path from 'path';

import { FeePeriod, PrismaClient } from '@prisma/client';

import {
  getFirstObligationMonth,
  getObligationMonths,
  isMonthObligated,
  type LeavePeriod,
} from '../lib/membership-fee/feeObligation';

const prisma = new PrismaClient();

const CLUB_ID = 1;
const YEAR = 2026;
const COMPARE_MONTHS = [1, 2, 3, 4] as const;

type Status = '완납' | '미납' | '면제' | '병가' | '해당없음';

interface ImageMember {
  no: number | string;
  name: string;
  비고?: string;
  months: Record<string, Status>;
}

interface ImageData {
  _meta: unknown;
  members: ImageMember[];
}

interface DbMemberStatus {
  id: number;
  name: string;
  type: 'exempt' | 'couple' | 'regular';
  months: Record<number, Status>;
  obligationMonths: number[];
  leaveMonths: number[];
  feeObligationStartMonth: string | null;
  isLeft: boolean;
  leftAtFormatted: string | null;
}

async function loadDbStatus(): Promise<DbMemberStatus[]> {
  // dashboard.ts의 핵심 로직을 그대로 옮김 (feeTypes, monthlyStats 등 비교 무관 부분은 생략)

  const clubMembers = await prisma.clubMember.findMany({
    where: {
      clubId: CLUB_ID,
      OR: [
        { status: 'APPROVED' },
        {
          status: 'LEFT',
          leftAt: { gte: new Date(YEAR, 0, 1) },
          feeObligationStartAt: { lt: new Date(YEAR + 1, 0, 1) },
        },
        {
          status: 'LEFT',
          leftAt: null,
          feeObligationStartAt: { lt: new Date(YEAR + 1, 0, 1) },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      status: true,
      feeObligationStartAt: true,
      leftAt: true,
    },
    orderBy: { name: 'asc' },
  });

  const coupleGroups = await prisma.coupleGroup.findMany({
    where: { clubId: CLUB_ID },
    include: { members: true },
  });
  const memberToCoupleGroup = new Map<number, number>();
  coupleGroups.forEach((g) => {
    g.members.forEach((m) => memberToCoupleGroup.set(m.clubMemberId, g.id));
  });

  const exemptions = await prisma.feeExemption.findMany({
    where: { clubMember: { clubId: CLUB_ID }, year: YEAR },
    select: { clubMemberId: true },
  });
  const exemptedMemberIds = new Set(exemptions.map((e) => e.clubMemberId));

  const memberIds = clubMembers.map((m) => m.id);
  const leavesRaw = await prisma.memberLeave.findMany({
    where: {
      clubMemberId: { in: memberIds },
      startYear: { lte: YEAR },
      OR: [{ endYear: null }, { endYear: { gte: YEAR } }],
    },
  });
  const leaveMap = new Map<number, LeavePeriod[]>();
  leavesRaw.forEach((row) => {
    const list = leaveMap.get(row.clubMemberId) ?? [];
    list.push({
      startYear: row.startYear,
      startMonth: row.startMonth,
      endYear: row.endYear ?? undefined,
      endMonth: row.endMonth ?? undefined,
    });
    leaveMap.set(row.clubMemberId, list);
  });

  const payments = await prisma.membershipPayment.findMany({
    where: { clubMember: { clubId: CLUB_ID }, year: YEAR },
    select: { clubMemberId: true, month: true, amount: true },
  });
  const paymentsByMember = new Map<number, Set<number>>();
  payments.forEach((p) => {
    if (!paymentsByMember.has(p.clubMemberId)) {
      paymentsByMember.set(p.clubMemberId, new Set());
    }
    paymentsByMember.get(p.clubMemberId)!.add(p.month);
  });

  const results: DbMemberStatus[] = clubMembers.map((member) => {
    const isExempt = exemptedMemberIds.has(member.id);
    const coupleGroupId = memberToCoupleGroup.get(member.id);
    const memberType: DbMemberStatus['type'] = isExempt
      ? 'exempt'
      : coupleGroupId
        ? 'couple'
        : 'regular';
    const isLeft = member.status === 'LEFT';
    const memberLeftAt = isLeft ? member.leftAt : null;
    const leavePeriodsMember = leaveMap.get(member.id) ?? [];

    const obligationMonthsMember = getObligationMonths(
      YEAR,
      member.feeObligationStartAt,
      leavePeriodsMember,
      memberLeftAt
    );
    const obligationSet = new Set(obligationMonthsMember);
    const paidMonths = paymentsByMember.get(member.id) ?? new Set<number>();

    // dashboard.ts와 동일하게 leaveMonths 계산
    const rawFirst = getFirstObligationMonth(
      YEAR,
      member.feeObligationStartAt,
      []
    );
    const leaveMonthsMember: number[] = [];
    if (rawFirst != null) {
      const lastMonth =
        memberLeftAt && memberLeftAt.getFullYear() === YEAR
          ? memberLeftAt.getMonth() + 1
          : 12;
      for (let m = rawFirst; m <= lastMonth; m++) {
        if (!obligationSet.has(m)) leaveMonthsMember.push(m);
      }
    }
    const leaveMonthsSet = new Set(leaveMonthsMember);

    const months: Record<number, Status> = {};
    for (let m = 1; m <= 12; m++) {
      // 화면 PaymentDashboardTable.tsx의 분기 순서를 그대로 재현:
      // 1) exempt → 면제
      // 2) leaveMonths 포함 → 병가 (휴회)
      // 3) obligationMonths 미포함 → 해당없음
      // 4) 의무인데 미납 → 미납
      // 5) 의무이고 납부 → 완납
      if (memberType === 'exempt') {
        months[m] = '면제';
        continue;
      }
      if (leaveMonthsSet.has(m)) {
        months[m] = '병가';
        continue;
      }
      const obligated = isMonthObligated(
        YEAR,
        m,
        member.feeObligationStartAt,
        leavePeriodsMember,
        memberLeftAt
      );
      if (!obligated) {
        months[m] = '해당없음';
        continue;
      }
      months[m] = paidMonths.has(m) ? '완납' : '미납';
    }

    return {
      id: member.id,
      name: member.name ?? '(이름 없음)',
      type: memberType,
      months,
      obligationMonths: obligationMonthsMember,
      leaveMonths: leaveMonthsMember,
      feeObligationStartMonth: member.feeObligationStartAt
        ? `${member.feeObligationStartAt.getFullYear()}.${String(member.feeObligationStartAt.getMonth() + 1).padStart(2, '0')}`
        : null,
      isLeft,
      leftAtFormatted:
        isLeft && member.leftAt
          ? `${member.leftAt.getFullYear()}.${String(member.leftAt.getMonth() + 1).padStart(2, '0')}`
          : null,
    };
  });

  // feeTypes는 비교에 직접 안 쓰지만, 면제/부부 단가 존재 여부만 한 번 점검
  const feeTypes = await prisma.feeType.findMany({
    where: { clubId: CLUB_ID, isActive: true },
    include: { rates: { where: { year: YEAR } } },
  });
  const regularMonthly = feeTypes
    .find((t) => t.name === '일반')
    ?.rates.find((r) => r.period === FeePeriod.MONTHLY)?.amount;
  const coupleMonthly = feeTypes
    .find((t) => t.name === '부부')
    ?.rates.find((r) => r.period === FeePeriod.MONTHLY)?.amount;
  console.log(
    `[설정] ${YEAR}년 일반=${regularMonthly ?? '없음'}원, 부부=${coupleMonthly ?? '없음'}원\n`
  );

  return results;
}

const DATA_DIR = path.resolve(__dirname, '../../docs/회비 정산/data');
const IMAGE_DATA_PATH = path.join(DATA_DIR, '2026-05-25-이미지-데이터.json');
const DB_DATA_PATH = path.join(DATA_DIR, '2026-05-25-DB-데이터.json');
const REPORT_PATH = path.join(DATA_DIR, '2026-05-25-비교-리포트.json');

/** DB 결과를 이미지 JSON과 같은 형식으로 직렬화 (1~4월만, name 오름차순 → 동률은 id) */
function writeDbDataAsImageFormat(db: DbMemberStatus[]) {
  const sorted = [...db].sort((a, b) => {
    const byName = a.name.localeCompare(b.name, 'ko');
    return byName !== 0 ? byName : a.id - b.id;
  });

  const lines: string[] = [];
  lines.push('{');
  lines.push('  "_meta": {');
  lines.push(`    "year": ${YEAR},`);
  lines.push(`    "asOfDate": "${new Date().toISOString().slice(0, 10)}",`);
  lines.push('    "legend": {');
  lines.push('      "완납": "의무 월이며 MembershipPayment 존재",');
  lines.push('      "미납": "의무 월이지만 MembershipPayment 없음",');
  lines.push('      "면제": "FeeExemption(year) 행 존재",');
  lines.push(
    '      "병가": "의무 시작월~탈퇴월 사이에서 MemberLeave로 가려진 달",'
  );
  lines.push('      "해당없음": "feeObligationStartAt 이전 또는 탈퇴월 이후"');
  lines.push('    },');
  lines.push(
    `    "note": "src/pages/api/clubs/[id]/membership-fee/dashboard.ts와 동일 로직으로 DB에서 산출. 1~${COMPARE_MONTHS.length}월만 포함.",`
  );
  lines.push('    "source": "src/scripts/compareImageWithDb.ts (clubId=1)"');
  lines.push('  },');
  lines.push('  "members": [');

  const rows = sorted.map((m, idx) => {
    const monthsStr = COMPARE_MONTHS.map(
      (mo) => `"${mo}": "${m.months[mo]}"`
    ).join(', ');
    // 비고: 회원 유형(부부/면제) + 의무시작 + 탈퇴 정보 등 메타
    const notes: string[] = [];
    if (m.type === 'couple') notes.push('부부');
    if (m.type === 'exempt') notes.push('면제');
    if (m.feeObligationStartMonth)
      notes.push(`의무시작 ${m.feeObligationStartMonth}`);
    if (m.isLeft && m.leftAtFormatted) notes.push(`탈퇴 ${m.leftAtFormatted}`);
    const 비고 = notes.length > 0 ? `, "비고": "${notes.join(', ')}"` : '';
    const comma = idx === sorted.length - 1 ? '' : ',';
    return `    {"id": ${m.id}, "name": ${JSON.stringify(m.name)}${비고}, "months": {${monthsStr}}}${comma}`;
  });
  lines.push(...rows);

  lines.push('  ]');
  lines.push('}');
  fs.writeFileSync(DB_DATA_PATH, lines.join('\n') + '\n');
  console.log(`DB 데이터(이미지 형식) 저장: ${DB_DATA_PATH}`);
}

function main() {
  const raw = fs.readFileSync(IMAGE_DATA_PATH, 'utf-8');
  // 이미지 데이터 JSON에 들어있는 `// prettier-ignore` 주석 제거 (JSON 표준 외)
  const stripped = raw.replace(/^\s*\/\/[^\n]*\n/gm, '');
  const img: ImageData = JSON.parse(stripped);

  loadDbStatus()
    .then((db) => {
      // DB 결과를 이미지 JSON과 같은 형식으로 별도 저장
      writeDbDataAsImageFormat(db);

      // 이름 기준 매칭 (이미지의 이름은 unique하다고 가정)
      const dbByName = new Map<string, DbMemberStatus>();
      db.forEach((m) => dbByName.set(m.name, m));

      const onlyInImage: string[] = [];
      const onlyInDb: string[] = [];
      const diffs: Array<{
        name: string;
        no: number | string;
        feeStart: string | null;
        diffs: Array<{ month: number; image: Status; db: Status }>;
      }> = [];

      const imageNames = new Set(img.members.map((m) => m.name));

      img.members.forEach((im) => {
        const d = dbByName.get(im.name);
        if (!d) {
          onlyInImage.push(`${im.no} ${im.name}`);
          return;
        }
        const memberDiffs: Array<{ month: number; image: Status; db: Status }> =
          [];
        for (const m of COMPARE_MONTHS) {
          const imgVal = im.months[String(m)];
          const dbVal = d.months[m];
          if (imgVal !== dbVal) {
            memberDiffs.push({ month: m, image: imgVal, db: dbVal });
          }
        }
        if (memberDiffs.length > 0) {
          diffs.push({
            name: im.name,
            no: im.no,
            feeStart: d.feeObligationStartMonth,
            diffs: memberDiffs,
          });
        }
      });

      db.forEach((d) => {
        if (!imageNames.has(d.name)) onlyInDb.push(`${d.id} ${d.name}`);
      });

      // 보고서 출력
      const totalImg = img.members.length;
      const totalDb = db.length;
      const matched = totalImg - onlyInImage.length;
      const sameRows = matched - diffs.length;
      const totalCells = matched * COMPARE_MONTHS.length;
      const diffCells = diffs.reduce((s, d) => s + d.diffs.length, 0);

      console.log('='.repeat(70));
      console.log(`회원별 납부 현황 비교 — ${YEAR}년 (1~4월)`);
      console.log('='.repeat(70));
      console.log(`이미지 회원: ${totalImg}명`);
      console.log(
        `DB 회원: ${totalDb}명 (status=APPROVED 또는 ${YEAR}년 활동 LEFT)`
      );
      console.log(`이름 매칭: ${matched}명`);
      console.log(
        `완전 일치 회원: ${sameRows}명 / 차이 있는 회원: ${diffs.length}명`
      );
      console.log(
        `셀 일치율: ${totalCells - diffCells}/${totalCells} (${((1 - diffCells / totalCells) * 100).toFixed(1)}%)`
      );
      console.log();

      if (onlyInImage.length > 0) {
        console.log(`▼ 이미지에만 있는 회원 (${onlyInImage.length}명)`);
        onlyInImage.forEach((n) => console.log(`  - ${n}`));
        console.log();
      }
      if (onlyInDb.length > 0) {
        console.log(`▼ DB에만 있는 회원 (${onlyInDb.length}명)`);
        onlyInDb.forEach((n) => console.log(`  - ${n}`));
        console.log();
      }

      if (diffs.length > 0) {
        console.log(`▼ 월별 상태가 다른 회원 (${diffs.length}명)`);
        console.log('─'.repeat(70));
        // 행: 회원, 열: 월
        const header = `${'NO'.padEnd(5)}${'이름'.padEnd(10)}${'의무시작'.padEnd(12)}${COMPARE_MONTHS.map((m) => `${m}월(이미지→DB)`.padEnd(22)).join('')}`;
        console.log(header);
        diffs.forEach((row) => {
          const cells = COMPARE_MONTHS.map((m) => {
            const d = row.diffs.find((x) => x.month === m);
            if (!d) return '='.padEnd(22);
            return `${d.image}→${d.db}`.padEnd(22);
          });
          console.log(
            `${String(row.no).padEnd(5)}${row.name.padEnd(10)}${(row.feeStart ?? '-').padEnd(12)}${cells.join('')}`
          );
        });
        console.log();
      } else {
        console.log('✅ 매칭된 회원의 1~4월 셀이 모두 일치합니다.');
      }

      // 결과를 파일로도 저장
      fs.writeFileSync(
        REPORT_PATH,
        JSON.stringify(
          {
            summary: {
              year: YEAR,
              imageMembers: totalImg,
              dbMembers: totalDb,
              matched,
              diffMembers: diffs.length,
              cellAccuracy:
                ((1 - diffCells / Math.max(totalCells, 1)) * 100).toFixed(2) +
                '%',
            },
            onlyInImage,
            onlyInDb,
            diffs,
          },
          null,
          2
        )
      );
      console.log(`상세 결과 저장: ${REPORT_PATH}`);
    })
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => {
      void prisma.$disconnect();
    });
}

// 직접 실행
const isDirect =
  path.resolve(process.argv[1] ?? '') === path.resolve(__filename);
if (isDirect) main();
