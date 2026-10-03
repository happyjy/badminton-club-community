import { MessageSquare } from 'lucide-react';

import { EmptyState } from '@/components/molecules/EmptyState';

import { PostWithRelations } from '@/types/board.types';

import PostCard from './PostCard';

interface PostListProps {
  posts: PostWithRelations[];
}

function PostList({ posts }: PostListProps) {
  if (posts.length === 0) {
    return (
      <div className="rounded-md bg-surface">
        <EmptyState
          icon={MessageSquare}
          title="아직 게시글이 없어요"
          description="첫 글을 남겨 보세요"
        />
      </div>
    );
  }

  return (
    <div className="divide-y-[0.5px] divide-separator overflow-hidden rounded-md bg-surface">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

export default PostList;
