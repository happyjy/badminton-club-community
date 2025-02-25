// import { useRouter } from 'next/router';
import { withAuth } from '@/lib/withAuth';

function PhotosPage() {
  // const router = useRouter();
  // const { id: clubId } = router.query;

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">사진첩</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">사진첩 기능이 곧 제공될 예정입니다.</p>
      </div>
    </>
  );
}

export default withAuth(PhotosPage);
