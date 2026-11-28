export interface ClubHomeSettings {
  clubOperatingTime?: string;
  clubLocation?: string;
  clubDescription?: string;
}

export interface GuestPageSettings {
  inquiryDescription?: string;
  guestDescription?: string;
}

export interface EmailSettings {
  emailRecipients: string[];
}

export interface SmsSettings {
  smsRecipients: string[];
}

export interface MenuSettings {
  tournamentMenuEnabled: boolean;
  /** 회비를 앱으로 관리하는 클럽인가 (활성 회비 유형이 있음). 조회 응답에만 있다 */
  feeMenuEnabled?: boolean;
}

export interface ClubCustomSettings {
  clubHome: ClubHomeSettings;
  guestPage: GuestPageSettings;
  email: EmailSettings;
  sms: SmsSettings;
  menu: MenuSettings;
}
