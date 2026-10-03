import Link from 'next/link';
import { useRouter } from 'next/router';

import { Eye, Heart, type LucideIcon, MessageCircle, Pin } from 'lucide-react';

import { StatusChip } from '@/components/atoms/StatusChip';

import { formatDateCompact } from '@/lib/utils';
import { PostWithRelations } from '@/types/board.types';

interface PostCardProps {
  post: PostWithRelations;
}

function Count({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <span
      aria-label={`${label} ${value}`}
      className="flex items-center gap-1 tabular-nums"
    >
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {value}
    </span>
  );
}

/** 게시판 목록의 한 줄. 줄 전체가 글 상세로 가는 링크다. */
function PostCard({ post }: PostCardProps) {
  const router = useRouter();
  const { id: clubId } = router.query;

  return (
    <Link
      href={`/clubs/${clubId}/board/${post.id}`}
      className="block px-4 py-3 transition-colors duration-150 active:bg-fill"
    >
      <div className="flex items-start gap-1.5">
        {post.isPinned && (
          <Pin
            aria-label="고정 게시글"
            className="mt-1 h-4 w-4 shrink-0 text-secondary"
          />
        )}
        <h2 className="line-clamp-2 min-w-0 break-words text-headline text-primary">
          {post.title}
        </h2>
      </div>
      <p className="mt-0.5 line-clamp-2 break-words text-callout text-secondary">
        {post.content}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-footnote text-secondary">
        <StatusChip tone="neutral">{post.category.name}</StatusChip>
        <span>
          {post.author.name || '알 수 없음'} ·{' '}
          {formatDateCompact(post.createdAt)}
        </span>
        <span className="ml-auto flex items-center gap-3">
          <Count icon={Eye} label="조회" value={post.viewCount} />
          <Count icon={Heart} label="좋아요" value={post.likeCount} />
          <Count
            icon={MessageCircle}
            label="댓글"
            value={post._count?.comments || 0}
          />
        </span>
      </div>
    </Link>
  );
}

export default PostCard;
