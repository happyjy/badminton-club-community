import { ReactNode } from 'react';

interface SectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

function Section({ title, description, children }: SectionProps) {
  return (
    <div className="space-y-4">
      <div className="border-b border-gray-200 pb-2">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export default Section;
