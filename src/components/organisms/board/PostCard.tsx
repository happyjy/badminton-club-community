import { useRouter } from 'next/router';

import { formatDateSimple } from '@/lib/utils';
import { PostWithRelations } from '@/types/board.types';

interface PostCardProps {
  post: PostWithRelations;
}

function PostCard({ post }: PostCardProps) {
  const router = useRouter();
  const { id: clubId } = router.query;

  const onClickPost = () => {
    router.push(`/clubs/${clubId}/board/${post.id}`);
  };

  return (
    <div
      className="p-4 sm:p-6 border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white cursor-pointer"
      onClick={onClickPost}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {post.isPinned && (
              <span className="text-blue-500" title="고정 게시글">
                📌
              </span>
            )}
            <h2 className="font-semibold text-lg sm:text-xl text-gray-900 line-clamp-2">
              {post.title}
            </h2>
          </div>
          <p className="text-gray-600 text-sm sm:text-base line-clamp-2 mb-3">
            {post.content}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500">
        <span className="px-2 py-1 bg-gray-100 rounded text-gray-700">
          {post.category.name}
        </span>
        <span>{post.author.name || '알 수 없음'}</span>
        <span>{formatDateSimple(post.createdAt)}</span>
        <div className="flex items-center gap-3 sm:gap-4 ml-auto">
          <span>👁️ {post.viewCount}</span>
          <span>❤️ {post.likeCount}</span>
          <span>💬 {post._count?.comments || 0}</span>
        </div>
      </div>
    </div>
  );
}

export default PostCard;
