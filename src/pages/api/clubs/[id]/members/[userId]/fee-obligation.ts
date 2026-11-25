import { NextApiRequest, NextApiResponse } from 'next';

import { APPROVED_STATUS } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { ApiResponse, ClubMember } from '@/types';
import { Role, Status } from '@/types/enums';

/** PATCH: 회비 의무 시작일·탈퇴일·직책 설정 (관리자). 보낸 항목만 고친다 */
export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse<ApiResponse<'clubMember', ClubMember>>
) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  const clubId = Number(req.query.id);
  const userId = Number(req.query.userId);

  const adminMember = await prisma.clubMember.findFirst({
    where: {
      clubId,
      userId: req.user.id,
      role: Role.ADMIN,
      status: APPROVED_STATUS,
    },
  });

  if (!adminMember) {
    return res.status(403).json({
      error: '권한이 없습니다',
      status: 403,
    });
  }

  const target = await prisma.clubMember.findUnique({
    where: { clubId_userId: { clubId, userId } },
  });
  if (!target) {
    return res.status(404).json({
      error: '회원을 찾을 수 없습니다',
      status: 404,
    });
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  // 보낸 항목만 고친다. 직책만 저장할 때 시작일이 지워지지 않게.
  const data: {
    feeObligationStartAt?: Date | null;
    leftAt?: Date | null;
    position?: string | null;
    positionOrder?: number | null;
    feeExcluded?: boolean;
  } = {};

  /** 날짜 항목을 읽는다. 비어 있으면 null, 날짜가 아니면 'invalid' */
  const readDate = (value: unknown): Date | null | 'invalid' => {
    if (value === null || value === undefined || value === '') return null;
    const date = new Date(value as string);
    return Number.isNaN(date.getTime()) ? 'invalid' : date;
  };

  if ('feeObligationStartAt' in body) {
    const feeObligationStartAt = readDate(body.feeObligationStartAt);
    if (feeObligationStartAt === 'invalid') {
      return res.status(400).json({
        error: '유효한 날짜를 입력해주세요',
        status: 400,
      });
    }
    data.feeObligationStartAt = feeObligationStartAt;
  }

  // leftAt (탈퇴일) 수정 지원
  if ('leftAt' in body) {
    const leftAt = readDate(body.leftAt);
    if (leftAt === 'invalid') {
      return res.status(400).json({
        error: '유효한 탈퇴일을 입력해주세요',
        status: 400,
      });
    }
    // 탈퇴일은 탈퇴 상태에만 둔다. 그래서 탈퇴일을 읽는 곳(매칭·확정 계획·이월)이 상태를 다시 보지 않아도 맞다.
    // 탈퇴·재가입은 회원 관리의 상태 변경에서 달을 골라 처리한다.
    const isLeft = target.status === Status.LEFT;
    if (leftAt && !isLeft) {
      return res.status(400).json({
        error: '탈퇴한 회원만 탈퇴일을 넣을 수 있습니다',
        status: 400,
      });
    }
    if (!leftAt && isLeft) {
      return res.status(400).json({
        error: '탈퇴월을 입력해주세요',
        status: 400,
      });
    }
    data.leftAt = leftAt;
  }

  // 회비 대상 아님 (코치 등): 납부 현황·내보내기·미납자 목록에서 뺀다
  if ('feeExcluded' in body) {
    if (typeof body.feeExcluded !== 'boolean') {
      return res.status(400).json({
        error: '회비 대상 여부를 확인해주세요',
        status: 400,
      });
    }
    data.feeExcluded = body.feeExcluded;
  }

  // 직책: 납부현황 내보내기의 비고와 정렬에 쓴다
  if ('position' in body) {
    const position =
      typeof body.position === 'string' ? body.position.trim() : '';
    data.position = position ? position.slice(0, 20) : null;
  }
  if ('positionOrder' in body) {
    const raw = body.positionOrder;
    if (raw === null || raw === undefined || raw === '') {
      data.positionOrder = null;
    } else {
      const positionOrder = Number(raw);
      if (!Number.isInteger(positionOrder) || positionOrder < 1) {
        return res.status(400).json({
          error: '정렬 순서는 1 이상의 정수로 적어주세요',
          status: 400,
        });
      }
      data.positionOrder = positionOrder;
    }
  }

  const updated = await prisma.clubMember.update({
    where: {
      clubId_userId: { clubId, userId },
    },
    data,
  });

  const typedMember: ClubMember = {
    ...updated,
    role: updated.role as Role,
    status: updated.status as Status,
    name: updated.name ?? undefined,
    birthDate: updated.birthDate ?? undefined,
    gender: updated.gender ?? undefined,
    localTournamentLevel: updated.localTournamentLevel ?? undefined,
    nationalTournamentLevel: updated.nationalTournamentLevel ?? undefined,
    lessonPeriod: updated.lessonPeriod ?? undefined,
    playingPeriod: updated.playingPeriod ?? undefined,
  };

  return res.status(200).json({
    data: { clubMember: typedMember },
    status: 200,
    message: '회원 정보가 저장되었습니다',
  });
});
