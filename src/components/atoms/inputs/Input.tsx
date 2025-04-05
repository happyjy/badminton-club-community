interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  fullWidth?: boolean;
}

export function Input({
  fullWidth = true,
  className = '',
  ...props
}: InputProps) {
  return (
    <input
      className={`mt-1 block ${fullWidth ? 'w-full' : ''} rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${className}`}
      {...props}
    />
  );
}
