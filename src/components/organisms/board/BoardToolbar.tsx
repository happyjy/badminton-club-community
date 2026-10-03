import { Button } from '@/components/atoms/buttons/Button';
import { Select } from '@/components/atoms/inputs/Select';

import { PostSortOption } from '@/types/board.types';

interface BoardToolbarProps {
  sort: PostSortOption;
  onChangeSort: (sort: PostSortOption) => void;
  /** 글을 쓸 수 있는 회원인가 */
  canWrite: boolean;
  /** 카테고리를 관리할 수 있는 운영진인가 */
  canManageCategories: boolean;
  onClickWrite: () => void;
  onClickManageCategories: () => void;
}

/**
 * 게시판 목록 위의 도구줄: 정렬 + 카테고리 관리 + 작성하기.
 * 휴대폰에서 한 줄에 다 들어가지 않으면 버튼 묶음이 다음 줄로 내려간다.
 */
export function BoardToolbar({
  sort,
  onChangeSort,
  canWrite,
  canManageCategories,
  onClickWrite,
  onClickManageCategories,
}: BoardToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface p-3">
      <Select
        placeholder={null}
        fullWidth={false}
        aria-label="정렬"
        value={sort}
        onChange={(e) => onChangeSort(e.target.value as PostSortOption)}
      >
        <option value="latest">최신순</option>
        <option value="views">조회수순</option>
        <option value="likes">좋아요순</option>
        <option value="comments">댓글순</option>
      </Select>

      {(canWrite || canManageCategories) && (
        <div className="ml-auto flex items-center gap-1">
          {canManageCategories && (
            <Button
              type="button"
              variant="plain"
              className="shrink-0 px-3"
              onClick={onClickManageCategories}
            >
              카테고리 관리
            </Button>
          )}
          {canWrite && (
            <Button type="button" className="shrink-0" onClick={onClickWrite}>
              작성하기
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default BoardToolbar;
