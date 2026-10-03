import { forwardRef } from 'react';

import { inputClassName } from '@/components/atoms/inputs/Input';

import { cn } from '@/lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: Array<{ value: string; label: string }>;
  fullWidth?: boolean;
}

// react-hook-form의 register()가 ref를 전달하므로 forwardRef가 필요하다.
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ options, fullWidth = true, className, ...props }, ref) {
    return (
      <select
        ref={ref}
        // select-chevron: 기본 화살표를 지우고 직접 그린다 (globals.css).
        className={cn(
          inputClassName,
          'select-chevron appearance-none pr-10',
          fullWidth && 'w-full',
          className,
          'text-body'
        )}
        {...props}
      >
        <option value="">선택해주세요</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
);
