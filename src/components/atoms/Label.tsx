import { ReactNode } from 'react';

interface LabelProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'title';
}

export const Label = ({
  children,
  className = '',
  variant = 'default',
}: LabelProps) => {
  const baseStyles = {
    default: 'text-sm text-gray-600',
    title:
      'text-base sm:text-lg font-semibold text-gray-900 border-l-4 border-blue-500 pl-3',
  };

  return <p className={`${baseStyles[variant]} ${className}`}>{children}</p>;
};

export default Label;
