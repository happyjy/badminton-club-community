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

# 4. diff 출력을 검토해 마이그레이션 파일로 직접 작성
#    prisma/migrations/YYYYMMDDHHMMSS_설명/migration.sql
#    내 변경과 무관한 SQL이 섞여 있으면 드리프트가 다시 생긴 것이다. 그대로 쓰지 말고 멈춰서 알린다.

# 5. --- 여기서 멈추고 사용자에게 확인받는다 ---
#    적용할 SQL과 영향 범위를 설명하고, 백업 상태를 확인하도록 안내한다.

# 6. 승인 후 적용
npx prisma db execute --file prisma/migrations/.../migration.sql --schema prisma/schema.prisma
npx prisma migrate resolve --applied <마이그레이션_이름>
npx prisma generate
```

### 알려진 문제

- **스키마 드리프트는 2026-10-10 기준 없다.**
  - 스키마를 바꾸지 않은 상태에서 `migrate diff`를 돌리면 빈 결과(`-- This is an empty migration.`)가 나온다.
  - 내 변경과 무관한 SQL이 나오면 DB나 스키마가 한쪽만 바뀐 것이다. 마이그레이션에 섞지 말고 멈춰서 사용자에게 알린다.
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

## 테스트 파일 위치 규칙

- 테스트 파일(`*.test.ts(x)`, `*.dom.test.ts(x)`)은 **`src/pages/` 안에 두지 않는다.** `__tests__` 폴더로 감싸도 안 됨 — Next.js Pages Router는 `src/pages/` 하위의 모든 `.ts`/`.tsx`를 페이지로 간주하고, 테스트 파일은 `export default`가 없어 `npm run build` 시 `Property 'default' is missing` 타입 에러로 빌드가 실패한다.
- 페이지 컴포넌트의 테스트는 `src/__tests__/pages/...`에, 그 외 도메인 테스트는 `src/lib/__tests__/`, `src/hooks/__tests__/` 등 해당 모듈 옆에 둔다.
- 테스트 파일에서 페이지 컴포넌트를 import할 때는 반드시 `@/` 절대 경로 사용 (파일 이동에도 깨지지 않게).
- 사고 기록: `src/pages/clubs/[id]/membership-fee/__tests__/` 안에 둔 `.dom.test.tsx` 3개가 배포 직전 빌드를 깨트렸음. `src/__tests__/pages/clubs/[id]/membership-fee/`로 이동해 해결.

## 작업별 룰 (`.claude/rules/`)

특정 패턴의 작업을 시작할 때 해당 룰 문서를 먼저 읽고 따른다.

- API 핸들러 추가/수정 시 → `.claude/rules/api-handler-conventions.md` (Prisma 싱글톤, 핸들러 보일러플레이트, 응답 포맷)
- 일괄 처리 API 추가 시 → `.claude/rules/bulk-action-pattern.md`

## 문서화 정책

기능 변경은 **화면 단위와 기능 단위로 분리**해 문서화한다.

### 폴더 구조

화면 단위로 폴더를 만들고, 그 안에 두 종류의 문서를 둔다.

```
docs/<도메인>/<화면 단위>/
├── README.md                   # 폴더 진입점 (인덱스)
├── <화면>-컨텍스트.md           # 화면 단위 — 지금의 모습
└── 기능/                        # 기능 단위 — 변경 이력
    └── <기능명>.md
```

### 두 문서의 역할

| 구분          | 역할                                                           | 갱신 정책                                  |
| ------------- | -------------------------------------------------------------- | ------------------------------------------ |
| 화면 컨텍스트 | 지금의 아키텍처·기능 매핑·플로우                               | 변경마다 갱신                              |
| 기능 단위     | 왜·어떻게 그 결정이 됐는지 (배경/Why → 작업/What → 의사결정)   | 시점 기록, 후속 변경은 새 문서로 누적      |

### 새 기능 도입 시 워크플로

1. `기능/` 하위에 새 기능 문서 작성 (배경 → 도입한 개선 → 설계 의사결정 → 백엔드/프런트 처리 → UX 디테일 → 검증 → 변경 이력)
2. 화면 컨텍스트 문서의 관련 섹션 갱신 + 새 기능 문서로 가는 링크 추가
3. 기능 문서 간 상호 참조는 `./파일.md` 상대 경로 사용

### 예시

`docs/회비 정산/입금 내역 처리/` 참고.
