import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Next.js API Routes는 서버리스 함수처럼 동작하므로
// 싱글톤 패턴으로 PrismaClient를 재사용합니다.
// $disconnect()를 호출하지 않아도 됩니다:
// - Prisma는 내부적으로 커넥션 풀을 관리합니다
// - 쿼리 완료 후 커넥션은 자동으로 풀로 반환됩니다
// - Next.js 프로세스 종료 시 자동으로 정리됩니다
export const prisma: PrismaClient = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  // 개발 환경에서 HMR로 인한 커넥션 누수 방지
  global.prisma = prisma;
}
