import { Label } from '@/components/atoms/labels/Label';
import { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  children: ReactNode;
  required?: boolean;
}

export function FormField({
  label,
  children,
  required = false,
}: FormFieldProps) {
  return (
    <div className="space-y-1">
      <Label required={required}>{label}</Label>
      {children}
    </div>
  );
}
