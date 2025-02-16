import { GetServerSideProps } from 'next';

// 서버 사이드 렌더링 함수
// getServerSideProps를 사용하여 서버 사이드에서 세션을 확인합니다.
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/clubs',
      permanent: true,
    },
  };
};

export default function Home() {
  return null;
}
