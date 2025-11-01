# Supabase + Prisma 커넥션 풀 설정 가이드

## 📌 개요

이 프로젝트는 Supabase PostgreSQL과 Prisma를 사용합니다.
Supabase는 PgBouncer를 통한 커넥션 풀링을 제공하며, 적절한 설정이 필요합니다.

## 🔧 환경 변수 설정

### .env.local 파일 생성

```bash
# ===================================
# Supabase Database 설정
# ===================================

# 1. API 요청용 - Transaction Mode (Pooler)
# Supabase Dashboard → Settings → Database → Connection string → Transaction
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5&pool_timeout=20&connect_timeout=10"

# 2. 마이그레이션용 - Session Mode (Direct)
# Supabase Dashboard → Settings → Database → Connection string → Session
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres"

# ===================================
# Supabase Client 설정
# ===================================
NEXT_PUBLIC_SUPABASE_URL="https://[project-ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# ===================================
# 기타 환경 변수
# ===================================
JWT_SECRET="your-jwt-secret"
```

## 📊 커넥션 풀 파라미터 설명

### 필수 파라미터

| 파라미터         | 설명                             | 값              |
| ---------------- | -------------------------------- | --------------- |
| `pgbouncer=true` | Supabase Pooler 호환 모드 활성화 | **반드시 true** |

### 선택적 파라미터

| 파라미터           | 설명                               | 기본값 | 개발 환경 | 프로덕션 (서버리스) |
| ------------------ | ---------------------------------- | ------ | --------- | ------------------- |
| `connection_limit` | Prisma 클라이언트당 최대 커넥션 수 | 동적   | 5-10      | 1-3                 |
| `pool_timeout`     | 커넥션 대기 시간(초)               | 10     | 20        | 30                  |
| `connect_timeout`  | DB 연결 타임아웃(초)               | 5      | 10        | 10                  |

## 🚨 Supabase 커넥션 제한

### 플랜별 최대 동시 커넥션

- **Free tier**: 60개
- **Pro tier**: 200개
- **Team tier**: 400개
- **Enterprise**: 커스텀

### 주의사항

1. **여러 Prisma 인스턴스 사용 시**:

   - 각 인스턴스가 `connection_limit`만큼 커넥션 사용
   - 예: 10개 API 인스턴스 × 5 connection_limit = 50개 커넥션

2. **무료 플랜 권장 설정**:

   ```bash
   # connection_limit을 낮게 설정
   DATABASE_URL="...?pgbouncer=true&connection_limit=2"
   ```

3. **PgBouncer 모드 필수**:
   - Supabase Pooler는 PgBouncer Transaction 모드 사용
   - `pgbouncer=true` 없으면 일부 기능 오작동 가능

## 🔍 커넥션 풀 모니터링

### Supabase Dashboard에서 확인

1. **Dashboard → Database → Database Settings**
2. **Current connections** 확인
3. 제한치에 가까우면 `connection_limit` 감소 필요

### Prisma 로그로 확인

```typescript
// src/lib/prisma.ts
export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'], // 개발 환경에서만 활성화
});
```

## 🎯 환경별 권장 설정

### 개발 환경

```bash
DATABASE_URL="postgresql://...?pgbouncer=true&connection_limit=5&pool_timeout=20"
```

- 로컬 개발 시 인스턴스가 1개이므로 connection_limit 5-10 적절

### 프로덕션 - Vercel (서버리스)

```bash
DATABASE_URL="postgresql://...?pgbouncer=true&connection_limit=1&pool_timeout=30"
```

- 서버리스 함수는 각각 독립적으로 Prisma 인스턴스 생성
- 동시 요청 많으면 함수 인스턴스 많아짐 → connection_limit 1-2로 낮게 설정

### 프로덕션 - 전통적인 서버 (EC2, Docker)

```bash
DATABASE_URL="postgresql://...?pgbouncer=true&connection_limit=10&pool_timeout=20"
```

- 서버 인스턴스가 적고 오래 유지되므로 connection_limit 높게 설정 가능

## ✅ 설정 확인 방법

### 1. Prisma Studio로 연결 테스트

```bash
npx prisma studio
```

- 정상 연결되면 브라우저에서 데이터 확인 가능

### 2. 마이그레이션 테스트

```bash
# DIRECT_URL 사용 확인
npx prisma migrate dev --name test
```

### 3. API 요청 테스트

```typescript
// test.ts
import { prisma } from '@/lib/prisma';

async function test() {
  const users = await prisma.user.findMany();
  console.log('Users:', users.length);
}

test();
```

## 🐛 트러블슈팅

### 문제 1: "Can't reach database server"

**원인**: DIRECT_URL이 DATABASE_URL에 설정됨

**해결**:

```bash
# ❌ 잘못된 설정
DATABASE_URL="postgresql://...supabase.co:5432/postgres"

# ✅ 올바른 설정
DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true"
```

### 문제 2: "prepared statement already exists"

**원인**: `pgbouncer=true` 누락

**해결**:

```bash
DATABASE_URL="postgresql://...?pgbouncer=true"
```

### 문제 3: "Too many connections"

**원인**: connection_limit이 너무 높음

**해결**:

- Supabase Dashboard에서 현재 커넥션 수 확인
- `connection_limit`을 2-3으로 감소
- 플랜 업그레이드 고려

### 문제 4: 마이그레이션 실패

**원인**: DIRECT_URL이 설정되지 않음

**해결**:

```bash
# .env에 추가
DIRECT_URL="postgresql://...supabase.co:5432/postgres"
```

## 📚 참고 자료

- [Prisma Connection Pool](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/connection-management)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [PgBouncer with Prisma](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management/configure-pg-bouncer)

## 🔄 마이그레이션 시 주의사항

Prisma migrate는 자동으로 `DIRECT_URL`을 사용합니다:

```bash
# prisma/schema.prisma에 설정 필요
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")      # Pooler 사용
  directUrl = env("DIRECT_URL")        # Direct connection 사용
}
```

- **DATABASE_URL**: 일반 쿼리용 (Pooler)
- **DIRECT_URL**: 마이그레이션용 (Direct)

두 URL 모두 설정해야 마이그레이션이 정상 동작합니다.
