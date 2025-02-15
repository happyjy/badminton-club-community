import { Metadata } from 'next';

// 메타데이터 설정
export const metadata: Metadata = {
  // title: '모임모아 - 취미 모임 커뮤니티',
  // description:
  //   '관심사가 비슷한 사람들과 함께하는 취미 모임을 찾고 만들어보세요. 다양한 취미 모임과 동호회를 한곳에서 만나보세요.',
  // openGraph: {
  //   title: '모임모아 - 취미 모임 커뮤니티',
  //   description:
  //     '관심사가 비슷한 사람들과 함께하는 취미 모임을 찾고 만들어보세요. 다양한 취미 모임과 동호회를 한곳에서 만나보세요.',
  //   type: 'website',
  //   locale: 'ko_KR',
  //   images: [
  //     {
  //       url: '/icon/badmintonShuttleCock.svg', // 대표 이미지 경로를 지정해주세요
  //       width: 1200,
  //       height: 630,
  //       alt: '모임모아 대표 이미지',
  //     },
  //   ],
  // },
  // twitter: {
  //   card: 'summary_large_image',
  //   title: '모임모아 - 취미 모임 커뮤니티',
  //   description:
  //     '관심사가 비슷한 사람들과 함께하는 취미 모임을 찾고 만들어보세요. 다양한 취미 모임과 동호회를 한곳에서 만나보세요.',
  //   images: ['/icon/badmintonShuttleCock.svg'], // 대표 이미지 경로를 지정해주세요
  // },
  robots: {
    index: true,
    follow: true,
  },
  // viewport: {
  //   width: 'device-width',
  //   initialScale: 1,
  // },
  // icons: {
  //   icon: '/favicon.ico',
  // },
  // Next가 <meta name="google-site-verification content="값" /> 을 만들어줍니다.
  verification: {
    google: 'bTqFYbHTfK1wiMqYL3xztX9fmwDIPlxSNi5',
    other: {
      'naver-site-verification': '29734e86be07123ad88ad167d74e1e97e519a3c0',
    },
  },
};
