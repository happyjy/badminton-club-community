-- 비회원 참가비 추가금 기능
-- 세 컬럼 모두 기본값이 있어 기존 데이터에 영향이 없다.
-- nonMemberSurcharge = 0 이면 기존 대회와 동일하게 동작한다.

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "memberLabel" TEXT,
ADD COLUMN     "nonMemberSurcharge" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "EntryPlayer" ADD COLUMN     "isLocalMember" BOOLEAN NOT NULL DEFAULT true;
