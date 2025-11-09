-- AlterTable
ALTER TABLE "user_award_records" ADD COLUMN "clubId" INTEGER;

-- CreateIndex
CREATE INDEX "user_award_records_clubId_idx" ON "user_award_records"("clubId");

-- AddForeignKey
ALTER TABLE "user_award_records" ADD CONSTRAINT "user_award_records_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

