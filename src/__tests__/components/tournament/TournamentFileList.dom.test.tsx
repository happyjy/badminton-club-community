import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import TournamentFileList from '@/components/organisms/tournament/TournamentFileList';

import type { TournamentFile } from '@/types/tournament.types';

function makeFile(overrides: Partial<TournamentFile> = {}): TournamentFile {
  return {
    id: 'file-1',
    fileName: '모집 요강.pdf',
    fileUrl: 'https://example.supabase.co/storage/x/file-1.pdf',
    fileSize: 1024 * 1024,
    mimeType: 'application/pdf',
    order: 0,
    uploadedAt: '2026-08-19T00:00:00.000Z',
    ...overrides,
  };
}

describe('TournamentFileList', () => {
  it('파일명과 크기를 보여준다', () => {
    render(<TournamentFileList files={[makeFile()]} />);

    expect(screen.getByText('모집 요강.pdf')).toBeTruthy();
    expect(screen.getByText('1.0MB')).toBeTruthy();
  });

  // 새 탭으로 열지 않으면 신청서 작성 중이던 내용이 날아간다.
  it('새 탭에서 열리는 링크로 만든다', () => {
    render(<TournamentFileList files={[makeFile()]} />);

    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe(
      'https://example.supabase.co/storage/x/file-1.pdf'
    );
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('여러 파일을 모두 보여준다', () => {
    render(
      <TournamentFileList
        files={[
          makeFile(),
          makeFile({ id: 'file-2', fileName: '대진표.png', order: 1 }),
        ]}
      />
    );

    expect(screen.getAllByRole('link')).toHaveLength(2);
    expect(screen.getByText('대진표.png')).toBeTruthy();
  });

  it('제목을 바꿔 달 수 있다', () => {
    render(<TournamentFileList files={[makeFile()]} title="첨부 문서" />);

    expect(screen.getByText('첨부 문서')).toBeTruthy();
  });

  it('파일이 없으면 아무것도 그리지 않는다', () => {
    const { container } = render(<TournamentFileList files={[]} />);

    expect(container.innerHTML).toBe('');
  });

  it('files가 undefined여도 깨지지 않는다', () => {
    const { container } = render(<TournamentFileList files={undefined} />);

    expect(container.innerHTML).toBe('');
  });
});
