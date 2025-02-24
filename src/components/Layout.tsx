import { LayoutProps } from '@/types/components.types';
import Navigation from './Navigation';

export default function Layout({ children }: LayoutProps) {
  return (
    <>
      <Navigation />
      <main className="max-w-4xl mx-auto px-4">{children}</main>
    </>
  );
}
