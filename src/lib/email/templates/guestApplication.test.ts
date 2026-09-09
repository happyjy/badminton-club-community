/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateGuestApplicationEmailTemplate } from './guestApplication';

// Jest 글로벌 함수를 TypeScript에게 알려줍니다
declare const describe: (name: string, fn: () => void) => void;
declare const test: (name: string, fn: () => void) => void;
declare const expect: any;

const APPLICATION = {
  id: 'post-1',
  name: '홍길동',
  birthDate: '1990-01-01',
  phoneNumber: '010-1111-2222',
  gender: '남',
  localTournamentLevel: 'A',
  nationalTournamentLevel: 'B',
  lessonPeriod: '6개월',
  playingPeriod: '2년',
  intendToJoin: true,
  visitDate: '2026-09-20',
  message: '잘 부탁드립니다',
  postType: 'GUEST_REQUEST',
} as any;

const URL = 'https://example.com/clubs/1/guest/post-1';

describe('generateGuestApplicationEmailTemplate', () => {
  // 게스트 신청은 회원이 남의 방문을 대신 신청하므로 번호 주인이 게스트가 아니다.
  // 관리자가 이 메일만 보고 연락하므로 누구 번호인지 드러나야 한다.
  test('게스트 신청은 연락처를 신청자 연락처로 적는다', () => {
    const html = generateGuestApplicationEmailTemplate(APPLICATION, URL);
    expect(html).toContain('신청자 연락처');
  });

  test('가입신청은 연락처를 전화번호로 적는다', () => {
    const html = generateGuestApplicationEmailTemplate(
      { ...APPLICATION, postType: 'JOIN_INQUIRY_REQUEST' },
      URL
    );
    expect(html).toContain('전화번호');
    expect(html).not.toContain('신청자 연락처');
  });

  test('라벨이 바뀌어도 번호 자체는 그대로 담는다', () => {
    const html = generateGuestApplicationEmailTemplate(APPLICATION, URL);
    expect(html).toContain('010-1111-2222');
  });
});
