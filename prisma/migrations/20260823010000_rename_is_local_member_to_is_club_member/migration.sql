-- isLocalMember를 isClubMember로 일원화한다.
-- 두 컬럼이 사실상 같은 의미로 쓰이고 있어 혼용을 없앤다.
--
-- isClubMember 컬럼은 이미 존재하며 전부 기본값 true 상태다.
-- 실제 값은 isLocalMember에만 들어있으므로(외부 선수 7건),
-- 반드시 값을 옮긴 뒤에 옛 컬럼을 지운다.
-- migrate diff는 DROP만 출력하므로 그대로 쓰면 데이터가 사라진다.

-- 1) 값 이동
UPDATE "EntryPlayer" SET "isClubMember" = "isLocalMember";

-- 2) 옛 컬럼 제거
ALTER TABLE "EntryPlayer" DROP COLUMN "isLocalMember";
