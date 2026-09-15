import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { ApiResponse } from '@/types';
import { ClubMembershipResponse } from '@/types/club.types';
import { Role, Status } from '@/types/enums';
import { formatPhoneNumber, isValidPhoneNumber } from '@/utils/phoneNumber';

// 클럽 가입
export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse<ApiResponse<'membership', ClubMembershipResponse>>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  const { id: clubId } = req.query;
  const {
    name,
    birthDate,
    phoneNumber,
    gender,
    localTournamentLevel,
    nationalTournamentLevel,
    lessonPeriod,
    playingPeriod,
  } = req.body;

  // ClubMember.phoneNumber는 @default("010-0000-0000")이라
  // 번호를 비워 보내면 그럴듯한 placeholder가 저장된다. 여기서 막는다.
  if (!phoneNumber) {
    return res.status(400).json({
      error: '전화번호는 필수 입력 항목입니다',
      status: 400,
    });
  }

  // 전화번호 형식 검증
  // 클라이언트를 우회한 요청으로 형식이 어긋난 번호가 저장되지 않도록 한다.
  if (!isValidPhoneNumber(phoneNumber)) {
    return res.status(400).json({
      error: '올바른 전화번호가 아닙니다. (예: 010-1234-5678)',
      status: 400,
    });
  }

  // 저장 형식을 '010-1234-5678' 하나로 맞춘다.
  const normalizedPhoneNumber = formatPhoneNumber(phoneNumber);

  try {
    // 전화번호 인증 상태 확인
    // 인증은 '이 번호가 이 사람 것인지'를 확인하는 절차라 클럽과 무관하다.
    // 그래서 판정 근거를 계정(User)에만 두고, 게스트 신청과 같은 기준을 쓴다.
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    // 저장된 번호의 형식이 제각각일 수 있어, 양쪽을 정규화해 비교한다.
    // 문자열을 그대로 비교하면 같은 번호인데도 형식이 달라 반려된다.
    const isSamePhoneNumber =
      formatPhoneNumber(user?.phoneNumber) === normalizedPhoneNumber;

    if (!user?.phoneVerifiedAt || !isSamePhoneNumber) {
      return res.status(400).json({
        error:
          '전화번호 인증이 필요합니다. 인증되지 않은 전화번호로는 신청할 수 없습니다.',
        status: 400,
      });
    }

    // 이미 가입된 회원인지 확인
    const existingMembership = await prisma.clubMember.findUnique({
      where: {
        clubId_userId: {
          clubId: Number(clubId),
          userId: req.user.id,
        },
      },
    });

    if (existingMembership) {
      return res.status(400).json({
        error: '이미 가입된 클럽입니다',
        status: 400,
      });
    }

    const membership = await prisma.clubMember.create({
      data: {
        clubId: Number(clubId),
        userId: req.user.id,
        role: Role.MEMBER,
        status: Status.PENDING,
        name,
        birthDate,
        phoneNumber: normalizedPhoneNumber,
        gender,
        localTournamentLevel,
        nationalTournamentLevel,
        lessonPeriod,
        playingPeriod,
      },
    });

    // null 값을 undefined로 변환하여 타입 호환성 확보
    const typedMembership = {
      ...membership,
      role: membership.role as Role,
      status: membership.status as Status,
      name: membership.name ?? undefined,
      birthDate: membership.birthDate ?? undefined,
      phoneNumber: membership.phoneNumber ?? undefined,
      gender: membership.gender ?? undefined,
      localTournamentLevel: membership.localTournamentLevel ?? undefined,
      nationalTournamentLevel: membership.nationalTournamentLevel ?? undefined,
      lessonPeriod: membership.lessonPeriod ?? undefined,
      playingPeriod: membership.playingPeriod ?? undefined,
    };

    return res.status(200).json({
      data: { membership: typedMembership },
      status: 200,
      message: '클럽 가입 신청이 완료되었습니다',
    });
  } catch (error) {
    console.error('클럽 가입 중 오류 발생:', error);
    return res.status(500).json({
      error: '클럽 가입에 실패했습니다',
      status: 500,
    });
  }
});
