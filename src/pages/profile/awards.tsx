import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/templates/Layout';
import AwardRecordSection from '@/components/organisms/award/AwardRecordSection';
import { useAuth } from '@/hooks/useAuth';

function MyAwardsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <AwardRecordSection />
      </div>
    </Layout>
  );
}

export default MyAwardsPage;

