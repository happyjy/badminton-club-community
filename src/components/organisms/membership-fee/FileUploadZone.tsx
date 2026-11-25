import { useCallback, useState } from 'react';

import { Upload, File, X } from 'lucide-react';

import { Button } from '@/components/atoms/buttons/Button';
import { IconButton } from '@/components/atoms/buttons/IconButton';

import { cn } from '@/lib/utils';

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
  accept?: string;
}

function FileUploadZone({
  onFileSelect,
  isUploading = false,
  accept = '.xlsx,.xls',
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
    }
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setSelectedFile(file);
      }
    },
    []
  );

  const handleUpload = () => {
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'rounded-md border border-dashed p-8 text-center transition-colors duration-150',
          isDragging
            ? 'border-accent bg-fill'
            : 'border-border bg-surface-muted'
        )}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
          disabled={isUploading}
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <Upload
            aria-hidden
            className={cn(
              'mx-auto mb-4 h-12 w-12',
              isDragging ? 'text-primary' : 'text-tertiary'
            )}
          />
          <p className="mb-2 text-callout text-primary">
            엑셀 파일을 드래그하거나 클릭하여 선택하세요
          </p>
          <p className="text-footnote text-secondary">
            카카오뱅크 거래내역 엑셀 파일 (.xlsx, .xls)
          </p>
        </label>
      </div>

      {selectedFile && (
        <div className="flex items-center justify-between gap-3 rounded-md bg-surface-muted p-4">
          <div className="flex min-w-0 items-center gap-3">
            <File aria-hidden className="h-6 w-6 shrink-0 text-secondary" />
            <div className="min-w-0">
              <p className="truncate text-callout font-semibold text-primary">
                {selectedFile.name}
              </p>
              <p className="text-footnote text-secondary">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <IconButton
              aria-label="선택한 파일 지우기"
              onClick={handleClear}
              disabled={isUploading}
            >
              <X aria-hidden className="h-5 w-5" />
            </IconButton>
            <Button
              type="button"
              onClick={handleUpload}
              pending={isUploading}
              pendingText="업로드 중..."
              pendingPosition="left"
            >
              업로드
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FileUploadZone;
