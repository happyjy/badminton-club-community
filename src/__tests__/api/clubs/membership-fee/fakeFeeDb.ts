/**
 * 회비 API 핸들러 테스트용 메모리 DB.
 *
 * 핸들러가 부르는 Prisma 메소드를 흉내 내되, where 조건(동등 비교·in·not·OR)과
 * updateMany의 건수, 트랜잭션 롤백은 실제로 적용한다. 그래야 "상태 조건을 빠뜨린
 * update"나 "실패했는데 일부만 저장된" 경우가 테스트에서 드러난다.
 *
 * 쓰는 법:
 *   jest.mock('@/lib/prisma', () => ({
 *     prisma: jest.requireActual<typeof import('./fakeFeeDb')>('./fakeFeeDb').fakeDb.prisma,
 *   }));
 *   beforeEach(() => fakeDb.reset());
 */

type Row = Record<string, unknown>;
type Where = Record<string, unknown>;

export const CLUB_ID = 1;
export const ADMIN_USER_ID = 7;
export const ADMIN_MEMBER_ID = 900;

interface State {
  members: Row[];
  feeTypes: Row[];
  coupleGroups: Row[];
  coupleHistories: Row[];
  leaves: Row[];
  exemptions: Row[];
  batches: Row[];
  records: Row[];
  matched: Row[];
  payments: Row[];
}

const RATES_2026 = [
  {
    name: '일반',
    isActive: true,
    rates: [
      { year: 2026, period: 'MONTHLY', amount: 25000 },
      { year: 2026, period: 'ANNUAL', amount: 275000 },
    ],
  },
  {
    name: '부부',
    isActive: true,
    rates: [
      { year: 2026, period: 'MONTHLY', amount: 45000 },
      { year: 2026, period: 'ANNUAL', amount: 495000 },
    ],
  },
  {
    name: '가입비',
    isActive: true,
    rates: [{ year: 2026, period: 'MONTHLY', amount: 100000 }],
  },
];

function emptyState(): State {
  return {
    members: [
      {
        id: ADMIN_MEMBER_ID,
        clubId: CLUB_ID,
        userId: ADMIN_USER_ID,
        role: 'ADMIN',
        status: 'APPROVED',
        name: '관리자',
        feeObligationStartAt: new Date(2025, 0, 1),
        leftAt: null,
      },
    ],
    feeTypes: RATES_2026.map((type) => ({ ...type, clubId: CLUB_ID })),
    coupleGroups: [],
    coupleHistories: [],
    leaves: [],
    exemptions: [],
    batches: [],
    records: [],
    matched: [],
    payments: [],
  };
}

/** 관계로 거는 조건은 보지 않는다 (테스트의 클럽은 하나뿐이다) */
const RELATION_KEYS = new Set(['clubMember', 'matchedMembers', 'batch']);

function matchesCondition(value: unknown, condition: unknown): boolean {
  if (condition === null || typeof condition !== 'object') {
    return value === condition;
  }
  if (condition instanceof Date) {
    return value instanceof Date && value.getTime() === condition.getTime();
  }
  const cond = condition as Record<string, unknown>;
  if ('in' in cond && !(cond.in as unknown[]).includes(value)) return false;
  if ('not' in cond && matchesCondition(value, cond.not)) return false;
  const comparable = value as Date | number;
  if ('gte' in cond && !(comparable >= (cond.gte as Date | number))) {
    return false;
  }
  if ('lte' in cond && !(comparable <= (cond.lte as Date | number))) {
    return false;
  }
  if ('gt' in cond && !(comparable > (cond.gt as Date | number))) return false;
  if ('lt' in cond && !(comparable < (cond.lt as Date | number))) return false;
  return true;
}

function matches(row: Row, where: Where | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, condition]) => {
    if (condition === undefined) return true;
    if (key === 'OR') {
      return (condition as Where[]).some((sub) => matches(row, sub));
    }
    if (key === 'AND') {
      return (condition as Where[]).every((sub) => matches(row, sub));
    }
    if (RELATION_KEYS.has(key)) return true;
    return matchesCondition(row[key], condition);
  });
}

