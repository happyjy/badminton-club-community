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

## 커밋

커밋 메시지에 `Co-Authored-By: Claude ...` 트레일러를 넣지 않는다.
PR 본문에도 `🤖 Generated with [Claude Code]` 푸터를 넣지 않는다.
