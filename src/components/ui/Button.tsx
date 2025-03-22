import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const getVariantClasses = (variant: ButtonProps['variant'] = 'default') => {
  switch (variant) {
    case 'primary':
      return 'bg-blue-500 text-white hover:bg-blue-600';
    case 'secondary':
      return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    case 'ghost':
      return 'bg-transparent text-gray-600 hover:bg-gray-100';
    default:
      return 'bg-gray-800 text-white hover:bg-gray-900';
  }
};

const getSizeClasses = (size: ButtonProps['size'] = 'md') => {
  switch (size) {
    case 'sm':
      return 'px-3 py-1 text-sm';
    case 'lg':
      return 'px-6 py-3 text-lg';
    default:
      return 'px-4 py-2';
  }
};

export function Button({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  disabled = false,
  ...props
}: ButtonProps) {
  const baseClasses =
    'rounded-md font-medium transition-colors duration-200 whitespace-nowrap';
  const variantClasses = getVariantClasses(variant);
  const sizeClasses = getSizeClasses(size);
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';

  const combinedClasses =
    `${baseClasses} ${variantClasses} ${sizeClasses} ${disabledClasses} ${className}`.trim();

  return (
    <button className={combinedClasses} disabled={disabled} {...props}>
      {children}
    </button>
  );
}

export default Button;