function createFakeFeeDb() {
  let state = emptyState();
  let sequence = 0;
  const nextId = (prefix: string) => `${prefix}-${++sequence}`;

  const memberSummary = (clubMemberId: unknown) => {
    const member = state.members.find((m) => m.id === clubMemberId);
    return member ? { id: member.id, name: member.name } : null;
  };

  /** 레코드에 관계를 붙여 돌려준다 (include를 가리지 않고 모두 붙인다) */
  const withRelations = (record: Row) => ({
    ...record,
    matchedMember:
      record.matchedMemberId == null
        ? null
        : memberSummary(record.matchedMemberId),
    matchedMembers: state.matched
      .filter((m) => m.paymentRecordId === record.id)
      .map((m) => ({ ...m, clubMember: memberSummary(m.clubMemberId) })),
    batch: state.batches.find((b) => b.id === record.batchId) ?? null,
    payments: state.payments.filter((p) => p.paymentRecordId === record.id),
    _count: {
      matchedMembers: state.matched.filter(
        (m) => m.paymentRecordId === record.id
      ).length,
    },
  });

  const newRecord = (data: Row): Row => ({
    id: nextId('rec'),
    status: 'PENDING',
    errorReason: null,
    memo: null,
    matchedMemberId: null,
    kind: 'FEE',
    kindReason: null,
    nonFeeAmount: 0,
    nonFeeKind: null,
    monthHints: null,
    needsReview: false,
    reviewReason: null,
    note: null,
    ...data,
  });

  const prisma = {
    clubMember: {
      findFirst: async ({ where }: { where?: Where } = {}) =>
        state.members.find((m) => matches(m, where)) ?? null,
      findUnique: async ({ where }: { where: Where }) => {
        // 복합 키(clubId_userId)는 풀어서 비교한다
        const flat = (where.clubId_userId as Where | undefined) ?? where;
        return state.members.find((m) => matches(m, flat)) ?? null;
      },
      findMany: async ({
        where,
        orderBy,
      }: { where?: Where; orderBy?: { name?: 'asc' | 'desc' } } = {}) => {
        const found = state.members.filter((m) => matches(m, where));
        return orderBy?.name
          ? [...found].sort((a, b) =>
              String(a.name ?? '').localeCompare(String(b.name ?? ''), 'ko-KR')
            )
          : found;
      },
      update: async ({ where, data }: { where: Where; data: Row }) => {
        // 복합 키(clubId_userId)는 풀어서 비교한다
        const flat = (where.clubId_userId as Where | undefined) ?? where;
        const member = state.members.find((m) => matches(m, flat));
        if (!member) throw new Error('없는 회원');
        Object.assign(member, data);
        return { ...member };
      },
    },
    feeType: {
      findMany: async ({ where }: { where?: Where } = {}) =>
        state.feeTypes.filter((t) => matches(t, where)),
    },
    coupleGroup: { findMany: async () => state.coupleGroups },
    coupleHistory: { findMany: async () => state.coupleHistories },
    memberLeave: {
      findMany: async ({ where }: { where?: Where } = {}) =>
        state.leaves.filter((l) => matches(l, where)),
      findFirst: async ({ where }: { where?: Where } = {}) =>
        state.leaves.find((l) => matches(l, where)) ?? null,
      create: async ({ data }: { data: Row }) => {
        const leave = {
          id: state.leaves.length + 1,
          createdAt: new Date(),
          ...data,
        };
        state.leaves.push(leave);
        return { ...leave };
      },
      update: async ({ where, data }: { where: Where; data: Row }) => {
        const leave = state.leaves.find((l) => matches(l, where));
        if (!leave) throw new Error('없는 휴회 기간');
        Object.assign(leave, data);
        return { ...leave };
      },
    },
    feeExemption: {
      findMany: async ({ where }: { where?: Where } = {}) =>
        state.exemptions.filter((e) => matches(e, where)),
    },
    paymentUploadBatch: {
      findFirst: async () => {
        const latest = [...state.batches].sort(
          (a, b) =>
            (b.uploadedAt as Date).getTime() - (a.uploadedAt as Date).getTime()
        )[0];
        return latest ? { ...latest, uploadedBy: { name: '관리자' } } : null;
      },
      create: async ({ data }: { data: Row }) => {
        const batch = { id: nextId('batch'), uploadedAt: new Date(), ...data };
        state.batches.push(batch);
        return batch;
      },
    },
    paymentRecord: {
      findMany: async ({ where }: { where?: Where } = {}) =>
        state.records.filter((r) => matches(r, where)).map(withRelations),
      findFirst: async ({ where }: { where?: Where } = {}) => {
        const record = state.records.find((r) => matches(r, where));
        return record ? withRelations(record) : null;
      },
      findUnique: async ({ where }: { where: Where }) => {
        const record = state.records.find((r) => matches(r, where));
        return record ? withRelations(record) : null;
      },
      count: async ({ where }: { where?: Where } = {}) =>
        state.records.filter((r) => matches(r, where)).length,
      aggregate: async ({ where }: { where?: Where } = {}) => {
        const times = state.records
          .filter((r) => matches(r, where))
          .map((r) => (r.transactionDate as Date).getTime());
        return {
          _max: {
            transactionDate: times.length ? new Date(Math.max(...times)) : null,
          },
        };
      },
      createManyAndReturn: async ({ data }: { data: Row[] }) => {
        const created = data.map(newRecord);
        state.records.push(...created);
        return created.map((record) => ({ ...record }));
      },
      update: async ({ where, data }: { where: Where; data: Row }) => {
        const record = state.records.find((r) => matches(r, where));
        if (!record) throw new Error('없는 입금 내역');
        Object.assign(
          record,
          Object.fromEntries(
            Object.entries(data).filter(([, value]) => value !== undefined)
          )
        );
        return withRelations(record);
      },
      updateMany: async ({ where, data }: { where?: Where; data: Row }) => {
        const targets = state.records.filter((r) => matches(r, where));
        targets.forEach((record) => Object.assign(record, data));
        return { count: targets.length };
      },
    },
    paymentRecordMatchedMember: {
      findMany: async ({ where }: { where?: Where } = {}) =>
        state.matched.filter((m) => matches(m, where)),
      createMany: async ({ data }: { data: Row[] }) => {
        state.matched.push(
          ...data.map((row) => ({ id: nextId('mm'), ...row }))
        );
        return { count: data.length };
      },
      deleteMany: async ({ where }: { where?: Where } = {}) => {
        const before = state.matched.length;
        state.matched = state.matched.filter((m) => !matches(m, where));
        return { count: before - state.matched.length };
      },
    },
    membershipPayment: {
      findMany: async ({ where }: { where?: Where } = {}) =>
        state.payments.filter((p) => matches(p, where)),
      create: async ({ data }: { data: Row }) => {
        const payment = { id: nextId('pay'), period: 'MONTHLY', ...data };
        state.payments.push(payment);
        return payment;
      },
      update: async ({ where, data }: { where: Where; data: Row }) => {
        const payment = state.payments.find((p) => matches(p, where));
        if (!payment) throw new Error('없는 납부 내역');
        Object.assign(payment, data);
        return { ...payment };
      },
      updateMany: async ({ where, data }: { where?: Where; data: Row }) => {
        const targets = state.payments.filter((p) => matches(p, where));
        targets.forEach((payment) => Object.assign(payment, data));
        return { count: targets.length };
      },
      deleteMany: async ({ where }: { where?: Where } = {}) => {
        const before = state.payments.length;
        state.payments = state.payments.filter((p) => !matches(p, where));
        return { count: before - state.payments.length };
      },
    },
    /** 회원 행 잠금(SELECT … FOR UPDATE) 같은 날 쿼리. 메모리 DB에서는 할 일이 없다 */
    $queryRaw: async () => [] as unknown[],
    /** 함수가 던지면 그 안에서 바꾼 것을 모두 되돌린다 */
    $transaction: async <T>(run: (tx: unknown) => Promise<T>): Promise<T> => {
      const snapshot = structuredClone(state);
      try {
        return await run(prisma);
      } catch (error) {
        state = snapshot;
        throw error;
      }
    },
  };

  return {
    prisma,
    get state() {
      return state;
    },
    reset() {
      state = emptyState();
      sequence = 0;
    },
    /** 일반 회원을 넣는다. 기본은 2025년 1월부터 의무인 활동 회원 */
    addMember(member: Row & { id: number; name: string }) {
      state.members.push({
        clubId: CLUB_ID,
        userId: member.id + 1000,
        role: 'MEMBER',
        status: 'APPROVED',
        feeObligationStartAt: new Date(2025, 0, 1),
        leftAt: null,
        ...member,
      });
    },
    /** 부부로 묶는다 (그룹과 이력 모두) */
    addCouple(a: number, b: number, startedAt = new Date(2025, 0, 1)) {
      const clubMember = (id: number) =>
        state.members.find((m) => m.id === id) as Row;
      state.coupleGroups.push({
        id: state.coupleGroups.length + 1,
        clubId: CLUB_ID,
        members: [a, b].map((id) => ({
          clubMemberId: id,
          clubMember: clubMember(id),
        })),
      });
      state.coupleHistories.push(
        { clubMemberId: a, partnerClubMemberId: b, startedAt, endedAt: null },
        { clubMemberId: b, partnerClubMemberId: a, startedAt, endedAt: null }
      );
    },
    /** 입금 내역을 넣는다. memberIds를 주면 매칭 회원도 함께 넣는다 */
    addRecord(data: Row & { memberIds?: number[] }): string {
      const { memberIds = [], ...fields } = data;
      const record = newRecord({
        batchId: 'batch-seed',
        clubId: CLUB_ID,
        transactionDate: new Date(2026, 4, 10, 10),
        depositorName: '가나다',
        amount: 25000,
        matchedMemberId: memberIds[0] ?? null,
        ...fields,
      });
      state.records.push(record);
      state.matched.push(
        ...memberIds.map((clubMemberId) => ({
          id: nextId('mm'),
          paymentRecordId: record.id,
          clubMemberId,
        }))
      );
      return record.id as string;
    },
    /** 납부 내역을 넣고 그 id를 돌려준다 */
    addPayment(
      data: Row & { clubMemberId: number; year: number; month: number }
    ): string {
      const id = nextId('pay');
      state.payments.push({
        id,
        amount: 25000,
        period: 'MONTHLY',
        paymentRecordId: 'rec-seed',
        ...data,
      });
      return id;
    },
    /** 휴회 기간을 넣는다. 끝을 주지 않으면 그 달 하루만 */
    addLeave(
      clubMemberId: number,
      start: { year: number; month: number },
      end: { year: number; month: number } | null = start
    ) {
      state.leaves.push({
        id: state.leaves.length + 1,
        clubMemberId,
        startYear: start.year,
        startMonth: start.month,
        endYear: end?.year ?? null,
        endMonth: end?.month ?? null,
        reason: null,
        createdAt: new Date(),
      });
    },
    payment(id: string) {
      return state.payments.find((p) => p.id === id) as Row;
    },
    record(id: string) {
      return state.records.find((r) => r.id === id) as Row;
    },
  };
}

export const fakeDb = createFakeFeeDb();

/** 핸들러 테스트용 응답 객체 */
export function buildRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    send(payload: unknown) {
      this.body = payload;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
  };
  return res;
}
