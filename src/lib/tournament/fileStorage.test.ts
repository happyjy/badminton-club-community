import { Readable } from 'stream';

import { describe, expect, it } from '@jest/globals';

import { readSingleUpload, UploadTooLargeError } from './fileStorage';

import type { NextApiRequest } from 'next';

const BOUNDARY = '----testboundary';

/**
 * multipart 본문을 만든다. 파일 내용 길이를 바꿔가며 상한을 시험한다.
 */
function makeMultipartBody(fileName: string, content: Buffer): Buffer {
  const head = Buffer.from(
    `--${BOUNDARY}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
      `Content-Type: application/pdf\r\n\r\n`
  );
  const tail = Buffer.from(`\r\n--${BOUNDARY}--\r\n`);
  return Buffer.concat([head, content, tail]);
}

/**
 * NextApiRequest 흉내. readSingleUpload가 쓰는 건 headers와 스트림뿐이다.
 * contentLength를 따로 넘겨 헤더 위조 상황을 만든다.
 */
function makeRequest(
  body: Buffer,
  options: { contentType?: string; contentLength?: string | null } = {}
): NextApiRequest {
  const stream = Readable.from([body]) as unknown as NextApiRequest;
  const headers: Record<string, string> = {};

  const contentType =
    options.contentType ?? `multipart/form-data; boundary=${BOUNDARY}`;
  if (contentType) headers['content-type'] = contentType;

  // null이면 Content-Length를 아예 빼서 '헤더 없는 요청'을 만든다.
  if (options.contentLength !== null) {
    headers['content-length'] =
      options.contentLength ?? String(body.byteLength);
  }

  stream.headers = headers as NextApiRequest['headers'];
  return stream;
}

describe('readSingleUpload', () => {
  it('multipart가 아니면 null을 돌려준다', async () => {
    const req = makeRequest(Buffer.from('{}'), {
      contentType: 'application/json',
    });

    await expect(readSingleUpload(req)).resolves.toBeNull();
  });

  it('정상 크기의 파일을 꺼낸다', async () => {
    const content = Buffer.alloc(1024, 0x41);
    const req = makeRequest(makeMultipartBody('요강.pdf', content));

    const file = await readSingleUpload(req);

    expect(file).not.toBeNull();
    expect(file?.name).toBe('요강.pdf');
    expect(file?.size).toBe(content.byteLength);
  });

  // 원본 파일명은 Storage 키로 쓰이지 않지만, 파싱 단계에서 값이 유지되는지 확인한다.
  // buildStoragePath가 확장자만 쓰는 것이 방어의 핵심이다.
  it('경로 조작 문자가 든 파일명도 그대로 읽어온다', async () => {
    const req = makeRequest(
      makeMultipartBody('../../evil.pdf', Buffer.alloc(16))
    );

    const file = await readSingleUpload(req);

    expect(file?.name).toBe('../../evil.pdf');
  });

  it('필드 이름이 다르면 null을 돌려준다', async () => {
    const req = makeRequest(makeMultipartBody('요강.pdf', Buffer.alloc(16)));

    await expect(readSingleUpload(req, 'attachment')).resolves.toBeNull();
  });

  describe('용량 상한', () => {
    // 11MB = MAX_FILE_SIZE(10MB) + 여유분(1MB)을 넘어서는 크기
    const OVERSIZED = Buffer.alloc(12 * 1024 * 1024);

    it('Content-Length가 상한을 넘으면 본문을 읽기 전에 거절한다', async () => {
      const req = makeRequest(Buffer.alloc(0), {
        contentLength: String(12 * 1024 * 1024),
      });

      await expect(readSingleUpload(req)).rejects.toBeInstanceOf(
        UploadTooLargeError
      );
    });

    // 헤더는 위조할 수 있으므로 실제로 읽은 양도 세야 한다.
    it('Content-Length를 작게 위조해도 실제 크기로 거절한다', async () => {
      const req = makeRequest(makeMultipartBody('요강.pdf', OVERSIZED), {
        contentLength: '100',
      });

      await expect(readSingleUpload(req)).rejects.toBeInstanceOf(
        UploadTooLargeError
      );
    });

    it('Content-Length가 아예 없어도 실제 크기로 거절한다', async () => {
      const req = makeRequest(makeMultipartBody('요강.pdf', OVERSIZED), {
        contentLength: null,
      });

      await expect(readSingleUpload(req)).rejects.toBeInstanceOf(
        UploadTooLargeError
      );
    });

    // 소켓을 끊으면 핸들러가 413을 응답할 대상이 사라진다.
    it('거절할 때 요청 스트림을 파괴하지 않는다', async () => {
      const req = makeRequest(makeMultipartBody('요강.pdf', OVERSIZED), {
        contentLength: null,
      });

      await expect(readSingleUpload(req)).rejects.toBeInstanceOf(
        UploadTooLargeError
      );
      expect(req.destroyed).toBe(false);
    });
  });
});
