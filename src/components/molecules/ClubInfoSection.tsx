import React from 'react';

interface ClubInfoSectionProps {
  title: string;
  content: string;
}

export function ClubInfoSection({ title, content }: ClubInfoSectionProps) {
  if (!content) return null;

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-gray-700 whitespace-pre-wrap">{content}</p>
    </div>
  );
}
