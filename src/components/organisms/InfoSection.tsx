import { ReactNode } from 'react';

import Label from '../atoms/Label';

interface InfoSectionProps {
  title: string;
  children: ReactNode;
  fullWidth?: boolean;
  className?: string;
}

export const InfoSection = ({
  title,
  children,
  fullWidth = false,
  className = '',
}: InfoSectionProps) => {
  return (
    <div className={`bg-gray-50 p-4 rounded-lg ${className}`}>
      <div className="flex flex-col sm:flex-row">
        <div className="mb-3 sm:mb-0 sm:w-36">
          <Label variant="title">{title}</Label>
        </div>
        <div
          className={`flex-1 ${!fullWidth ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : ''}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default InfoSection;
