import { useState } from 'react';

import Button from '@/components/atoms/buttons/Button';
import Textarea from '@/components/atoms/Textarea';
import { formatDate } from '@/lib/utils';

interface CommentItemProps {
  id: string;
  content: string;
  author: {
    name: string;
  };
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
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="font-medium">{author.name}</span>
          <span className="text-sm text-gray-500 ml-2">
            {formatDate(createdAt)}
          </span>
        </div>
        {isEditable && (
          <div className="flex items-center">
            {!isEditing ? (
              <>
                <Button variant="ghost" size="sm" onClick={handleEdit}>
                  수정
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDelete}>
                  삭제
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  취소
                </Button>
                <Button
                  variant="default"
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
          <Textarea
            value={editContent}
            onChange={handleChange}
            className="min-h-[100px] resize-none"
          />
          <div className="text-right">
            <span className="text-sm text-gray-500">
              {charCount}/{maxLength}자
            </span>
          </div>
        </div>
      ) : (
        <p className="text-gray-700 whitespace-pre-wrap">{content}</p>
      )}
    </div>
  );
}

export default CommentItem;
