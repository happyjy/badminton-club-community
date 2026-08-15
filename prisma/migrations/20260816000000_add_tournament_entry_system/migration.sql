-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "EntryPaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELED');

-- CreateEnum
CREATE TYPE "EntryEventStatus" AS ENUM ('ACTIVE', 'CANCELED');

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "clubId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "hostName" TEXT,
    "description" TEXT,
    "tournamentDate" TEXT,
    "location" TEXT,
    "applyStartAt" TIMESTAMP(3),
    "applyDeadline" TIMESTAMP(3) NOT NULL,
    "status" "TournamentStatus" NOT NULL DEFAULT 'DRAFT',
    "useTeamName" BOOLEAN NOT NULL DEFAULT false,
    "tshirtSizes" TEXT[],
    "bankAccount" TEXT,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentEventOption" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT '',
    "playerCount" INTEGER NOT NULL,
    "fee" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TournamentEventOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentEntry" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "clubMemberId" INTEGER NOT NULL,
    "depositorName" TEXT NOT NULL,
    "teamName" TEXT,
    "paymentStatus" "EntryPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "totalFee" INTEGER NOT NULL DEFAULT 0,
    "privacyAgreedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntryPlayer" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "birthDate" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "tshirtSize" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EntryPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntryEvent" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "eventOptionId" TEXT NOT NULL,
    "fee" INTEGER NOT NULL,
    "status" "EntryEventStatus" NOT NULL DEFAULT 'ACTIVE',
    "canceledAt" TIMESTAMP(3),

    CONSTRAINT "EntryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntryEventPlayer" (
    "id" TEXT NOT NULL,
    "entryEventId" TEXT NOT NULL,
    "entryPlayerId" TEXT NOT NULL,

    CONSTRAINT "EntryEventPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tournament_clubId_idx" ON "Tournament"("clubId");

-- CreateIndex
CREATE INDEX "Tournament_clubId_status_idx" ON "Tournament"("clubId", "status");

-- CreateIndex
CREATE INDEX "TournamentEventOption_tournamentId_idx" ON "TournamentEventOption"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentEventOption_tournamentId_eventType_ageGroup_level_key" ON "TournamentEventOption"("tournamentId", "eventType", "ageGroup", "level");

-- CreateIndex
CREATE INDEX "TournamentEntry_tournamentId_idx" ON "TournamentEntry"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentEntry_userId_idx" ON "TournamentEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentEntry_tournamentId_userId_key" ON "TournamentEntry"("tournamentId", "userId");

-- CreateIndex
CREATE INDEX "EntryPlayer_entryId_idx" ON "EntryPlayer"("entryId");

-- CreateIndex
CREATE INDEX "EntryEvent_entryId_idx" ON "EntryEvent"("entryId");

-- CreateIndex
CREATE INDEX "EntryEvent_eventOptionId_idx" ON "EntryEvent"("eventOptionId");

-- CreateIndex
CREATE INDEX "EntryEventPlayer_entryEventId_idx" ON "EntryEventPlayer"("entryEventId");

-- CreateIndex
CREATE UNIQUE INDEX "EntryEventPlayer_entryEventId_entryPlayerId_key" ON "EntryEventPlayer"("entryEventId", "entryPlayerId");

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentEventOption" ADD CONSTRAINT "TournamentEventOption_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentEntry" ADD CONSTRAINT "TournamentEntry_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentEntry" ADD CONSTRAINT "TournamentEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentEntry" ADD CONSTRAINT "TournamentEntry_clubMemberId_fkey" FOREIGN KEY ("clubMemberId") REFERENCES "ClubMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryPlayer" ADD CONSTRAINT "EntryPlayer_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "TournamentEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryEvent" ADD CONSTRAINT "EntryEvent_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "TournamentEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryEvent" ADD CONSTRAINT "EntryEvent_eventOptionId_fkey" FOREIGN KEY ("eventOptionId") REFERENCES "TournamentEventOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryEventPlayer" ADD CONSTRAINT "EntryEventPlayer_entryEventId_fkey" FOREIGN KEY ("entryEventId") REFERENCES "EntryEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryEventPlayer" ADD CONSTRAINT "EntryEventPlayer_entryPlayerId_fkey" FOREIGN KEY ("entryPlayerId") REFERENCES "EntryPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

