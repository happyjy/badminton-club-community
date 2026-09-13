import React from 'react';

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Tailwind 텍스트 색상 클래스. 링 색상이 여기서 상속된다 */
  color?: string;
  className?: string;
}

/**
 * 로딩 스피너.
 *
 * 링의 4분의 3만 그리고 나머지를 투명하게 둬서 회전이 드러나는 형태다.
 * `border-current`로 부모의 텍스트 색을 따르므로, 파란 버튼 위에서는
 * `text-white`, 회색 버튼 위에서는 `text-gray-600`처럼 색만 바꾸면 된다.
 *
 * 이전 구현은 SVG를 next/image로 불러왔는데, 그 방식은 SVG 안의
 * `currentColor`가 문서 색상을 상속받지 못해 color prop이 무시됐다.
 * 순수 CSS 테두리로 바꿔 그 문제를 없앴다.
 */
export const Spinner: React.FC<SpinnerProps> = ({
  size = 'sm',
  color = 'text-current',
  className = '',
}) => {
  // 크기별로 테두리 두께를 함께 조절해야 비율이 유지된다.
  const sizeClasses = {
    xs: 'w-3 h-3 border',
    sm: 'w-4 h-4 border-2',
    md: 'w-5 h-5 border-2',
    lg: 'w-6 h-6 border-[3px]',
  };

  return (
    <span
      role="status"
      aria-label="로딩 중"
      className={`inline-block shrink-0 animate-spin rounded-full border-current border-r-transparent align-[-0.125em] ${sizeClasses[size]} ${color} ${className}`}
    />
  );
};

export default Spinner;
