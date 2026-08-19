import { requireClubAdmin } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import {
  firstQueryValue,
  handleApiError,
  parseClubId,
} from '@/lib/tournament/apiHelpers';
import { removeTournamentFiles } from '@/lib/tournament/fileStorage';

import type { NextApiRequest, NextApiResponse } from 'next';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  const clubId = parseClubId(req.query.id);
  const tournamentId = firstQueryValue(req.query.tournamentId);
  const fileId = firstQueryValue(req.query.fileId);
  if (!clubId || !tournamentId || !fileId) {
    return res.status(400).json({ error: '잘못된 요청입니다.', status: 400 });
  }

  try {
    if (req.method === 'DELETE') {
      await requireClubAdmin(req.user.id, clubId);

      // 대회까지 함께 조회해 다른 클럽의 파일을 지우지 못하게 막는다.
      const file = await prisma.tournamentFile.findFirst({
        where: { id: fileId, tournamentId, tournament: { clubId } },
        select: { id: true, storagePath: true },
      });
      if (!file) {
        return res
          .status(404)
          .json({ error: '파일을 찾을 수 없습니다.', status: 404 });
      }

      await prisma.tournamentFile.delete({ where: { id: file.id } });
      // Storage 삭제가 실패해도 사용자에게는 이미 사라진 상태다. 로그만 남긴다.
      await removeTournamentFiles([file.storagePath]);

      return res.status(200).json({ message: '파일을 삭제했습니다.' });
    }

    res.setHeader('Allow', ['DELETE']);
    return res
      .status(405)
      .json({ error: '허용되지 않는 메서드입니다.', status: 405 });
  } catch (error) {
    return handleApiError(res, error);
  }
});
