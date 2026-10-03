import { describe, expect, it } from '@jest/globals';

import { toEntryGender } from '@/components/organisms/tournament/entry/entryFormTypes';

describe('toEntryGender — 회원 정보의 성별을 대회 신청 폼의 선택지로 바꾼다', () => {
  it('회원 정보의 "남성"·"여성"을 신청 폼의 "남"·"여"로 바꾼다', () => {
    expect(toEntryGender('남성')).toBe('남');
    expect(toEntryGender('여성')).toBe('여');
  });

  it('이미 신청 폼의 값이면 그대로 둔다', () => {
    expect(toEntryGender('남')).toBe('남');
    expect(toEntryGender('여')).toBe('여');
  });

  it('영문 값도 받아들인다', () => {
    expect(toEntryGender('MALE')).toBe('남');
    expect(toEntryGender('FEMALE')).toBe('여');
  });

  it('없거나 알 수 없는 값이면 비워 둔다 (직접 고르게)', () => {
    expect(toEntryGender(null)).toBe('');
    expect(toEntryGender(undefined)).toBe('');
    expect(toEntryGender('')).toBe('');
    expect(toEntryGender('기타')).toBe('');
  });
});
