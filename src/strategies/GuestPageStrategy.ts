// GuestPageStrategy.ts - 게스트 페이지를 위한 전략 패턴 인터페이스와 구현

// 전략 인터페이스 정의
export interface GuestPageStrategy {
  getNavMenuName(): string;
  getPageTitle(): string;
  getDescription(): string;
  getButtonText(): string;
  getHistoryTitle(): string;
}

// 클럽 멤버를 위한 전략
export class MemberStrategy implements GuestPageStrategy {
  getNavMenuName(): string {
    return '게스트';
  }

  getPageTitle(): string {
    return '게스트 신청';
  }

  getDescription(): string {
    return '이 클럽에 게스트로 참여하고 싶으시면 아래 버튼을 클릭하여 신청서를 작성해주세요.';
  }

  getButtonText(): string {
    return '게스트 신청하기';
  }

  getHistoryTitle(): string {
    return '내 게스트 신청 내역';
  }
}

// 비회원을 위한 전략
export class NonMemberStrategy implements GuestPageStrategy {
  getNavMenuName(): string {
    return '문의하기';
  }

  getPageTitle(): string {
    return '클럽 문의하기';
  }

  getDescription(): string {
    return '이 클럽에 대해 문의하거나 게스트로 참여하고 싶으시면 아래 버튼을 클릭하여 신청서를 작성해주세요.';
  }

  getButtonText(): string {
    return '문의하기';
  }

  getHistoryTitle(): string {
    return '내 문의 내역';
  }
}

// 전략 팩토리 함수
export const getGuestPageStrategy = (isMember: boolean): GuestPageStrategy => {
  return isMember ? new MemberStrategy() : new NonMemberStrategy();
};
