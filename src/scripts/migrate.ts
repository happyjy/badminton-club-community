// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('마이그레이션 시작...');

    // 1. 기존 GuestPost 데이터 가져오기
    const existingPosts = await prisma.guestPost.findMany();
    console.log(`${existingPosts.length}개의 게시물 발견`);

    // 2. GuestPost_copy에 데이터 복사 (기본값과 함께)
    for (const post of existingPosts) {
      await prisma.guestPost_copy.create({
        data: {
          id: post.id,
          clubId: post.clubId,
          userId: post.userId,
          name: post.name,
          message: post.message,
          status: post.status,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          phoneNumber: post.phoneNumber || '',
          // 새 필드에 대한 기본값 설정
          birthDate: '1990-01-01', // 예시 기본값
          localTournamentLevel: '없음', // 예시 기본값
          nationalTournamentLevel: '없음', // 예시 기본값
          lessonPeriod: '0개월', // 예시 기본값
          playingPeriod: '0개월', // 예시 기본값
        },
      });
    }
    console.log('임시 테이블에 데이터 복사 완료');

    console.log('마이그레이션 성공!');
  } catch (error) {
    console.error('마이그레이션 실패:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
