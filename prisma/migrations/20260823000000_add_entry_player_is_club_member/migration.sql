-- 선수의 우리 클럽 소속 여부 (명단 파악용, 금액과 무관)
-- 기본값이 있어 기존 선수 32건은 모두 true(내부)로 채워진다.

-- AlterTable
ALTER TABLE "EntryPlayer" ADD COLUMN     "isClubMember" BOOLEAN NOT NULL DEFAULT true;
