-- 구조 변경: 종목×연령×급수 조합 행 → 종목/연령/급수 축 분리
-- 기존 대회 데이터는 폐기 가능하다고 확인받아 먼저 삭제한다.
-- (EntryEvent.eventTypeId가 NOT NULL이라 기존 행이 있으면 추가할 수 없음)
DELETE FROM "Tournament";

-- DropForeignKey
ALTER TABLE "EntryEvent" DROP CONSTRAINT "EntryEvent_eventOptionId_fkey";

-- DropForeignKey
ALTER TABLE "TournamentEventOption" DROP CONSTRAINT "TournamentEventOption_tournamentId_fkey";

-- DropIndex
DROP INDEX "EntryEvent_eventOptionId_idx";

-- AlterTable
ALTER TABLE "EntryEvent" DROP COLUMN "eventOptionId",
ADD COLUMN     "ageGroup" TEXT NOT NULL,
ADD COLUMN     "eventTypeId" TEXT NOT NULL,
ADD COLUMN     "level" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "ageGroups" TEXT[],
ADD COLUMN     "levels" TEXT[];

-- DropTable
DROP TABLE "TournamentEventOption";

-- CreateTable
CREATE TABLE "TournamentEventType" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "playerCount" INTEGER NOT NULL,
    "fee" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TournamentEventType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TournamentEventType_tournamentId_idx" ON "TournamentEventType"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentEventType_tournamentId_name_key" ON "TournamentEventType"("tournamentId", "name");

-- CreateIndex
CREATE INDEX "EntryEvent_eventTypeId_idx" ON "EntryEvent"("eventTypeId");

-- AddForeignKey
ALTER TABLE "TournamentEventType" ADD CONSTRAINT "TournamentEventType_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryEvent" ADD CONSTRAINT "EntryEvent_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "TournamentEventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

