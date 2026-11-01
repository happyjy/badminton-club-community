/* eslint-disable no-console */
/**
 * 분류가 생기기 전에 건너뛴 입금의 분류를 채운다.
 *
 * 분류(kind) 컬럼이 생기기 전의 레코드는 전부 기본값 '회비'다. 그중 재무가 건너뛴 건
 * (행사·가입비·콕·이자 등)에 업로드와 같은 분류 규칙을 돌려 kind·kindReason을 채운다.
 * 상태(SKIPPED)와 금액은 건드리지 않는다. 두 번 돌려도 결과가 같다.
 *
 * 미리보기 (DB를 바꾸지 않는다):
 *   TS_NODE_COMPILER_OPTIONS='{"module":"commonjs"}' npx ts-node src/scripts/backfillPaymentRecordKind.ts
 * 적용 (미리보기를 확인한 뒤):
 *   TS_NODE_COMPILER_OPTIONS='{"module":"commonjs"}' npx ts-node src/scripts/backfillPaymentRecordKind.ts --apply
 *
 * 마이그레이션(20261010120000_payment_record_kind_and_member_position)을 적용하기 전에는
 * 미리보기만 된다.
 */
import { Prisma, PrismaClient } from '@prisma/client';

import {
  feeRateSettingsFromTypes,
  ratesForYear,
} from '../lib/membership-fee/confirmPlanner';
import { planKindBackfill } from '../lib/membership-fee/kindBackfill';
import { PAYMENT_KIND_LABEL } from '../lib/membership-fee/paymentKind';

import type { FeeRateSettings } from '../lib/membership-fee/transactionClassifier';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
/** 거래일을 한국 날짜(YYYY-MM-DD)로 */
const kstDay = (date: Date) =>
  new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);

const RECORD_SELECT = {
  id: true,
  clubId: true,
  depositorName: true,
  memo: true,
  amount: true,
  transactionDate: true,
} as const;

/** kind 컬럼이 아직 없으면(마이그레이션 전) 건너뛴 건 전부를 본다 */
async function loadSkippedRecords() {
  try {
    const records = await prisma.paymentRecord.findMany({
      where: { status: 'SKIPPED', kind: 'FEE' },
      select: RECORD_SELECT,
      orderBy: { transactionDate: 'asc' },
    });
    return { records, migrated: true };
  } catch (error) {
    const columnMissing =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2022';
    if (!columnMissing) throw error;
    const records = await prisma.paymentRecord.findMany({
      where: { status: 'SKIPPED' },
      select: RECORD_SELECT,
      orderBy: { transactionDate: 'asc' },
    });
    return { records, migrated: false };
  }
}

async function loadRatesByYear(clubId: number) {
  // 업로드(loadPlannerContext)와 같은 조건으로 읽는다
  const feeTypes = await prisma.feeType.findMany({
    where: { clubId, isActive: true },
    select: {
      name: true,
      rates: { select: { year: true, period: true, amount: true } },
    },
  });
  const ratesByYear = new Map<number, FeeRateSettings>();
  const years = new Set(
    feeTypes.flatMap((type) => type.rates.map((rate) => rate.year))
  );
  for (const year of years) {
    const settings = feeRateSettingsFromTypes(feeTypes, year);
    if (settings) ratesByYear.set(year, settings);
  }
  return ratesByYear;
}

function describe(record: {
  transactionDate: Date;
  amount: number;
  depositorName: string;
  memo: string | null;
}) {
  const memo = record.memo ? ` [메모: ${record.memo}]` : '';
  return `${kstDay(record.transactionDate)}  ${String(record.amount).padStart(7)}  ${record.depositorName}${memo}`;
}

async function main() {
  const { records, migrated } = await loadSkippedRecords();
  if (!migrated) {
    console.log(
      '분류 컬럼이 아직 없습니다 (마이그레이션 적용 전) — 미리보기만 합니다.'
    );
    if (apply) {
      throw new Error('마이그레이션을 먼저 적용한 뒤 --apply로 실행하세요.');
    }
  }

  let changed = 0;
  const clubIds = [...new Set(records.map((record) => record.clubId))];
  for (const clubId of clubIds) {
    const ratesByYear = await loadRatesByYear(clubId);
    const ofClub = records.filter((record) => record.clubId === clubId);
    const { changes, withoutRates } = planKindBackfill(
      ofClub,
      (year) => ratesForYear({ ratesByYear }, year)?.rates ?? null
    );

    console.log(
      `\n클럽 ${clubId}: 건너뛴 ${ofClub.length}건 중 ${changes.length}건의 분류를 바꿉니다`
    );
    for (const { record, kind, kindReason } of changes) {
      console.log(
        `  ${describe(record)}  →  ${PAYMENT_KIND_LABEL[kind]} (${kindReason})`
      );
    }

    const touched = new Set([
      ...changes.map((change) => change.record.id),
      ...withoutRates.map((record) => record.id),
    ]);
    const kept = ofClub.filter((record) => !touched.has(record.id));
    console.log(
      `  회비로 남는 건 ${kept.length}건 (필요하면 화면에서 분류를 바꾼다):`
    );
    for (const record of kept) console.log(`  ${describe(record)}`);
    if (withoutRates.length > 0) {
      console.log(
        `  단가 설정이 없어 판정하지 않은 건 ${withoutRates.length}건:`
      );
      for (const record of withoutRates) console.log(`  ${describe(record)}`);
    }

    if (apply) {
      await prisma.$transaction(
        changes.map(({ record, kind, kindReason }) =>
          prisma.paymentRecord.updateMany({
            // 그사이 누가 분류나 상태를 바꿨으면 건드리지 않는다
            where: { id: record.id, status: 'SKIPPED', kind: 'FEE' },
            data: { kind, kindReason },
          })
        )
      );
    }
    changed += changes.length;
  }

  console.log(
    `\n${apply ? '적용' : '미리보기'}: ${changed}/${records.length}건`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
