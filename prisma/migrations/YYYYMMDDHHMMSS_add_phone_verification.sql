-- 전화번호 인증 기능 추가 마이그레이션

-- User 테이블에 전화번호 필드 추가
ALTER TABLE "User" ADD COLUMN "phoneNumber" VARCHAR(20) NULL;
ALTER TABLE "User" ADD COLUMN "phoneVerifiedAt" TIMESTAMP NULL;

-- User 테이블 전화번호 인덱스 추가
CREATE INDEX "idx_user_phone" ON "User"("phoneNumber");
CREATE INDEX "idx_user_phone_verified" ON "User"("phoneNumber", "phoneVerifiedAt");

-- PhoneVerification 테이블 생성
CREATE TABLE "PhoneVerification" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "clubId" INTEGER NOT NULL,
  "phoneNumber" VARCHAR(20) NOT NULL,
  "verificationCode" VARCHAR(6) NOT NULL,
  "isVerified" BOOLEAN DEFAULT FALSE,
  "expiresAt" TIMESTAMP NOT NULL,
  "verifiedAt" TIMESTAMP NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),

  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE,

  UNIQUE("userId", "clubId", "phoneNumber")
);

-- PhoneVerification 테이블 인덱스 추가
CREATE INDEX "idx_phone_verification_user_club" ON "PhoneVerification"("userId", "clubId");
CREATE INDEX "idx_phone_verification_expires" ON "PhoneVerification"("expiresAt"); 