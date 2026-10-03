import { ReactNode } from 'react';

export interface HeaderProps {
  /** 창의 제목. JoinModal이 읽어 시트의 제목 줄에 그린다 */
  title: string;
  description?: string | ReactNode;
}

/** 신청 창 맨 위의 설명. 제목은 시트가 그리므로 여기서는 설명만 그린다. */
function Header({ description }: HeaderProps) {
  if (!description) return null;
  return <p className="text-callout text-secondary">{description}</p>;
}

export default Header;
