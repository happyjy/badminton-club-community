import { ReactNode } from 'react';
import { ClubNavigation } from './ClubNavigation';

interface ClubLayoutProps {
  children: ReactNode;
  clubId: string;
}

export function ClubLayout({ children, clubId }: ClubLayoutProps) {
  return (
    <div className="py-3">
      <ClubNavigation clubId={clubId} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
