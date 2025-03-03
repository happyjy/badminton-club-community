import { ReactNode } from 'react';
import Label from '../atoms/Label';

interface InfoItemProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export const InfoItem = ({
  label,
  children,
  className = '',
}: InfoItemProps) => {
  return (
    <div className={`bg-white p-3 rounded-md ${className}`}>
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div className="font-medium">{children}</div>
      </div>
    </div>
  );
};

export default InfoItem;
