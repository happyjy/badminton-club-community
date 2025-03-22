import React from 'react';

import Spinner from '@/components/atoms/Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  pending?: boolean;
  pendingText?: string;
  pendingPosition?: 'left' | 'right' | 'center';
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  pending = false,
  pendingText,
  pendingPosition = 'center',
  disabled,
  ...props
}: ButtonProps) {
  const variantClasses = {
    primary: 'text-white bg-blue-500 hover:bg-blue-600',
    secondary: 'text-gray-700 bg-gray-100 hover:bg-gray-200',
  };

  // 버튼이 pending 중이면 disabled 속성을 true로 설정
  const isDisabled = pending || disabled;

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
    <button
      className={`px-4 py-2 text-sm font-medium rounded-md flex items-center justify-center ${variantClasses[variant]} ${className} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      disabled={isDisabled}
      {...props}
    >
      {renderContent()}
    </button>
  );
}
