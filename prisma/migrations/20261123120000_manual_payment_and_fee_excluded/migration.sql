-- 회비 대상 아님(코치 등)을 회원에 두고, 통장 입금 없이 직접 추가한 납부를 위해 납부의 입금 칸을 비울 수 있게 하고 사유 칸을 더한다.
-- 기존 회원은 feeExcluded=false, 기존 납부는 입금이 그대로 걸려 있고 manualReason은 NULL이다.
-- AlterTable
ALTER TABLE "ClubMember" ADD COLUMN     "feeExcluded" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "MembershipPayment" ADD COLUMN     "manualReason" TEXT,
ALTER COLUMN "paymentRecordId" DROP NOT NULL;

