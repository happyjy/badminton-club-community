/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  MemberStrategy,
  NonMemberStrategy,
  getGuestPageStrategy,
} from './GuestPageStrategy';

// Jest 글로벌 함수를 TypeScript에게 알려줍니다
declare const describe: (name: string, fn: () => void) => void;
declare const beforeEach: (fn: () => void) => void;
declare const test: (name: string, fn: () => void) => void;
declare const expect: any;

describe('GuestPageStrategy', () => {
  describe('MemberStrategy', () => {
    let strategy: MemberStrategy;

    beforeEach(() => {
      strategy = new MemberStrategy();
    });

    test('getNavMenuName should return 게스트', () => {
      expect(strategy.getNavMenuName()).toBe('게스트');
    });

    test('getPageTitle should return 게스트 신청', () => {
      expect(strategy.getPageTitle()).toBe('게스트 신청');
    });

    test('getDescription should return correct text', () => {
      expect(strategy.getDescription()).toContain('게스트로 참여하고 싶으시면');
    });

    test('getButtonText should return 게스트 신청하기', () => {
      expect(strategy.getButtonText()).toBe('게스트 신청하기');
    });

    test('getHistoryTitle should return 내 게스트 신청 내역', () => {
      expect(strategy.getHistoryTitle()).toBe('내 게스트 신청 내역');
    });

    test('getModalTitle should return 게스트 신청 when not editing', () => {
      expect(strategy.getModalTitle(false)).toBe('게스트 신청');
    });

    test('getModalTitle should return 게스트 신청 수정 when editing', () => {
      expect(strategy.getModalTitle(true)).toBe('게스트 신청 수정');
    });

    test('getModalSubmitText should return 신청하기 when not editing', () => {
      expect(strategy.getModalSubmitText(false)).toBe('신청하기');
    });

    test('getModalSubmitText should return 수정하기 when editing', () => {
      expect(strategy.getModalSubmitText(true)).toBe('수정하기');
    });

    test('getModalDescription should return correct text', () => {
      expect(strategy.getModalDescription()).toContain(
        '게스트로 참여하고 싶으시면'
      );
    });

    test('getMessageFieldLabel should return 가입 문의', () => {
      expect(strategy.getMessageFieldLabel()).toBe('가입 문의');
    });

    test('getMessagePlaceholder should return correct text', () => {
      expect(strategy.getMessagePlaceholder()).toContain(
        '클럽에 전달할 메시지나 문의사항'
      );
    });

    test('getDetailPageTitle should return 게스트 신청 상세', () => {
      expect(strategy.getDetailPageTitle()).toBe('게스트 신청 상세');
    });

    test('getDetailPageMessageTitle should return 신청 메시지', () => {
      expect(strategy.getDetailPageMessageTitle()).toBe('신청 메시지');
    });
  });

  describe('NonMemberStrategy', () => {
    let strategy: NonMemberStrategy;

    beforeEach(() => {
      strategy = new NonMemberStrategy();
    });

    test('getNavMenuName should return 문의하기', () => {
      expect(strategy.getNavMenuName()).toBe('문의하기');
    });

    test('getPageTitle should return 클럽 문의하기', () => {
      expect(strategy.getPageTitle()).toBe('클럽 문의하기');
    });

    test('getDescription should return correct text', () => {
      expect(strategy.getDescription()).toContain(
        '문의하거나 게스트로 참여하고 싶으시면'
      );
    });

    test('getButtonText should return 문의하기', () => {
      expect(strategy.getButtonText()).toBe('문의하기');
    });

    test('getHistoryTitle should return 내 문의 내역', () => {
      expect(strategy.getHistoryTitle()).toBe('내 문의 내역');
    });

    test('getModalTitle should return 클럽 문의하기 when not editing', () => {
      expect(strategy.getModalTitle(false)).toBe('클럽 문의하기');
    });

    test('getModalTitle should return 문의 내용 수정 when editing', () => {
      expect(strategy.getModalTitle(true)).toBe('문의 내용 수정');
    });

    test('getModalSubmitText should return 문의하기 when not editing', () => {
      expect(strategy.getModalSubmitText(false)).toBe('문의하기');
    });

    test('getModalSubmitText should return 수정하기 when editing', () => {
      expect(strategy.getModalSubmitText(true)).toBe('수정하기');
    });

    test('getModalDescription should return correct text', () => {
      expect(strategy.getModalDescription()).toContain(
        '클럽 가입에 대해 문의하고'
      );
    });

    test('getMessageFieldLabel should return 문의 내용', () => {
      expect(strategy.getMessageFieldLabel()).toBe('문의 내용');
    });

    test('getMessagePlaceholder should return correct text', () => {
      expect(strategy.getMessagePlaceholder()).toContain(
        '클럽에 대한 문의사항이나 방문 시'
      );
    });

    test('getDetailPageTitle should return 클럽 문의 상세', () => {
      expect(strategy.getDetailPageTitle()).toBe('클럽 문의 상세');
    });

    test('getDetailPageMessageTitle should return 문의 메시지', () => {
      expect(strategy.getDetailPageMessageTitle()).toBe('문의 메시지');
    });
  });

  describe('getGuestPageStrategy factory', () => {
    test('should return MemberStrategy when user is a member', () => {
      const strategy = getGuestPageStrategy(true);
      expect(strategy).toBeInstanceOf(MemberStrategy);
    });

    test('should return NonMemberStrategy when user is not a member', () => {
      const strategy = getGuestPageStrategy(false);
      expect(strategy).toBeInstanceOf(NonMemberStrategy);
    });
  });
});
