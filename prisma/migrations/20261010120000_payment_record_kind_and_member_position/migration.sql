-- 입금 내역: 거래 분류·분할·월 힌트·검토 표시와 사유·메모
-- 회원: 직책·정렬 순서
-- 납부 내역: 같은 달 두 번째 납부(부족분 충당)를 허용하도록 unique 인덱스를 일반 인덱스로 교체
--
-- 컬럼 추가와 인덱스 교체만 한다. 기존 행의 값은 바뀌지 않는다(새 컬럼은 기본값/NULL).
-- `prisma migrate diff`에 함께 나오는 TournamentEntry FK 드리프트는 이 마이그레이션에 넣지 않았다.

-- 전부 적용되거나 전부 적용되지 않게 한 트랜잭션으로 묶는다.
BEGIN;

-- CreateEnum
CREATE TYPE "PaymentRecordKind" AS ENUM ('FEE', 'JOINING_FEE', 'EVENT', 'OTHER', 'INTEREST');

-- CreateEnum
CREATE TYPE "NonFeeKind" AS ENUM ('JOINING_FEE', 'EVENT', 'OTHER', 'OVERPAY');

-- AlterTable
ALTER TABLE "PaymentRecord" ADD COLUMN     "kind" "PaymentRecordKind" NOT NULL DEFAULT 'FEE',
ADD COLUMN     "kindReason" TEXT,
ADD COLUMN     "monthHints" JSONB,
ADD COLUMN     "needsReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nonFeeAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "nonFeeKind" "NonFeeKind",
ADD COLUMN     "note" TEXT,
ADD COLUMN     "reviewReason" TEXT;

-- CreateIndex
CREATE INDEX "PaymentRecord_clubId_kind_idx" ON "PaymentRecord"("clubId", "kind");

-- AlterTable
ALTER TABLE "ClubMember" ADD COLUMN     "position" TEXT,
ADD COLUMN     "positionOrder" INTEGER;

-- DropIndex
-- 이 인덱스가 없으면(이름이 다르면) 아래 CREATE INDEX만 적용된다. 적용 전에 pg_indexes로 이름을 확인한다.
-- unique를 지운 뒤에는 applyPlan(확정 트랜잭션 안의 회원 행 잠금 + 재확인)이 같은 달 중복 납부를 막는다.
DROP INDEX IF EXISTS "MembershipPayment_clubMemberId_year_month_key";

-- CreateIndex
CREATE INDEX "MembershipPayment_clubMemberId_year_month_idx" ON "MembershipPayment"("clubMemberId", "year", "month");

COMMIT;
