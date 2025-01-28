import Navigation from './Navigation';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <>
      <Navigation />
      <main className="max-w-4xl mx-auto p-6">{children}</main>
    </>
  );
}
