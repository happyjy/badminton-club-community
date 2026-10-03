import { FileText, Image as ImageIcon } from 'lucide-react';

import { formatFileSize } from '@/lib/tournament/fileValidation';
import type { TournamentFile } from '@/types/tournament.types';

interface TournamentFileListProps {
  files: TournamentFile[] | undefined;
  title?: string;
  /** 여백은 호출부가 정한다. 목록이 비면 통째로 사라져 빈 공간이 남지 않는다. */
  className?: string;
}

/**
 * 모집 요강 첨부파일 목록. 대회 상세와 신청 페이지가 함께 쓴다.
 * 관리자가 아무것도 올리지 않았으면 그리지 않는다.
 */
function TournamentFileList({
  files,
  title = '첨부파일',
  className,
}: TournamentFileListProps) {
  if (!files?.length) return null;

  return (
    <div className={className}>
      <h3 className="mb-2 text-callout font-semibold text-primary">{title}</h3>
      <ul className="space-y-2">
        {files.map((file) => {
          const isImage = file.mimeType.startsWith('image/');
          const Icon = isImage ? ImageIcon : FileText;

          return (
            <li key={file.id}>
              <a
                href={file.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-callout transition-colors"
              >
                <Icon className="h-4 w-4 shrink-0 text-secondary" />
                <span className="min-w-0 flex-1 truncate text-primary underline">
                  {file.fileName}
                </span>
                <span className="shrink-0 text-footnote text-secondary">
                  {formatFileSize(file.fileSize)}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default TournamentFileList;
