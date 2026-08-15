import { z } from 'zod';

const eventOptionSchema = z.object({
  id: z.string().optional(),
  eventType: z.string().trim().min(1, '종목을 입력해주세요.'),
  ageGroup: z.string().trim().min(1, '연령을 입력해주세요.'),
  level: z.string().trim().default(''),
  playerCount: z.union([z.literal(1), z.literal(2)]),
  fee: z.number().int().min(0, '참가비는 0원 이상이어야 합니다.'),
  order: z.number().int().min(0).default(0),
});

export const tournamentInputSchema = z
  .object({
    title: z.string().trim().min(1, '대회명을 입력해주세요.'),
    hostName: z.string().trim().nullable().optional(),
    description: z.string().nullable().optional(),
    tournamentDate: z.string().trim().nullable().optional(),
    location: z.string().trim().nullable().optional(),
    applyStartAt: z.string().datetime().nullable().optional(),
    applyDeadline: z.string().datetime(),
    status: z.enum(['DRAFT', 'OPEN', 'CLOSED']),
    useTeamName: z.boolean(),
    tshirtSizes: z.array(z.string().trim().min(1)),
    bankAccount: z.string().trim().nullable().optional(),
    eventOptions: z
      .array(eventOptionSchema)
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
      const keys = input.eventOptions.map(
        (option) => `${option.eventType}|${option.ageGroup}|${option.level}`
      );
      return new Set(keys).size === keys.length;
    },
    { message: '중복된 종목 조합이 있습니다.', path: ['eventOptions'] }
  );

const playerSchema = z.object({
  key: z.string().min(1),
  name: z.string().trim().min(1, '선수 이름을 입력해주세요.'),
  gender: z.string().trim().min(1, '성별을 선택해주세요.'),
  birthDate: z.string().trim().min(1, '생년월일을 입력해주세요.'),
  phoneNumber: z.string().trim().min(1, '전화번호를 입력해주세요.'),
  tshirtSize: z.string().trim().nullable().optional(),
  order: z.number().int().min(0).default(0),
});

// fee/totalFee는 의도적으로 스키마에 없다.
// zod는 기본적으로 정의되지 않은 키를 제거하므로 클라이언트가 보내도 무시된다.
const entryEventSchema = z.object({
  eventOptionId: z.string().min(1),
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
