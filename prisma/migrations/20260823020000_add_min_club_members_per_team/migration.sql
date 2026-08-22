-- 팀당 최소 소속 인원 제한
-- 주최측에 본회 소속으로 등록하려면 팀에 소속 회원이 있어야 하므로,
-- 외부 선수만으로 이루어진 팀은 신청을 막는다.
--
-- 기본값 0(제한 없음)이라 기존 대회는 동작이 바뀌지 않는다.

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "minClubMembersPerTeam" INTEGER NOT NULL DEFAULT 0;
