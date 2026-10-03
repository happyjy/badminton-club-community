import { ReactNode } from 'react';

interface SectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

function Section({ title, description, children }: SectionProps) {
  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-2">
        <h3 className="text-callout font-semibold text-primary">{title}</h3>
        {description && (
          <p className="text-footnote text-secondary">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

export default Section;
