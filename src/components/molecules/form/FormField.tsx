import { ReactNode } from 'react';

import { Label } from '@/components/atoms/labels/Label';

interface FormFieldProps {
  label: string;
  children: ReactNode;
  required?: boolean;
  /** 검증 실패 메시지. 없으면 아무것도 렌더링하지 않는다. */
  error?: string;
}

export function FormField({
  label,
  children,
  required = false,
  error,
}: FormFieldProps) {
  return (
    <div className="space-y-1">
      <Label required={required}>{label}</Label>
      {children}
      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
