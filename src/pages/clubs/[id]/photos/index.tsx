import { Image as ImageIcon } from 'lucide-react';

import { EmptyState } from '@/components/molecules/EmptyState';
import { PageHeader } from '@/components/organisms/PageHeader';

import { withAuth } from '@/lib/withAuth';

function PhotosPage() {
  return (
    <>
      <PageHeader title="사진첩" />
      <div className="rounded-md bg-surface">
        <EmptyState icon={ImageIcon} title="사진첩은 곧 열려요" />
      </div>
    </>
  );
}

export default withAuth(PhotosPage);
