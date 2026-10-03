import { cn } from '@/lib/utils';

interface SkeletonProps {
  /** 크기를 준다. 예: "h-5 w-32" */
  className?: string;
}

/** 불러오는 동안 글자·사진 자리에 두는 깜빡이는 회색 막대. */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn('block animate-pulse rounded-sm bg-fill', className)}
    />
  );
}

export default Skeleton;
