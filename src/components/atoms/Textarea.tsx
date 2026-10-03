import React from 'react';

import TextareaAutosize, {
  TextareaAutosizeProps,
} from 'react-textarea-autosize';

import { inputClassName } from '@/components/atoms/inputs/Input';

import { cn } from '@/lib/utils';

interface TextareaProps extends Omit<TextareaAutosizeProps, 'style'> {
  className?: string;
}

export function Textarea({
  className,
  minRows = 1,
  maxRows = 10,
  ...props
}: TextareaProps) {
  return (
    <TextareaAutosize
      // 여러 줄이라 높이를 고정하지 않고 최소 높이만 준다.
      className={cn(
        inputClassName,
        'h-auto min-h-11 w-full resize-none py-2.5',
        className,
        'text-body'
      )}
      minRows={minRows}
      maxRows={maxRows}
      {...props}
    />
  );
}

export default Textarea;
