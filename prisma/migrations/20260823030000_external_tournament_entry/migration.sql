-- 외부(비로그인) 대회 신청 지원
-- 로그인 없이도 대회에 신청할 수 있는 공개 링크를 열기 위한 스키마 변경.
-- 외부 신청서는 계정이 없으므로 TournamentEntry.userId/clubMemberId를
-- nullable로 완화하고, 조회 키(contactName/contactPhone)와 구분 플래그(isExternal)를
-- 추가한다. 기존 회원 전용 신청 동작은 기본값으로 그대로 유지된다.

-- 비회원 추가금 부과 단위
CREATE TYPE "SurchargeUnit" AS ENUM ('PER_PLAYER', 'PER_TEAM');

-- AlterTable
-- 대회: 외부 신청 허용 여부와 추가금 부과 단위
ALTER TABLE "Tournament"
  ADD COLUMN "allowExternalEntry" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "surchargeUnit" "SurchargeUnit" NOT NULL DEFAULT 'PER_PLAYER';

-- AlterTable
-- 신청서: 외부 신청은 계정이 없으므로 userId/clubMemberId를 nullable로 완화한다.
-- 기존 행은 모두 값이 채워져 있으므로 데이터 손실이 없다.
ALTER TABLE "TournamentEntry"
  ALTER COLUMN "userId" DROP NOT NULL,
  ALTER COLUMN "clubMemberId" DROP NOT NULL;

-- AlterTable
-- 신청서: 외부 신청 구분과 조회 키
ALTER TABLE "TournamentEntry"
  ADD COLUMN "isExternal" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "contactName" TEXT,
  ADD COLUMN "contactPhone" TEXT;

-- CreateIndex
-- 외부 신청의 중복 제출 차단.
-- 회원 신청서(isExternal=false)는 이 인덱스에 걸리지 않는다.
CREATE UNIQUE INDEX "TournamentEntry_external_unique"
  ON "TournamentEntry" ("tournamentId", "contactPhone", "contactName")
  WHERE "isExternal" = true;

-- CreateIndex
-- 관리자 목록에서 외부 신청만 추려 볼 때 쓴다
CREATE INDEX "TournamentEntry_tournamentId_isExternal_idx"
  ON "TournamentEntry" ("tournamentId", "isExternal");
