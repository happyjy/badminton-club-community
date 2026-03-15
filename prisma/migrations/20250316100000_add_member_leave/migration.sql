-- CreateTable
CREATE TABLE "MemberLeave" (
    "id" SERIAL NOT NULL,
    "clubMemberId" INTEGER NOT NULL,
    "startYear" INTEGER NOT NULL,
    "startMonth" INTEGER NOT NULL,
    "endYear" INTEGER,
    "endMonth" INTEGER,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberLeave_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberLeave_clubMemberId_idx" ON "MemberLeave"("clubMemberId");

-- CreateIndex
CREATE INDEX "MemberLeave_clubMemberId_startYear_startMonth_idx" ON "MemberLeave"("clubMemberId", "startYear", "startMonth");

-- AddForeignKey
ALTER TABLE "MemberLeave" ADD CONSTRAINT "MemberLeave_clubMemberId_fkey" FOREIGN KEY ("clubMemberId") REFERENCES "ClubMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
