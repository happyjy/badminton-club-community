import { describe, expect, it } from '@jest/globals';

import { validateWorkoutUpdate } from './validation';

const VALID = {
  title: '수요일 운동',
  description: '평일 운동',
  date: '2026-09-02',
  startTime: '19:00',
  endTime: '22:00',
  location: '체육관 A',
  maxParticipants: 20,
};

describe('validateWorkoutUpdate', () => {
  it('올바른 입력을 통과시킨다', () => {
    expect(validateWorkoutUpdate(VALID, 0)).toEqual({ ok: true });
  });

  it('제목이 비어 있으면 거부한다', () => {
    const result = validateWorkoutUpdate({ ...VALID, title: '  ' }, 0);
    expect(result).toEqual({ ok: false, error: '제목을 입력해주세요.' });
  });

  it('장소가 비어 있으면 거부한다', () => {
    const result = validateWorkoutUpdate({ ...VALID, location: '' }, 0);
    expect(result).toEqual({ ok: false, error: '장소를 입력해주세요.' });
  });

  it('날짜 형식이 올바르지 않으면 거부한다', () => {
    const result = validateWorkoutUpdate({ ...VALID, date: '2026/09/02' }, 0);
    expect(result).toEqual({
      ok: false,
      error: '날짜 형식이 올바르지 않습니다.',
    });
  });

  it('시간 형식이 올바르지 않으면 거부한다', () => {
    const result = validateWorkoutUpdate({ ...VALID, startTime: '7시' }, 0);
    expect(result).toEqual({
      ok: false,
      error: '시간 형식이 올바르지 않습니다.',
    });
  });

  it('종료 시간이 시작 시간과 같으면 거부한다', () => {
    const result = validateWorkoutUpdate(
      { ...VALID, startTime: '19:00', endTime: '19:00' },
      0
    );
    expect(result).toEqual({
      ok: false,
      error: '종료 시간은 시작 시간보다 이후여야 합니다.',
    });
  });

  it('종료 시간이 시작 시간보다 이르면 거부한다', () => {
    const result = validateWorkoutUpdate(
      { ...VALID, startTime: '22:00', endTime: '19:00' },
      0
    );
    expect(result).toEqual({
      ok: false,
      error: '종료 시간은 시작 시간보다 이후여야 합니다.',
    });
  });

  it('최대 인원이 0 이하이면 거부한다', () => {
    const result = validateWorkoutUpdate({ ...VALID, maxParticipants: 0 }, 0);
    expect(result).toEqual({
      ok: false,
      error: '최대 인원은 1명 이상이어야 합니다.',
    });
  });

  it('최대 인원이 정수가 아니면 거부한다', () => {
    const result = validateWorkoutUpdate({ ...VALID, maxParticipants: 3.5 }, 0);
    expect(result).toEqual({
      ok: false,
      error: '최대 인원은 1명 이상이어야 합니다.',
    });
  });

  it('최대 인원이 현재 참여 인원보다 적으면 거부한다', () => {
    const result = validateWorkoutUpdate({ ...VALID, maxParticipants: 5 }, 8);
    expect(result).toEqual({
      ok: false,
      error: '이미 참여한 인원(8명)보다 적게 설정할 수 없습니다.',
    });
  });

  it('최대 인원이 현재 참여 인원과 같으면 통과시킨다', () => {
    expect(validateWorkoutUpdate({ ...VALID, maxParticipants: 8 }, 8)).toEqual({
      ok: true,
    });
  });

  it('설명은 비어 있어도 통과시킨다', () => {
    expect(validateWorkoutUpdate({ ...VALID, description: '' }, 0)).toEqual({
      ok: true,
    });
  });
});
