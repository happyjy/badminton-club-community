import React, { ButtonHTMLAttributes } from 'react';

import { Spinner } from '@/components/atoms/Spinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  pending?: boolean;
  pendingText?: string;
  pendingPosition?: 'left' | 'right' | 'center';
}

const getVariantClasses = (variant: ButtonProps['variant'] = 'default') => {
  switch (variant) {
    case 'primary':
      return 'bg-blue-500 text-white hover:bg-blue-600';
    case 'secondary':
      return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    case 'ghost':
      return 'bg-transparent text-gray-600 hover:bg-gray-100';
    case 'outline':
      return 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400';
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
  pending = false,
  pendingText,
  pendingPosition = 'center',
  ...props
}: ButtonProps) {
  // 버튼이 pending 중이면 disabled 속성을 true로 설정
  const isDisabled = pending || disabled;

  const baseClasses =
    'rounded-md font-medium transition-colors duration-200 whitespace-nowrap flex items-center justify-center';
  const variantClasses = getVariantClasses(variant);
  const sizeClasses = getSizeClasses(size);
  const disabledClasses = isDisabled ? 'opacity-50 cursor-not-allowed' : '';

  const combinedClasses =
    `${baseClasses} ${variantClasses} ${sizeClasses} ${disabledClasses} ${className}`.trim();

  // pending 중일 때 표시할 콘텐츠
  const renderContent = () => {
    if (!pending) return children;

    if (pendingPosition === 'center') {
      return (
        <>
          <Spinner className="mx-auto" />
          {pendingText && <span className="ml-2">{pendingText}</span>}
        </>
      );
    }

    if (pendingPosition === 'left') {
      return (
        <>
          <Spinner className="mr-2" />
          {pendingText || children}
        </>
      );
    }

    return (
      <>
        {pendingText || children}
        <Spinner className="ml-2" />
      </>
    );
  };

  return (
    <button className={combinedClasses} disabled={isDisabled} {...props}>
      {renderContent()}
    </button>
  );
}

export default Button;
