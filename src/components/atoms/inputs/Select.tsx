import { forwardRef, ReactNode } from 'react';

import {
  inputClassName,
  withMinBodyText,
} from '@/components/atoms/inputs/Input';

import { cn } from '@/lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: Array<{ value: string; label: string }>;
  /** 맨 앞의 안내 항목. null이면 그리지 않는다 ("전체"처럼 첫 항목을 직접 줄 때). */
  placeholder?: string | null;
  fullWidth?: boolean;
  /** 직접 쓴 <option>. options 뒤에 그려진다. */
  children?: ReactNode;
}

// react-hook-form의 register()가 ref를 전달하므로 forwardRef가 필요하다.
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    {
      options,
      placeholder = '선택해주세요',
      fullWidth = true,
      className,
      children,
      ...props
    },
    ref
  ) {
    return (
      <select
        ref={ref}
        // select-chevron: 기본 화살표를 지우고 직접 그린다 (globals.css).
        className={cn(
          inputClassName,
          'select-chevron appearance-none pr-10 text-body',
          fullWidth && 'w-full',
          withMinBodyText(className)
        )}
        {...props}
      >
        {placeholder !== null && <option value="">{placeholder}</option>}
        {options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
    );
  }
);
