-- isLocalMember를 isClubMember로 일원화한다.
-- '영등포구 회원'과 '당산클럽 소속'을 각각 가리키던 두 이름이 사실상
-- 같은 의미로 쓰이고 있어 혼용을 없앤다.
--
-- 값(외부 선수 표시)을 반드시 옮긴 뒤에 옛 컬럼을 지운다.
-- migrate diff는 DROP만 출력하므로 그대로 쓰면 데이터가 사라진다.

-- 1) 새 컬럼 생성
--    운영 DB에는 이미 만들어져 있어 IF NOT EXISTS로 재실행에 안전하게 둔다.
--    (해당 컬럼을 추가하던 마이그레이션은 기능 revert 때 함께 지워졌다)
ALTER TABLE "EntryPlayer"
  ADD COLUMN IF NOT EXISTS "isClubMember" BOOLEAN NOT NULL DEFAULT true;

-- 2) 값 이동
UPDATE "EntryPlayer" SET "isClubMember" = "isLocalMember";

-- 3) 옛 컬럼 제거
ALTER TABLE "EntryPlayer" DROP COLUMN "isLocalMember";
