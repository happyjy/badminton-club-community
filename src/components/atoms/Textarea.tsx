import React from 'react';

import TextareaAutosize, {
  TextareaAutosizeProps,
} from 'react-textarea-autosize';

import {
  inputClassName,
  withMinBodyText,
} from '@/components/atoms/inputs/Input';

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
      className={cn(
        inputClassName,
        'h-auto min-h-11 w-full resize-none py-2.5 text-body',
        withMinBodyText(className)
      )}
      minRows={minRows}
      maxRows={maxRows}
      {...props}
    />
  );
}

export default Textarea;
