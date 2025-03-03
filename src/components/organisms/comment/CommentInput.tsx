import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
// import { Button } from '@/components/atoms/buttons/Button';

interface CommentInputProps {
  onSubmit: (content: string) => void;
  placeholder?: string;
}

export function CommentInput({
  onSubmit,
  placeholder = '댓글을 입력하세요',
}: CommentInputProps) {
  const [content, setContent] = useState('');
  const [charCount, setCharCount] = useState(0);
  const maxLength = 1000;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    if (newContent.length <= maxLength) {
      setContent(newContent);
      setCharCount(newContent.length);
    }
  };

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content);
      setContent('');
      setCharCount(0);
    }
  };

  return (
    <div className="space-y-2">
      <Textarea
        value={content}
        onChange={handleChange}
        placeholder={placeholder}
        className="min-h-[100px] resize-none"
      />
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">
          {charCount}/{maxLength}자
        </span>
        <Button
          onClick={handleSubmit}
          disabled={!content.trim() || content.length > maxLength}
        >
          댓글 작성
        </Button>
      </div>
    </div>
  );
}

export default CommentInput;
