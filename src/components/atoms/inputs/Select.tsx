import { forwardRef } from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: Array<{ value: string; label: string }>;
  fullWidth?: boolean;
}

// react-hook-form의 register()가 ref를 전달하므로 forwardRef가 필요하다.
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    { options, fullWidth = true, className = '', ...props },
    ref
  ) {
    return (
      <select
        ref={ref}
        className={`mt-1 block ${fullWidth ? 'w-full' : ''} rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${className}`}
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
