import { prisma } from '@/lib/prisma';
import { consumeAttempt, getClientIp } from '@/lib/rateLimit';
import {
  firstQueryValue,
  handleApiError,
  parseClubId,
} from '@/lib/tournament/apiHelpers';
import {
  matchesPhoneTail,
  normalizeContactName,
} from '@/lib/tournament/externalEntry';
import { externalLookupSchema } from '@/schemas/tournament.schema';

import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * 이름 + 휴대폰 뒷 4자리로 본인 신청서를 찾는다.
 *
 * GET이 아니라 POST인 이유: 개인정보를 URL 쿼리스트링이나 서버 로그에
 * 남기지 않기 위해서다.
 *
 * 뒷 4자리는 경우의 수가 1만뿐이라 무제한 시도를 허용하면 타인의 신청서
 * (생년월일·전화번호 포함)가 열린다. 그래서 시도 횟수를 두 축으로 제한한다.
 *
 * - IP당 총량: 공유 IP(회사·학교·모바일 NAT) 뒤 여러 정상 사용자가 있을 수
 *   있으므로 여유 있게(20회) 둔다. 이것만 있으면 이름을 바꿔가며 시도하는
 *   공격을 막을 수 없다.
 * - 조회 대상(이름)당 시도: 특정인의 뒷 4자리(경우의 수 1만)를 전수 시도하는
 *   것을 막는 실제 방어선이므로 더 엄격하게(10회) 둔다. 이름은 요청 본문을
 *   검증한 뒤에만 정할 수 있으므로, 본문 검증을 먼저 통과시켜야 이 카운터를
 *   소비한다 — 그래야 잘못된 본문으로 이 카운터를 무료로 돌릴 수 없다.
 *
 * 둘 중 하나라도 소진되면 429를 돌려준다.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ error: '허용되지 않는 메소드입니다.', status: 405 });
  }

  const clubId = parseClubId(req.query.id);
  const tournamentId = firstQueryValue(req.query.tournamentId);
  if (!clubId || !tournamentId) {
    return res.status(400).json({ error: '잘못된 요청입니다.', status: 400 });
  }

  const ip = getClientIp({ 'x-forwarded-for': req.headers['x-forwarded-for'] });
  // 본문 없이도 계산 가능하므로 먼저 소비한다
  const byIp = consumeAttempt(`external-lookup:ip:${tournamentId}:${ip}`, {
    limit: 20,
  });
  if (!byIp.allowed) {
    return res.status(429).json({
      error: '조회 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.',
      status: 429,
    });
  }

  try {
    const parsed = externalLookupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.errors[0]?.message ?? '입력값이 올바르지 않습니다.',
        status: 400,
      });
    }

    const contactName = normalizeContactName(parsed.data.contactName);

    // 대상(이름)별 시도 횟수는 정규화된 이름으로 키를 잡는다.
    // "김 철수"와 "김철수"가 같은 카운터를 공유해야 우회가 안 된다.
    const byTarget = consumeAttempt(
      `external-lookup:target:${tournamentId}:${contactName}`,
      { limit: 10 }
    );
    if (!byTarget.allowed) {
      return res.status(429).json({
        error: '조회 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.',
        status: 429,
      });
    }

    // 이름으로 후보를 좁힌 뒤 뒷자리를 대조한다.
    // 뒷자리를 SQL에서 비교하지 않는 이유는 저장 포맷(하이픈)에 의존하지
    // 않기 위해서다. 이름이 같은 사람은 많아야 몇 명이라 부담이 없다.
    const candidates = await prisma.tournamentEntry.findMany({
      where: {
        tournamentId,
        isExternal: true,
        contactName,
        tournament: { clubId, allowExternalEntry: true },
      },
      include: {
        players: { orderBy: { order: 'asc' } },
        entryEvents: {
          include: {
            eventType: true,
            eventPlayers: { select: { entryPlayerId: true } },
          },
        },
      },
    });

    const entry = candidates.find((candidate) =>
      matchesPhoneTail(candidate.contactPhone ?? '', parsed.data.phoneTail)
    );

    if (!entry) {
      // 이름이 없는 경우와 뒷자리가 틀린 경우를 구분해 알리지 않는다.
      // 구분하면 어떤 이름이 신청했는지 떠볼 수 있다.
      return res.status(404).json({
        error: '신청 내역을 찾을 수 없습니다. 이름과 뒷자리를 확인해주세요.',
        status: 404,
      });
    }

    return res
      .status(200)
      .json({ data: { entry }, message: '신청 내역을 불러왔습니다.' });
  } catch (error) {
    return handleApiError(res, error);
  }
}
