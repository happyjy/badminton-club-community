import { ReactNode } from 'react';

interface HeaderProps {
  title: string;
  description?: string | ReactNode;
}

function Header({ title, description }: HeaderProps) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      {description && (
        <p className="text-gray-600 text-sm">{description}</p>
      )}
    </div>
  );
}

export default Header;
