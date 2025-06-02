// GuestPageStrategy.ts - 게스트 페이지를 위한 전략 패턴 인터페이스와 구현

// 전략 인터페이스 정의
export interface GuestPageStrategy {
  // 네비게이션 및 페이지 관련
  getNavMenuName(): string;
  getPageTitle(): string;
  getDescription(): string;
  getButtonText(): string;
  getHistoryTitle(): string;

  // 모달 관련
  getModalTitle(isEditing: boolean): string;
  getModalSubmitText(isEditing: boolean): string;
  getModalDescription(): string;
  getMessageFieldLabel(): string;
  getMessagePlaceholder(): string;

  // 상세 페이지 관련
  getDetailPageTitle(): string;
  getDetailPageMessageTitle(): string;
}

// 클럽 멤버를 위한 전략
export class MemberStrategy implements GuestPageStrategy {
  // 네비게이션 및 페이지 관련
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

  // 모달 관련
  getModalTitle(isEditing: boolean): string {
    return isEditing ? '게스트 신청 수정' : '게스트 신청';
  }

  getModalSubmitText(isEditing: boolean): string {
    return isEditing ? '수정하기' : '신청하기';
  }

  getModalDescription(): string {
    return '게스트로 참여하고 싶으시면 아래 양식을 작성해주세요.';
  }

  getMessageFieldLabel(): string {
    return '가입 문의';
  }

  getMessagePlaceholder(): string {
    return '클럽에 전달할 메시지나 문의사항을 입력해주세요';
  }

  // 상세 페이지 관련
  getDetailPageTitle(): string {
    return '게스트 신청 상세';
  }

  getDetailPageMessageTitle(): string {
    return '신청 메시지';
  }
}

// 비회원을 위한 전략
export class NonMemberStrategy implements GuestPageStrategy {
  // 네비게이션 및 페이지 관련
  getNavMenuName(): string {
    return '문의하기';
  }

  getPageTitle(): string {
    return '클럽 문의하기';
  }

  getDescription(): string {
    return ` 
◦ 이 클럽에 대해 문의하거나 방문 하셔서 분위기를 보고 싶으시면 싶으시면 아래 버튼을 클릭하여 신청서를 작성해주세요.
◦ 클럽 체육관 방문날짜를 넣으세요 (평일 오후8-10시, 주말 공휴일 오후4-6시)
◦ 방문 시 학교 후문으로 와서 체육관 입구를 지나 3층으로 오세요 (입구에 비번있음)`;
  }

  getButtonText(): string {
    return '문의하기';
  }

  getHistoryTitle(): string {
    return '내 문의 내역';
  }

  // 모달 관련
  getModalTitle(isEditing: boolean): string {
    return isEditing ? '문의 내용 수정' : '클럽 문의하기';
  }

  getModalSubmitText(isEditing: boolean): string {
    return isEditing ? '수정하기' : '문의하기';
  }

  getModalDescription(): string {
    return '클럽 가입에 대해 문의하고 싶은 내용을 아래 양식을 작성해주세요.';
  }

  getMessageFieldLabel(): string {
    return '문의 내용';
  }

  getMessagePlaceholder(): string {
    return '클럽에 대한 문의사항이나 방문 시 요청사항을 입력해주세요';
  }

  // 상세 페이지 관련
  getDetailPageTitle(): string {
    return '클럽 문의 상세';
  }

  getDetailPageMessageTitle(): string {
    return '문의 메시지';
  }
}

// 전략 팩토리 함수
export const getGuestPageStrategy = (isMember: boolean): GuestPageStrategy => {
  return isMember ? new MemberStrategy() : new NonMemberStrategy();
};
