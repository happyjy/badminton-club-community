-- 회비 면제에 그 해 안의 기간(시작·종료 월)을 둔다. 기존 행은 1~12월(1년 전체)로 채워진다.
-- AlterTable
ALTER TABLE "FeeExemption" ADD COLUMN     "endMonth" INTEGER NOT NULL DEFAULT 12,
ADD COLUMN     "startMonth" INTEGER NOT NULL DEFAULT 1;
