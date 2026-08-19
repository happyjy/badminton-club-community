import { useRef, useState } from 'react';

import { Loader2, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

import {
  useDeleteTournamentFile,
  useTournamentFiles,
  useUploadTournamentFile,
} from '@/hooks/useTournamentFiles';

import {
  FILE_ACCEPT_ATTR,
  formatFileSize,
  validateTournamentFile,
} from '@/lib/tournament/fileValidation';

interface TournamentFileFieldProps {
  clubId: string | undefined;
  /** 신규 생성 화면에서는 아직 대회가 없으므로 undefined가 들어온다. */
  tournamentId: string | undefined;
}

/**
 * 관리자용 모집 요강 첨부파일 관리.
 *
 * 업로드·삭제는 폼 제출과 무관하게 즉시 반영된다.
 * 폼 상태에 File 객체를 들고 다니지 않아도 되고, 저장 전에 이탈해도 파일이 남지 않는다.
 */
function TournamentFileField({
  clubId,
  tournamentId,
}: TournamentFileFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: files, isLoading } = useTournamentFiles(clubId, tournamentId);
  const uploadFile = useUploadTournamentFile(clubId, tournamentId);
  const deleteFile = useDeleteTournamentFile(clubId, tournamentId);

  // 대회를 저장하기 전에는 붙일 대상이 없다.
  if (!tournamentId) {
    return (
      <p className="rounded-md border border-dashed border-gray-300 px-3 py-4 text-center text-sm text-gray-500">
        대회를 먼저 저장하면 첨부파일을 올릴 수 있습니다.
      </p>
    );
  }

  const handleSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // 같은 파일을 다시 고를 수 있도록 input을 비운다.
    event.target.value = '';
    if (!file) return;

    // 서버도 같은 함수로 재검증하지만, 여기서 막으면 헛된 업로드를 아낀다.
    const validation = validateTournamentFile({
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
    });
    if (!validation.ok) {
      toast.error(validation.error);
      return;
    }

    try {
      await uploadFile.mutateAsync(file);
      toast.success('파일을 업로드했습니다.');
    } catch (error) {
      toast.error(resolveErrorMessage(error, '파일 업로드에 실패했습니다.'));
    }
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!window.confirm(`'${fileName}'을(를) 삭제할까요?`)) return;

    setDeletingId(fileId);
    try {
      await deleteFile.mutateAsync(fileId);
      toast.success('파일을 삭제했습니다.');
    } catch (error) {
      toast.error(resolveErrorMessage(error, '파일 삭제에 실패했습니다.'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-2">
      {isLoading ? (
        <p className="text-sm text-gray-400">불러오는 중...</p>
      ) : files?.length ? (
        <ul className="space-y-2">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              <a
                href={file.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate text-blue-600 underline"
              >
                {file.fileName}
              </a>
              <span className="shrink-0 text-xs text-gray-400">
                {formatFileSize(file.fileSize)}
              </span>
              <button
                type="button"
                aria-label={`${file.fileName} 삭제`}
                disabled={deletingId === file.id}
                onClick={() => handleDelete(file.id, file.fileName)}
                className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
              >
                {deletingId === file.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={FILE_ACCEPT_ATTR}
        onChange={handleSelect}
        className="hidden"
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={uploadFile.isPending}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          {uploadFile.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              업로드 중...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              파일 추가
            </>
          )}
        </button>
        <span className="text-xs text-gray-400">PDF·이미지, 10MB 이하</span>
      </div>
    </div>
  );
}

/** 서버가 내려준 안내 문구를 우선 쓰고, 없으면 기본 문구로 대체한다. */
function resolveErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object'
  ) {
    const response = (error as { response?: { data?: { error?: string } } })
      .response;
    if (response?.data?.error) return response.data.error;
  }
  return fallback;
}

export default TournamentFileField;
