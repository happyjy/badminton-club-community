import { useState } from 'react';

import { Button } from '@/components/atoms/buttons/Button';
import { Textarea } from '@/components/atoms/Textarea';

import { formatDate } from '@/lib/utils';

interface CommentItemProps {
  id: string;
  content: string;
  author: {
    name: string;
  } | null;
  createdAt: string;
  isEditable?: boolean;
  onUpdate?: (id: string, content: string) => void;
  onDelete?: (id: string) => void;
}

export function CommentItem({
  id,
  content,
  author,
  createdAt,
  isEditable = false,
  onUpdate,
  onDelete,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [charCount, setCharCount] = useState(content.length);
  const maxLength = 1000;

  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(content);
    setCharCount(content.length);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditContent(content);
    setCharCount(content.length);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    if (newContent.length <= maxLength) {
      setEditContent(newContent);
      setCharCount(newContent.length);
    }
  };

  const handleUpdate = () => {
    if (editContent.trim() && onUpdate) {
      onUpdate(id, editContent);
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(id);
    }
  };

  return (
    <div className="rounded-md bg-bg p-3">
      <div className="mb-1 flex items-start justify-between gap-2">
        <div>
          <span className="text-callout font-semibold text-primary">
            {author?.name || '알 수 없음'}
          </span>
          <span className="ml-2 text-footnote tabular-nums text-secondary">
            {formatDate(createdAt)}
          </span>
        </div>
        {isEditable && (
          <div className="flex items-center">
            {!isEditing ? (
              <>
                <Button variant="plain" size="sm" onClick={handleEdit}>
                  수정
                </Button>
                <Button variant="plain" size="sm" onClick={handleDelete}>
                  삭제
                </Button>
              </>
            ) : (
              <>
                <Button variant="plain" size="sm" onClick={handleCancel}>
                  취소
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleUpdate}
                  disabled={
                    !editContent.trim() || editContent.length > maxLength
                  }
                >
                  완료
                </Button>
              </>
            )}
          </div>
        )}
      </div>
      {isEditing ? (
        <div className="space-y-2">
          <Textarea value={editContent} onChange={handleChange} minRows={3} />
          <div className="text-right">
            <span className="text-footnote tabular-nums text-secondary">
              {charCount}/{maxLength}자
            </span>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap break-words text-body text-primary">
          {content}
        </p>
      )}
    </div>
  );
}

export default CommentItem;
