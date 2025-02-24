import { useRouter } from 'next/router';
import { withAuth } from '@/lib/withAuth';

function BoardPage() {
  const router = useRouter();
  const { id: clubId } = router.query;

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">게시판</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">게시판 기능이 곧 제공될 예정입니다.</p>
      </div>
    </>
  );
}

export default withAuth(BoardPage);
