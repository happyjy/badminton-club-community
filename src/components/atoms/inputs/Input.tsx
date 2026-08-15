import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  fullWidth?: boolean;
}

// react-hook-form의 register()가 ref를 전달하므로 forwardRef가 필요하다.
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { fullWidth = true, className = '', ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={`mt-1 block ${fullWidth ? 'w-full' : ''} rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${className}`}
      {...props}
    />
  );
});
