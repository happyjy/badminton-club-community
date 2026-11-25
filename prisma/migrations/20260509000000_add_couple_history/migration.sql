-- CreateTable
CREATE TABLE "CoupleHistory" (
    "id" SERIAL NOT NULL,
    "clubId" INTEGER NOT NULL,
    "clubMemberId" INTEGER NOT NULL,
    "partnerClubMemberId" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoupleHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoupleHistory_clubId_idx" ON "CoupleHistory"("clubId");

-- CreateIndex
CREATE INDEX "CoupleHistory_clubMemberId_startedAt_endedAt_idx" ON "CoupleHistory"("clubMemberId", "startedAt", "endedAt");

-- CreateIndex
CREATE INDEX "CoupleHistory_partnerClubMemberId_idx" ON "CoupleHistory"("partnerClubMemberId");

-- AddForeignKey
ALTER TABLE "CoupleHistory" ADD CONSTRAINT "CoupleHistory_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoupleHistory" ADD CONSTRAINT "CoupleHistory_clubMemberId_fkey" FOREIGN KEY ("clubMemberId") REFERENCES "ClubMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoupleHistory" ADD CONSTRAINT "CoupleHistory_partnerClubMemberId_fkey" FOREIGN KEY ("partnerClubMemberId") REFERENCES "ClubMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
