import { describe, expect, it } from '@jest/globals';

import {
  MAX_FILE_SIZE,
  buildStoragePath,
  formatFileSize,
  validateTournamentFile,
} from './fileValidation';

describe('validateTournamentFile', () => {
  it('PDF를 허용한다', () => {
    const result = validateTournamentFile({
      fileName: '모집 요강.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
    });
    expect(result).toEqual({ ok: true });
  });

  it.each([
    ['대진표.jpg', 'image/jpeg'],
    ['대진표.jpeg', 'image/jpeg'],
    ['코트배정도.png', 'image/png'],
  ])('이미지 %s를 허용한다', (fileName, mimeType) => {
    expect(
      validateTournamentFile({ fileName, mimeType, fileSize: 1024 })
    ).toEqual({
      ok: true,
    });
  });

  it('대문자 확장자도 허용한다', () => {
    const result = validateTournamentFile({
      fileName: '요강.PDF',
      mimeType: 'application/pdf',
      fileSize: 1024,
    });
    expect(result).toEqual({ ok: true });
  });

  it.each(['요강.hwp', '요강.docx', '요강.zip', '요강.exe'])(
    '허용하지 않는 확장자 %s를 거부한다',
    (fileName) => {
      const result = validateTournamentFile({
        fileName,
        mimeType: 'application/pdf',
        fileSize: 1024,
      });
      expect(result.ok).toBe(false);
    }
  );

  it('확장자가 없으면 거부한다', () => {
    const result = validateTournamentFile({
      fileName: '요강',
      mimeType: 'application/pdf',
      fileSize: 1024,
    });
    expect(result.ok).toBe(false);
  });

  // 확장자만 믿으면 위조가 통과하므로 MIME도 함께 본다.
  it('확장자는 맞지만 MIME이 다르면 거부한다', () => {
    const result = validateTournamentFile({
      fileName: '요강.pdf',
      mimeType: 'application/x-msdownload',
      fileSize: 1024,
    });
    expect(result.ok).toBe(false);
  });

  // 반대 방향도 막아야 .png로 위장한 실행 파일이 걸러진다.
  it('MIME은 맞지만 확장자가 다르면 거부한다', () => {
    const result = validateTournamentFile({
      fileName: '요강.exe',
      mimeType: 'image/png',
      fileSize: 1024,
    });
    expect(result.ok).toBe(false);
  });

  it('확장자와 MIME이 서로 다른 형식이면 거부한다', () => {
    const result = validateTournamentFile({
      fileName: '요강.pdf',
      mimeType: 'image/png',
      fileSize: 1024,
    });
    expect(result.ok).toBe(false);
  });

  it('제한 용량과 같은 크기는 허용한다', () => {
    const result = validateTournamentFile({
      fileName: '요강.pdf',
      mimeType: 'application/pdf',
      fileSize: MAX_FILE_SIZE,
    });
    expect(result).toEqual({ ok: true });
  });

  it('제한 용량을 1바이트라도 넘으면 거부한다', () => {
    const result = validateTournamentFile({
      fileName: '요강.pdf',
      mimeType: 'application/pdf',
      fileSize: MAX_FILE_SIZE + 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('10MB');
  });

  it('빈 파일을 거부한다', () => {
    const result = validateTournamentFile({
      fileName: '요강.pdf',
      mimeType: 'application/pdf',
      fileSize: 0,
    });
    expect(result.ok).toBe(false);
  });

  it('파일명이 비어 있으면 거부한다', () => {
    const result = validateTournamentFile({
      fileName: '   ',
      mimeType: 'application/pdf',
      fileSize: 1024,
    });
    expect(result.ok).toBe(false);
  });
});

describe('buildStoragePath', () => {
  // 한글·공백이 든 원본 이름을 Storage 키로 쓰면 URL 인코딩 문제가 생긴다.
  it('원본 파일명을 쓰지 않고 확장자만 남긴다', () => {
    const path = buildStoragePath({
      clubId: 12,
      tournamentId: 'tour-1',
      fileId: 'file-1',
      fileName: '모집 요강 최종.pdf',
    });
    expect(path).toBe('12/tour-1/file-1.pdf');
  });

  it('확장자를 소문자로 정규화한다', () => {
    const path = buildStoragePath({
      clubId: 3,
      tournamentId: 'tour-2',
      fileId: 'file-2',
      fileName: '요강.PNG',
    });
    expect(path).toBe('3/tour-2/file-2.png');
  });

  it('점이 여러 개면 마지막 것을 확장자로 본다', () => {
    const path = buildStoragePath({
      clubId: 1,
      tournamentId: 't',
      fileId: 'f',
      fileName: '2026.03.15 요강.pdf',
    });
    expect(path).toBe('1/t/f.pdf');
  });
});

describe('formatFileSize', () => {
  it.each([
    [0, '0KB'],
    [512, '1KB'],
    [1024, '1KB'],
    [1024 * 1024, '1.0MB'],
    [1024 * 1024 * 2.5, '2.5MB'],
  ])('%i바이트를 %s로 표시한다', (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });

  // 올림 탓에 1024KB로 표시되던 구간이 있었다. MB로 넘어가야 한다.
  it('1MB 직전 구간을 1024KB가 아니라 MB로 표시한다', () => {
    expect(formatFileSize(1024 * 1024 - 1)).toBe('1.0MB');
    expect(formatFileSize(1048000)).toBe('1.0MB');
  });
});
