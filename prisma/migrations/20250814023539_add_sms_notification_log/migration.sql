-- CreateEnum
CREATE TYPE "HelperType" AS ENUM ('NET', 'FLOOR', 'SHUTTLE', 'KEY', 'MOP');

-- CreateEnum
CREATE TYPE "GuestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "GuestPostType" AS ENUM ('GUEST_REQUEST', 'INQUIRY_REQUEST', 'JOIN_INQUIRY_REQUEST');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('STATUS_UPDATE', 'COMMENT_ADDED');

-- AlterTable
ALTER TABLE "ClubMember" ADD COLUMN     "birthDate" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "lessonPeriod" TEXT,
ADD COLUMN     "localTournamentLevel" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "nationalTournamentLevel" TEXT,
ADD COLUMN     "phoneNumber" TEXT NOT NULL DEFAULT '010-0000-0000',
ADD COLUMN     "playingPeriod" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "phoneVerifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "WorkoutParticipant" ADD COLUMN     "clubMemberId" INTEGER;

-- CreateTable
CREATE TABLE "WorkoutHelperStatus" (
    "id" SERIAL NOT NULL,
    "workoutId" INTEGER NOT NULL,
    "clubMemberId" INTEGER NOT NULL,
    "helperType" "HelperType" NOT NULL,
    "helped" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutHelperStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestPost" (
    "id" TEXT NOT NULL,
    "clubId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "postType" "GuestPostType" NOT NULL DEFAULT 'GUEST_REQUEST',
    "name" TEXT NOT NULL,
    "birthDate" TEXT NOT NULL DEFAULT '',
    "phoneNumber" TEXT NOT NULL,
    "gender" TEXT NOT NULL DEFAULT '',
    "localTournamentLevel" TEXT NOT NULL DEFAULT '',
    "nationalTournamentLevel" TEXT NOT NULL DEFAULT '',
    "lessonPeriod" TEXT NOT NULL DEFAULT '',
    "playingPeriod" TEXT NOT NULL DEFAULT '',
    "status" "GuestStatus" NOT NULL DEFAULT 'PENDING',
    "intendToJoin" BOOLEAN NOT NULL DEFAULT false,
    "visitDate" TEXT NOT NULL DEFAULT '',
    "message" TEXT NOT NULL DEFAULT '',
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" INTEGER,
    "clubMemberId" INTEGER,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestPost_copy" (
    "id" TEXT NOT NULL,
    "clubId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "GuestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "phoneNumber" TEXT NOT NULL DEFAULT '',
    "gender" TEXT NOT NULL DEFAULT '',
    "birthDate" TEXT NOT NULL DEFAULT '',
    "localTournamentLevel" TEXT NOT NULL DEFAULT '',
    "nationalTournamentLevel" TEXT NOT NULL DEFAULT '',
    "lessonPeriod" TEXT NOT NULL DEFAULT '',
    "playingPeriod" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "GuestPost_copy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubCustomSettings" (
    "id" SERIAL NOT NULL,
    "clubId" INTEGER NOT NULL,
    "clubOperatingTime" TEXT,
    "clubLocation" TEXT,
    "clubDescription" TEXT,
    "inquiryDescription" TEXT,
    "guestDescription" TEXT,
    "emailRecipients" TEXT[],
    "smsRecipients" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubCustomSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhoneVerification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "clubId" INTEGER NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "verificationCode" VARCHAR(6) NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsNotificationLog" (
    "id" SERIAL NOT NULL,
    "guestPostId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "notificationType" "NotificationType" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsNotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutHelperStatus_workoutId_clubMemberId_helperType_key" ON "WorkoutHelperStatus"("workoutId", "clubMemberId", "helperType");

-- CreateIndex
CREATE INDEX "GuestPost_clubId_idx" ON "GuestPost"("clubId");

-- CreateIndex
CREATE INDEX "GuestPost_userId_idx" ON "GuestPost"("userId");

-- CreateIndex
CREATE INDEX "GuestPost_createdBy_idx" ON "GuestPost"("createdBy");

-- CreateIndex
CREATE INDEX "GuestComment_postId_idx" ON "GuestComment"("postId");

-- CreateIndex
CREATE INDEX "GuestComment_userId_idx" ON "GuestComment"("userId");

-- CreateIndex
CREATE INDEX "GuestComment_clubMemberId_idx" ON "GuestComment"("clubMemberId");

-- CreateIndex
CREATE INDEX "GuestComment_parentId_idx" ON "GuestComment"("parentId");

-- CreateIndex
CREATE INDEX "GuestPost_copy_clubId_idx" ON "GuestPost_copy"("clubId");

-- CreateIndex
CREATE INDEX "GuestPost_copy_userId_idx" ON "GuestPost_copy"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubCustomSettings_clubId_key" ON "ClubCustomSettings"("clubId");

-- CreateIndex
CREATE INDEX "ClubCustomSettings_clubId_idx" ON "ClubCustomSettings"("clubId");

-- CreateIndex
CREATE INDEX "PhoneVerification_userId_clubId_idx" ON "PhoneVerification"("userId", "clubId");

-- CreateIndex
CREATE INDEX "PhoneVerification_expiresAt_idx" ON "PhoneVerification"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PhoneVerification_userId_clubId_phoneNumber_key" ON "PhoneVerification"("userId", "clubId", "phoneNumber");

-- CreateIndex
CREATE INDEX "SmsNotificationLog_guestPostId_idx" ON "SmsNotificationLog"("guestPostId");

-- CreateIndex
CREATE INDEX "SmsNotificationLog_userId_idx" ON "SmsNotificationLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SmsNotificationLog_guestPostId_userId_notificationType_key" ON "SmsNotificationLog"("guestPostId", "userId", "notificationType");

-- AddForeignKey
ALTER TABLE "WorkoutParticipant" ADD CONSTRAINT "WorkoutParticipant_clubMemberId_fkey" FOREIGN KEY ("clubMemberId") REFERENCES "ClubMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutHelperStatus" ADD CONSTRAINT "WorkoutHelperStatus_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutHelperStatus" ADD CONSTRAINT "WorkoutHelperStatus_clubMemberId_fkey" FOREIGN KEY ("clubMemberId") REFERENCES "ClubMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutHelperStatus" ADD CONSTRAINT "WorkoutHelperStatus_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "ClubMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestPost" ADD CONSTRAINT "GuestPost_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestPost" ADD CONSTRAINT "GuestPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestPost" ADD CONSTRAINT "GuestPost_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "ClubMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestComment" ADD CONSTRAINT "GuestComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestComment" ADD CONSTRAINT "GuestComment_clubMemberId_fkey" FOREIGN KEY ("clubMemberId") REFERENCES "ClubMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestComment" ADD CONSTRAINT "GuestComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "GuestPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestComment" ADD CONSTRAINT "GuestComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "GuestComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubCustomSettings" ADD CONSTRAINT "ClubCustomSettings_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneVerification" ADD CONSTRAINT "PhoneVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneVerification" ADD CONSTRAINT "PhoneVerification_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsNotificationLog" ADD CONSTRAINT "SmsNotificationLog_guestPostId_fkey" FOREIGN KEY ("guestPostId") REFERENCES "GuestPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsNotificationLog" ADD CONSTRAINT "SmsNotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
