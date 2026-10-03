# badminton-club-comm

## 데이터베이스 작업 규칙

**`.env`의 `DATABASE_URL`은 프로덕션 Supabase를 가리킨다.** 로컬 개발 DB가 따로 없다.
회원 445명, 운동 기록 583건, 참가 기록 9,893건 등 실제 운영 데이터가 들어 있다.

### 반드시 지킬 것

1. **DB 상태를 바꾸는 명령은 실행 전에 사용자에게 확인받는다.**
   `.claude/hooks/db-guard.sh`가 자동 차단하지만, 훅은 최후의 방어선이지 면허가 아니다.
   차단당한 뒤 우회로를 찾지 말고 사용자에게 물어본다.

2. **`prisma migrate dev`를 쓰지 않는다.**
   이 레포는 마이그레이션 이력과 실제 DB가 어긋나 있어, `migrate dev`가
   **DB 전체 리셋을 요구한다.** 스키마 변경이 필요하면 아래 순서를 따른다.

3. **변경 전에 항상 영향 범위를 먼저 본다.** 읽기 전용이라 안전하다.
   ```bash
   npx prisma migrate diff \
     --from-schema-datasource prisma/schema.prisma \
     --to-schema-datamodel prisma/schema.prisma --script
   ```

### 스키마를 바꾸는 안전한 순서

```bash
# 1. 도메인별 스키마 파일 수정 (prisma/schema/*.prisma)
#    schema.prisma는 자동 생성 파일이므로 직접 고치지 않는다.

# 2. 통합 스키마 빌드
npm run build:schema

# 3. 무엇이 바뀌는지 확인 (읽기 전용)
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma --script

# 4. 필요한 SQL만 골라 마이그레이션 파일로 직접 작성
#    prisma/migrations/YYYYMMDDHHMMSS_설명/migration.sql
#    diff 출력 전체를 그대로 쓰면 안 된다. 기존 드리프트까지 섞여 있다.

# 5. --- 여기서 멈추고 사용자에게 확인받는다 ---
#    적용할 SQL과 영향 범위를 설명하고, 백업 상태를 확인하도록 안내한다.

# 6. 승인 후 적용
npx prisma db execute --file prisma/migrations/.../migration.sql --schema prisma/schema.prisma
npx prisma migrate resolve --applied <마이그레이션_이름>
npx prisma generate
```

### 알려진 문제

- **스키마 드리프트가 남아 있다.** 스키마에 선언됐지만 DB에 없는 인덱스·FK가 있다
  (`PostCategory`, `PostComment`, `PaymentRecord` 등). `migrate diff`를 돌리면 늘 이것들이
  함께 출력되므로, 마이그레이션 SQL을 만들 때 **필요한 부분만 골라내야 한다.**
- `_prisma_migrations` 테이블은 2026-08-19에 생성됐다. 그전에는 `db push` 위주로 작업했다.

### 사고 기록 (2026-08-19)

프로덕션 DB에 `prisma migrate dev`를 실행해 "DB를 리셋해야 한다"는 응답을 받았다.
비대화형 셸이라 실제 삭제로 이어지지는 않았지만, 확인 프롬프트가 뜨는 환경이었다면
데이터가 사라졌을 수 있다. 이 사고로 `db-guard.sh` 훅과 위 규칙이 생겼다.

## UI 작업 규칙

화면을 만들거나 고치기 전에 **[docs/가이드/디자인-시스템.md](docs/가이드/디자인-시스템.md)를 먼저 읽는다.**
토큰 이름, 부품 목록, 화면 틀의 예시 코드가 있다. 결정의 이유는
`docs/superpowers/specs/2026-10-03-design-system-design.md`에 있다.

### 반드시 지킬 것

1. **색·크기는 토큰만 쓴다.** `bg-blue-500`, `bg-white`, `#hex`, `text-sm`, `shadow-md`를 쓰지 않는다.
   `bg-surface`, `text-secondary`, `text-footnote`, `rounded-md` 같은 역할 이름을 쓴다.
2. **부품을 먼저 찾는다.** 버튼·입력·칩·리스트·시트·표는 `src/components`에 있다.
   원시 `<input>`·`<select>`·`<textarea>`, `confirm()`·`alert()`, 직접 만든 `fixed inset-0` 막을 쓰지 않는다.
   맞는 부품이 없으면 `atoms`/`molecules`에 만든 뒤 쓴다.
3. **고르는 부품을 구분한다.** 폼에 저장되는 값은 `Select`, 정렬·필터처럼 화면을 보는 방식은 `OptionPicker`
   (휴대폰은 아래 시트, PC는 메뉴), 2–4개를 펼쳐 보일 때는 `SegmentedControl`.
4. **화면 틀을 따른다.** 회원용은 `PageHeader` + `ListGroup`, 관리용은 `Toolbar` + `DataTable`(+ 상세 `Sheet`).
   탭바·사이드바·바깥 여백은 `Layout`이 그리므로 화면에서 다시 주지 않는다.
5. **상태 색은 `statusTone.ts`에서만 정한다.** 화면에서 조건문으로 색을 고르지 않고 `StatusChip`에 `domain`·`status`를 넘긴다.
6. **이모지를 아이콘으로 쓰지 않는다.** `lucide-react`를 쓴다.
7. **새 색은 라이트·다크를 함께 정한다.** `globals.css`에 더하고 `darkMode.test.ts`의 대비 검사에 넣는다.

### 확인

- 지킴이 테스트가 위 규칙의 대부분을 검사한다: `npx jest src/__tests__/guards src/__tests__/styles`
- 화면을 바꾸면 휴대폰(390)·PC(1280), 라이트·다크 네 가지로 본다.
  로그인이 필요한 화면은 그리는 부분을 `…View` 부품으로 떼어 `/dev/screen-preview`나
  `/dev/admin-preview`에 가짜 데이터로 올려서 본다(운영에서는 404).
- 사용자가 보는 문구는 요청 없이 바꾸지 않는다. 바꿨으면 보고한다.

## 커밋

커밋 메시지에 `Co-Authored-By: Claude ...` 트레일러를 넣지 않는다.
PR 본문에도 `🤖 Generated with [Claude Code]` 푸터를 넣지 않는다.
