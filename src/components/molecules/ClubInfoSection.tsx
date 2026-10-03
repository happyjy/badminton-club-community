import React from 'react';

interface ClubInfoSectionProps {
  title: string;
  content: string;
}

export function ClubInfoSection({ title, content }: ClubInfoSectionProps) {
  if (!content) return null;

  return (
    <section>
      <h2 className="px-4 pb-2 text-footnote text-secondary">{title}</h2>
      <p className="whitespace-pre-wrap break-words rounded-md bg-surface p-4 text-body text-primary">
        {content}
      </p>
    </section>
  );
}
