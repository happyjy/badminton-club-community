import { requireClubAdmin, requireClubMember } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import {
  firstQueryValue,
  handleApiError,
  parseClubId,
} from '@/lib/tournament/apiHelpers';
import {
  readSingleUpload,
  removeTournamentFiles,
  UploadTooLargeError,
  uploadTournamentFile,
} from '@/lib/tournament/fileStorage';
import {
  buildStoragePath,
  validateTournamentFile,
} from '@/lib/tournament/fileValidation';

import type { NextApiRequest, NextApiResponse } from 'next';

// multipart를 직접 파싱하므로 Next의 기본 body 파서를 끈다.
export const config = { api: { bodyParser: false } };

const FILE_SELECT = {
  id: true,
  fileName: true,
  fileUrl: true,
  fileSize: true,
  mimeType: true,
  order: true,
  uploadedAt: true,
} as const;

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  const clubId = parseClubId(req.query.id);
  const tournamentId = firstQueryValue(req.query.tournamentId);
  if (!clubId || !tournamentId) {
    return res.status(400).json({ error: '잘못된 요청입니다.', status: 400 });
  }

  try {
    if (req.method === 'GET') {
      await requireClubMember(req.user.id, clubId);

      const tournament = await prisma.tournament.findFirst({
        where: { id: tournamentId, clubId },
        select: { id: true },
      });
      if (!tournament) {
        return res
          .status(404)
          .json({ error: '대회를 찾을 수 없습니다.', status: 404 });
      }

      const files = await prisma.tournamentFile.findMany({
        where: { tournamentId },
        orderBy: [{ order: 'asc' }, { uploadedAt: 'asc' }],
        select: FILE_SELECT,
      });

      return res
        .status(200)
        .json({ data: { files }, message: '첨부파일을 불러왔습니다.' });
    }

    if (req.method === 'POST') {
      await requireClubAdmin(req.user.id, clubId);

      const tournament = await prisma.tournament.findFirst({
        where: { id: tournamentId, clubId },
        select: { id: true },
      });
      if (!tournament) {
        return res
          .status(404)
          .json({ error: '대회를 찾을 수 없습니다.', status: 404 });
      }

      const file = await readSingleUpload(req);
      if (!file) {
        return res.status(400).json({ error: '파일이 없습니다.', status: 400 });
      }

      // 클라이언트에서 이미 걸렀더라도 서버에서 다시 확인한다.
      const validation = validateTournamentFile({
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      });
      if (!validation.ok) {
        return res.status(400).json({ error: validation.error, status: 400 });
      }

      const lastFile = await prisma.tournamentFile.findFirst({
        where: { tournamentId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      const nextOrder = (lastFile?.order ?? -1) + 1;

      // DB id를 먼저 만들어 Storage 키에 쓴다. 두 곳의 식별자가 같아야 추적이 쉽다.
      const fileId = crypto.randomUUID();
      const storagePath = buildStoragePath({
        clubId,
        tournamentId,
        fileId,
        fileName: file.name,
      });

      const { publicUrl } = await uploadTournamentFile({ storagePath, file });

      try {
        const created = await prisma.tournamentFile.create({
          data: {
            id: fileId,
            tournamentId,
            fileName: file.name,
            storagePath,
            fileUrl: publicUrl,
            fileSize: file.size,
            mimeType: file.type,
            order: nextOrder,
          },
          select: FILE_SELECT,
        });

        return res
          .status(201)
          .json({ data: { file: created }, message: '파일을 업로드했습니다.' });
      } catch (error) {
        // DB 기록에 실패하면 올린 파일이 아무도 참조하지 않는 고아가 된다.
        await removeTournamentFiles([storagePath]);
        throw error;
      }
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res
      .status(405)
      .json({ error: '허용되지 않는 메서드입니다.', status: 405 });
  } catch (error) {
    // 용량 초과는 서버 오류가 아니라 의도된 거절이므로 413으로 알린다.
    if (error instanceof UploadTooLargeError) {
      return res.status(413).json({ error: error.message, status: 413 });
    }
    return handleApiError(res, error);
  }
});
