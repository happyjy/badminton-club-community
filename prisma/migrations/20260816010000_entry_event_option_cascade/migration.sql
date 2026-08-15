-- DropForeignKey
ALTER TABLE "EntryEvent" DROP CONSTRAINT "EntryEvent_eventOptionId_fkey";

-- AddForeignKey
ALTER TABLE "EntryEvent" ADD CONSTRAINT "EntryEvent_eventOptionId_fkey" FOREIGN KEY ("eventOptionId") REFERENCES "TournamentEventOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

