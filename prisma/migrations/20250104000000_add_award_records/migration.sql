-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('SINGLES', 'MD', 'WD', 'XD');

-- CreateEnum
CREATE TYPE "Grade" AS ENUM ('A', 'B', 'C', 'D', 'E', 'F');

-- CreateTable
CREATE TABLE "user_award_records" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tournamentName" VARCHAR(50) NOT NULL,
    "eventType" "EventType" NOT NULL,
    "grade" "Grade" NOT NULL,
    "eventDate" DATE NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "note" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_award_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_award_records_userId_idx" ON "user_award_records"("userId");

-- CreateIndex
CREATE INDEX "user_award_records_eventDate_idx" ON "user_award_records"("eventDate");

-- CreateIndex
CREATE UNIQUE INDEX "unique_award_record" ON "user_award_records"("userId", "eventDate", "eventType", "grade");

-- AddForeignKey
ALTER TABLE "user_award_records" ADD CONSTRAINT "user_award_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

