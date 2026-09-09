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
  getPhoneLabel(): string;
}

// 클럽 멤버를 위한 전략
export class MemberStrategy implements GuestPageStrategy {
  private customDescription?: string;

  constructor(customDescription?: string) {
    this.customDescription = customDescription;
  }

  // 네비게이션 및 페이지 관련
  getNavMenuName(): string {
    return '게스트';
  }

  getPageTitle(): string {
    return '게스트 신청';
  }

  getDescription(): string {
    return (
      this.customDescription ||
      '이 클럽에 게스트로 참여하고 싶으시면 아래 버튼을 클릭하여 신청서를 작성해주세요.'
    );
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

  // 회원이 게스트를 대신 신청하므로 번호 주인은 게스트가 아니라 신청한 회원이다.
  getPhoneLabel(): string {
    return '신청자 연락처';
  }
}

// 비회원을 위한 전략
export class NonMemberStrategy implements GuestPageStrategy {
  private customDescription?: string;

  constructor(customDescription?: string) {
    this.customDescription = customDescription;
  }

  // 네비게이션 및 페이지 관련
  getNavMenuName(): string {
    return '가입신청';
  }

  getPageTitle(): string {
    return '클럽 가입신청';
  }

  getDescription(): string {
    return (
      this.customDescription ||
      `
◦ 이 클럽에 대해 문의하거나 방문 하셔서 분위기를 보고 싶으시면 싶으시면 아래 버튼을 클릭하여 신청서를 작성해주세요.
◦ 클럽 체육관 방문날짜를 확인하세요.
`
    );
  }

  getButtonText(): string {
    return '가입신청';
  }

  getHistoryTitle(): string {
    return '내 가입신청 내역';
  }

  // 모달 관련
  getModalTitle(isEditing: boolean): string {
    return isEditing ? '가입신청 내용 수정' : '클럽 가입신청';
  }

  getModalSubmitText(isEditing: boolean): string {
    return isEditing ? '수정하기' : '가입신청';
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
    return '클럽 가입신청 상세';
  }

  getDetailPageMessageTitle(): string {
    return '가입신청 메시지';
  }

  // 비회원은 본인이 직접 신청하므로 번호 주인이 곧 방문자다.
  getPhoneLabel(): string {
    return '전화번호';
  }
}

// 전략 팩토리 함수
export const getGuestPageStrategy = (
  isMember: boolean,
  customDescription?: string
): GuestPageStrategy => {
  return isMember
    ? new MemberStrategy(customDescription)
    : new NonMemberStrategy(customDescription);
};

/**
 * 이미 저장된 글의 종류로 전략을 고른다.
 *
 * 신청 폼은 "쓰는 사람이 회원인가"로 갈리지만, 상세 페이지는 그렇게 고르면 안 된다.
 * 보는 사람 기준으로 고르면 관리자(회원)가 열 때 가입신청 글까지
 * 게스트 신청으로 보인다. 글의 postType은 신청 시점에 고정된 값이라 흔들리지 않는다.
 *
 * postType이 없는 예전 글은 게스트 신청으로 본다(스키마 기본값과 같다).
 */
export const getGuestPageStrategyByPostType = (
  postType: 'GUEST_REQUEST' | 'JOIN_INQUIRY_REQUEST' | undefined,
  customDescription?: string
): GuestPageStrategy => {
  return getGuestPageStrategy(
    postType !== 'JOIN_INQUIRY_REQUEST',
    customDescription
  );
};
