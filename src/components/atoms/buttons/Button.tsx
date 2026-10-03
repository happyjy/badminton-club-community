import React, { ButtonHTMLAttributes } from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { Spinner } from '@/components/atoms/Spinner';

import { cn } from '@/lib/utils';

/**
 * 버튼. 같은 모양을 <Link>에 입힐 때는 buttonVariants()를 className에 쓴다.
 * sm은 보이는 높이가 32지만 after 가상 요소로 터치 영역을 44까지 넓힌다.
 */
export const buttonVariants = cva(
  [
    'relative inline-flex items-center justify-center whitespace-nowrap',
    'font-semibold transition-opacity duration-150 active:opacity-70',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
    'focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
    'disabled:cursor-not-allowed disabled:opacity-40',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-accent text-on-accent',
        secondary: 'bg-fill text-primary',
        destructive: 'bg-fill text-negative',
        plain: 'bg-transparent text-primary',
      },
      size: {
        lg: 'h-12 rounded-md px-5 text-body',
        md: 'h-11 rounded-md px-4 text-body',
        sm: "h-8 rounded-sm px-3 text-footnote after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']",
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: NonNullable<ButtonVariantProps['variant']>;
  size?: NonNullable<ButtonVariantProps['size']>;
  pending?: boolean;
  pendingText?: string;
  pendingPosition?: 'left' | 'right' | 'center';
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  disabled = false,
  pending = false,
  pendingText,
  pendingPosition = 'center',
  ...props
}: ButtonProps) {
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
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={isDisabled}
      {...props}
    >
      {renderContent()}
    </button>
  );
}

export default Button;
