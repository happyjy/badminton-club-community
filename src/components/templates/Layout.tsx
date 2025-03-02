import { LayoutProps } from '@/types/components.types';
import MainNavigation from '../organisms/navigation/mainNavigation/MainNavigation';
import { ClubNavigation } from '../organisms/navigation/clubNavigation/ClubNavigation';
import { useRouter } from 'next/router';

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const { id: clubId } = router.query;

  // /clubs/[id] 형식의 경로인지 확인
  const isClubRoute = router.pathname.startsWith('/clubs/[id]');

  return (
    <>
      <MainNavigation />
      <main className="max-w-4xl mx-auto px-4">
        {isClubRoute && clubId && (
          <div className="py-3">
            <ClubNavigation clubId={clubId as string} />
            <div className="mt-6">{children}</div>
          </div>
        )}
        {!isClubRoute && children}
      </main>
    </>
  );
}
