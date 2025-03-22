import React from 'react';

import Image from 'next/image';

import spinnerSvg from '@/icon/spinner.svg';

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'sm',
  color = 'text-white',
  className = '',
}) => {
  const sizeMap = {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
  };

  const pixelSize = sizeMap[size];

  // spinner.svg 파일을 이미지로 사용
  return (
    <div className={`inline-block animate-spin ${color} ${className}`}>
      <Image
        src={spinnerSvg}
        alt="로딩 중"
        width={pixelSize}
        height={pixelSize}
        className="text-current"
      />
    </div>
  );
};

export default Spinner;
