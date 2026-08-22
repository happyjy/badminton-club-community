import { z } from 'zod';

import { isValidBirthDate, toIsoBirthDate } from '@/utils/birthDate';
import { formatPhoneNumber, isValidPhoneNumber } from '@/utils/phoneNumber';

const eventTypeSchema = z.object({
  // 폼의 hidden input이 신규 종목에 빈 문자열을 넣으므로 undefined로 정규화한다.
  // 그래야 서버가 '기존 종목 수정'이 아니라 '신규 생성'으로 분기한다.
  id: z
    .string()
    .optional()
    .transform((value) => (value ? value : undefined)),
  name: z.string().trim().min(1, '종목을 입력해주세요.'),
  playerCount: z.union([z.literal(1), z.literal(2)]),
  fee: z.number().int().min(0, '참가비는 0원 이상이어야 합니다.'),
  order: z.number().int().min(0).default(0),
});

export const tournamentInputSchema = z
  .object({
    title: z.string().trim().min(1, '대회명을 입력해주세요.'),
    hostName: z.string().trim().nullable().optional(),
    description: z.string().nullable().optional(),
    applyNotice: z.string().nullable().optional(),
    tournamentDate: z.string().trim().nullable().optional(),
    location: z.string().trim().nullable().optional(),
    applyStartAt: z.string().datetime().nullable().optional(),
    applyDeadline: z.string().datetime(),
    status: z.enum(['DRAFT', 'OPEN', 'CLOSED']),
    useTeamName: z.boolean(),
    tshirtSizes: z.array(z.string().trim().min(1)),
    bankAccount: z.string().trim().nullable().optional(),
    memberLabel: z.string().trim().nullable().optional(),
    nonMemberSurcharge: z
      .number()
      .int()
      .min(0, '추가금은 0원 이상이어야 합니다.')
      .default(0),
    ageGroups: z
      .array(z.string().trim().min(1))
      .min(1, '연령을 1개 이상 등록해주세요.'),
    // 급수를 쓰지 않는 대회도 있으므로 빈 배열을 허용한다
    levels: z.array(z.string().trim().min(1)),
    eventTypes: z
      .array(eventTypeSchema)
      .min(1, '종목을 1개 이상 등록해주세요.'),
  })
  .refine(
    (input) =>
      !input.applyStartAt ||
      new Date(input.applyDeadline) > new Date(input.applyStartAt),
    { message: '신청 마감은 시작보다 늦어야 합니다.', path: ['applyDeadline'] }
  )
  .refine(
    (input) => {
      const names = input.eventTypes.map((eventType) => eventType.name);
      return new Set(names).size === names.length;
    },
    { message: '중복된 종목이 있습니다.', path: ['eventTypes'] }
  )
  .refine((input) => new Set(input.ageGroups).size === input.ageGroups.length, {
    message: '중복된 연령이 있습니다.',
    path: ['ageGroups'],
  })
  .refine((input) => new Set(input.levels).size === input.levels.length, {
    message: '중복된 급수가 있습니다.',
    path: ['levels'],
  })
  // 추가금을 쓰면 신청 화면 체크박스에 표시할 기준 라벨이 반드시 필요하다
  .refine(
    (input) => input.nonMemberSurcharge === 0 || !!input.memberLabel?.trim(),
    {
      message: '추가금을 사용하려면 회원 기준 라벨을 입력해주세요.',
      path: ['memberLabel'],
    }
  );

const playerSchema = z.object({
  key: z.string().min(1),
  name: z.string().trim().min(1, '선수 이름을 입력해주세요.'),
  gender: z.string().trim().min(1, '성별을 선택해주세요.'),
  // min(1)만 검사하면 '99999999' 같은 값이 통과해 연령대 계산이 조용히 깨진다.
  // 저장 포맷('YYYY-MM-DD')으로 정규화한 뒤 실재하는 날짜인지까지 확인한다.
  birthDate: z
    .string()
    .trim()
    .min(1, '생년월일을 입력해주세요.')
    .transform(toIsoBirthDate)
    .refine(isValidBirthDate, '올바른 생년월일이 아닙니다.'),
  // 클라이언트가 숫자만 보내든 하이픈을 섞어 보내든 저장 포맷을 하나로 맞춘다.
  // 형식까지 확인해야 문자 발송(src/lib/sms.ts) 단계에서 뒤늦게 실패하지 않는다.
  phoneNumber: z
    .string()
    .trim()
    .min(1, '전화번호를 입력해주세요.')
    .refine(isValidPhoneNumber, '올바른 전화번호가 아닙니다.')
    .transform(formatPhoneNumber),
  tshirtSize: z.string().trim().nullable().optional(),
  // 추가금 미사용 대회에서는 서버가 항상 true로 덮으므로 기본값을 둔다
  isLocalMember: z.boolean().default(true),
  // 우리 클럽 소속 여부. 금액과 무관해 항상 그대로 저장한다.
  isClubMember: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});

// fee/totalFee는 의도적으로 스키마에 없다.
// zod는 기본적으로 정의되지 않은 키를 제거하므로 클라이언트가 보내도 무시된다.
const entryEventSchema = z.object({
  eventTypeId: z.string().min(1),
  ageGroup: z.string().trim().min(1, '연령을 선택해주세요.'),
  level: z.string().trim().default(''),
  playerKeys: z.array(z.string().min(1)).min(1).max(2),
});

export const entrySubmissionSchema = z.object({
  depositorName: z.string().trim().min(1, '입금자명을 입력해주세요.'),
  teamName: z.string().trim().nullable().optional(),
  privacyAgreed: z.literal(true, {
    errorMap: () => ({ message: '개인정보 수집·이용에 동의해주세요.' }),
  }),
  players: z.array(playerSchema).min(1, '선수를 1명 이상 등록해주세요.'),
  events: z.array(entryEventSchema).min(1, '종목을 1개 이상 선택해주세요.'),
});

export type TournamentInputParsed = z.infer<typeof tournamentInputSchema>;
export type EntrySubmissionParsed = z.infer<typeof entrySubmissionSchema>;
