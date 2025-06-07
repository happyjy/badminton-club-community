import React, { TextareaHTMLAttributes } from 'react';

import TextareaAutosize from 'react-textarea-autosize';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
  maxRows?: number;
}

export function Textarea({
  className = '',
  minRows = 1,
  maxRows = 10,
  ...props
}: TextareaProps) {
  const baseClasses =
    'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  const combinedClasses = `${baseClasses} ${className}`.trim();

  return (
    <TextareaAutosize
      className={combinedClasses}
      minRows={minRows}
      maxRows={maxRows}
      {...props}
    />
  );
}

export default Textarea;
