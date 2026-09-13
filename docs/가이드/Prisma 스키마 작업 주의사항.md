# Prisma 스키마 작업 주의사항

## 📁 스키마 파일 구조

프로젝트에서는 Prisma 스키마를 여러 개의 작은 파일로 분리하여 관리하고 있습니다.

**파일 위치:**

- `prisma/schema/` 디렉토리 내에 도메인별로 스키마 파일을 분리
- 예: `workout.prisma`, `user.prisma`, `club.prisma` 등

## 🔧 스키마 빌드 프로세스

1. **개별 스키마 파일 작성**: `prisma/schema/` 디렉토리에서 각 도메인별 스키마 파일을 수정
2. **스키마 통합**: `prisma/build-schema.ts` 스크립트가 모든 개별 스키마 파일을 하나로 통합
3. **최종 스키마 생성**: 통합된 스키마가 `prisma/schema.prisma` 파일에 생성됨

## ⚠️ 작업 시 주의사항

## 1. 직접 수정 금지

- `prisma/schema.prisma` 파일을 **직접 수정하지 마세요**
- 이 파일은 자동 생성되는 파일이므로 수동 수정 시 덮어써집니다

## 2. 올바른 수정 방법

- 수정이 필요한 스키마는 해당 도메인 파일에서 작업
- 예: 운동 관련 스키마 수정 시 → `prisma/schema/workout.prisma` 파일 수정

## 3. 스키마 적용 순서

```bash
# 1. 개별 스키마 파일 수정
# 2. 스키마 통합 명령어 실행
npm run build:schema

# 3. 데이터베이스 마이그레이션
npx prisma migrate dev --name "스키마_변경_내용"
```

## 🚀 스키마 빌드 명령어

```json
{
  "scripts": {
    "build:schema": "cross-env TS_NODE_COMPILER_OPTIONS='{\"module\":\"commonjs\"}' ts-node prisma/build-schema.ts"
  }
}
```

**사용법:**

```bash
npm run build:schema
```

## 📋 작업 체크리스트

- [ ] 올바른 개별 스키마 파일에서 수정 작업
- [ ] `npm run build:schema` 명령어로 스키마 통합
- [ ] 통합된 스키마 확인 (`prisma/schema.prisma`)
- [ ] 필요시 마이그레이션 실행
- [ ] 애플리케이션 재시작

## 🔍 문제 해결

**스키마가 반영되지 않는 경우:**

1. `npm run build:schema` 실행 여부 확인
2. `prisma/schema.prisma` 파일에 변경사항이 반영되었는지 확인
3. 개발 서버 재시작
4. 캐시 클리어: `npx prisma generate`

**주의:** 항상 개별 스키마 파일을 수정하고 빌드 명령어를 실행한 후 마이그레이션을 진행하세요!

## 스키마를 정의한 후에는 다음 명령어로 데이터베이스를 동기화

```tsx
npx prisma generate
npx prisma db push
```
