import { describe, expect, it } from '@jest/globals';

import { adminPlayerUpdateSchema } from './tournament.schema';

const VALID_PLAYER = {
  id: 'player-1',
  name: '홍길동',
  gender: '남',
  birthDate: '1990-01-01',
  phoneNumber: '010-1111-2222',
  tshirtSize: 'L',
};

describe('adminPlayerUpdateSchema', () => {
  it('정상 입력을 통과시킨다', () => {
    const result = adminPlayerUpdateSchema.safeParse({
      players: [VALID_PLAYER],
    });
    expect(result.success).toBe(true);
  });

  // 금액이 걸린 값이라 관리자 수정 경로로는 절대 넘어오면 안 된다.
  // zod는 정의되지 않은 키를 제거하므로 보내도 조용히 버려진다.
  it('isClubMember를 보내도 결과에 남지 않는다', () => {
    const result = adminPlayerUpdateSchema.parse({
      players: [{ ...VALID_PLAYER, isClubMember: true }],
    });
    expect('isClubMember' in result.players[0]).toBe(false);
  });

  it('order를 보내도 결과에 남지 않는다', () => {
    const result = adminPlayerUpdateSchema.parse({
      players: [{ ...VALID_PLAYER, order: 5 }],
    });
    expect('order' in result.players[0]).toBe(false);
  });

  it('전화번호 형식이 틀리면 거부한다', () => {
    const result = adminPlayerUpdateSchema.safeParse({
      players: [{ ...VALID_PLAYER, phoneNumber: '00012345678' }],
    });
    expect(result.success).toBe(false);
  });

  it('전화번호를 저장 포맷으로 정규화한다', () => {
    const result = adminPlayerUpdateSchema.parse({
      players: [{ ...VALID_PLAYER, phoneNumber: '01011112222' }],
    });
    expect(result.players[0].phoneNumber).toBe('010-1111-2222');
  });

  it('실재하지 않는 생년월일이면 거부한다', () => {
    const result = adminPlayerUpdateSchema.safeParse({
      players: [{ ...VALID_PLAYER, birthDate: '19901350' }],
    });
    expect(result.success).toBe(false);
  });

  it('생년월일을 저장 포맷으로 정규화한다', () => {
    const result = adminPlayerUpdateSchema.parse({
      players: [{ ...VALID_PLAYER, birthDate: '19900315' }],
    });
    expect(result.players[0].birthDate).toBe('1990-03-15');
  });

  it('이름이 비면 거부한다', () => {
    const result = adminPlayerUpdateSchema.safeParse({
      players: [{ ...VALID_PLAYER, name: '  ' }],
    });
    expect(result.success).toBe(false);
  });

  it('id가 없으면 거부한다', () => {
    const result = adminPlayerUpdateSchema.safeParse({
      players: [{ ...VALID_PLAYER, id: '' }],
    });
    expect(result.success).toBe(false);
  });

  it('빈 배열이면 거부한다', () => {
    const result = adminPlayerUpdateSchema.safeParse({ players: [] });
    expect(result.success).toBe(false);
  });
});
