-- ClubCustomSettings: 주차 설정 4개
ALTER TABLE "ClubCustomSettings" ADD COLUMN "parkingEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClubCustomSettings" ADD COLUMN "parkingWeekdayCapacity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ClubCustomSettings" ADD COLUMN "parkingWeekendCapacity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ClubCustomSettings" ADD COLUMN "parkingSmsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Workout: 그날 주차 대수
ALTER TABLE "Workout" ADD COLUMN "parkingCapacity" INTEGER;

-- ParkingRequest 신규 테이블
CREATE TABLE "ParkingRequest" (
    "id" SERIAL NOT NULL,
    "workoutId" INTEGER NOT NULL,
    "clubMemberId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "position" INTEGER NOT NULL,
    "promotedSmsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ParkingRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ParkingRequest_workoutId_clubMemberId_key" ON "ParkingRequest"("workoutId", "clubMemberId");
CREATE INDEX "ParkingRequest_workoutId_position_idx" ON "ParkingRequest"("workoutId", "position");

ALTER TABLE "ParkingRequest" ADD CONSTRAINT "ParkingRequest_workoutId_fkey"
  FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParkingRequest" ADD CONSTRAINT "ParkingRequest_clubMemberId_fkey"
  FOREIGN KEY ("clubMemberId") REFERENCES "ClubMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
