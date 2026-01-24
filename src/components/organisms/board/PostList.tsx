import { PostWithRelations } from '@/types/board.types';

import PostCard from './PostCard';

interface PostListProps {
  posts: PostWithRelations[];
}

function PostList({ posts }: PostListProps) {
  if (posts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">게시글이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

export default PostList;
