-- ClubMember: status='APPROVED' 인 회원들의 feeObligationStartAt을 createdAt의 날짜(년월일)로 설정
-- Supabase SQL Editor에서 실행

UPDATE "ClubMember"
SET "feeObligationStartAt" = ("createdAt")::date
WHERE status = 'APPROVED';
