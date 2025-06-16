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

export interface ClubCustomSettings {
  clubHome: ClubHomeSettings;
  guestPage: GuestPageSettings;
  email: EmailSettings;
  sms: SmsSettings;
}
