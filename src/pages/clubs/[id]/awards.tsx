import { useEffect } from 'react';

import { useRouter } from 'next/router';

import AwardRecordSection from '@/components/organisms/award/AwardRecordSection';
import Layout from '@/components/templates/Layout';

import { useAuth } from '@/hooks/useAuth';

function ClubAwardsPage() {
  console.log('ClubAwardsPage');
  const router = useRouter();
  const { id } = router.query;
  const { user, isLoading } = useAuth();

  useEffect(() => {
    console.log(`🌸 ~ ClubAwardsPage ~ isLoading:`, isLoading);
    console.log(`🌸 ~ ClubAwardsPage ~ user:`, user);
    if (!isLoading && !user) {
      // router.push('/');
    }
  }, [user, isLoading, router]);

  // if (isLoading) {
  //   return (
  //     <Layout>
  //       <div className="flex justify-center items-center min-h-screen">
  //         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
  //       </div>
  //     </Layout>
  //   );
  // }

  // if (!user || !id || Array.isArray(id)) {
  //   return null;
  // }

  const parsedClubId = parseInt(id, 10);

  if (isNaN(parsedClubId)) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-red-500">
            유효하지 않은 클럽 ID입니다.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <AwardRecordSection clubId={parsedClubId} />
    </div>
  );
}

export default ClubAwardsPage;
