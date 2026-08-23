import { requireClubAdmin } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import {
  firstQueryValue,
  handleApiError,
  parseClubId,
} from '@/lib/tournament/apiHelpers';
import { adminPlayerUpdateSchema } from '@/schemas/tournament.schema';

import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * 관리자가 외부 신청서의 선수 정보를 대신 수정한다.
 *
 * 외부 신청자는 계정이 없어 스스로 고칠 수 없으므로, 이름·생년월일·전화번호
 * 오타를 클럽에 요청하게 된다. 회원 신청서는 본인이 직접 고칠 수 있고
 * "임원도 수정 불가"가 기존 규칙이므로, 이 API는 외부 신청서에만 열어 둔다.
 *
 * 금액에 영향을 주는 값(isClubMember)과 구조를 바꾸는 동작(선수 추가·삭제)은
 * 스키마 단계에서 이미 배제된다.
 */
export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  if (req.method !== 'PATCH') {
    return res
      .status(405)
      .json({ error: '허용되지 않는 메소드입니다.', status: 405 });
  }

  const clubId = parseClubId(req.query.id);
  const tournamentId = firstQueryValue(req.query.tournamentId);
  const entryId = firstQueryValue(req.query.entryId);
  if (!clubId || !tournamentId || !entryId) {
    return res.status(400).json({ error: '잘못된 요청입니다.', status: 400 });
  }

  try {
    await requireClubAdmin(req.user.id, clubId);

    const parsed = adminPlayerUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.errors[0]?.message ?? '입력값이 올바르지 않습니다.',
        status: 400,
      });
    }

    const entry = await prisma.tournamentEntry.findFirst({
      where: { id: entryId, tournamentId, tournament: { clubId } },
      select: {
        id: true,
        isExternal: true,
        players: { select: { id: true } },
        tournament: { select: { tshirtSizes: true } },
      },
    });
    if (!entry) {
      return res
        .status(404)
        .json({ error: '신청 내역을 찾을 수 없습니다.', status: 404 });
    }

    // 회원 신청서는 본인만 고칠 수 있다는 기존 규칙을 그대로 둔다
    if (!entry.isExternal) {
      return res.status(400).json({
        error: '회원 신청서는 신청자 본인만 수정할 수 있습니다.',
        status: 400,
      });
    }

    // 다른 신청서의 선수 id를 섞어 보내 남의 정보를 고치는 것을 막는다
    const ownPlayerIds = new Set(entry.players.map((player) => player.id));
    const unknown = parsed.data.players.find(
      (player) => !ownPlayerIds.has(player.id)
    );
    if (unknown) {
      return res
        .status(400)
        .json({ error: '이 신청서의 선수가 아닙니다.', status: 400 });
    }

    // 티셔츠를 쓰지 않는 대회면 사이즈 값을 남기지 않는다
    const useTshirt = entry.tournament.tshirtSizes.length > 0;

    // 입금 상태 변경과 마찬가지로 마감 후에도 허용한다.
    // 오타 정정 요청은 대개 마감 뒤에 들어오고, 금액이 바뀌지 않아 안전하다.
    await prisma.$transaction(
      parsed.data.players.map((player) =>
        prisma.entryPlayer.update({
          where: { id: player.id },
          data: {
            name: player.name,
            gender: player.gender,
            birthDate: player.birthDate,
            phoneNumber: player.phoneNumber,
            tshirtSize: useTshirt ? (player.tshirtSize ?? null) : null,
          },
        })
      )
    );

    const players = await prisma.entryPlayer.findMany({
      where: { entryId },
      orderBy: { order: 'asc' },
    });

    return res
      .status(200)
      .json({ data: { players }, message: '선수 정보를 수정했습니다.' });
  } catch (error) {
    return handleApiError(res, error);
  }
});
