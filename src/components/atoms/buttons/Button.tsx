interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonProps) {
  const variantClasses = {
    primary: 'text-white bg-blue-500 hover:bg-blue-600',
    secondary: 'text-gray-700 bg-gray-100 hover:bg-gray-200',
  };

  return (
    <button
      className={`px-4 py-2 text-sm font-medium rounded-md ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
