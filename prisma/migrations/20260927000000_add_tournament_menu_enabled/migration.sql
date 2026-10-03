-- 클럽 커스텀 설정에 대회 신청 메뉴 노출 여부를 추가한다.
-- 기존 클럽은 기본값 true로 채워져 지금처럼 메뉴가 보인다.
ALTER TABLE "ClubCustomSettings" ADD COLUMN "tournamentMenuEnabled" BOOLEAN NOT NULL DEFAULT true;
