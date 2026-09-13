/** 클럽 단위 주차 설정 */
export interface ClubParkingSettingsResponse {
  parkingEnabled: boolean;
  parkingWeekdayCapacity: number;
  parkingWeekendCapacity: number;
  parkingSmsEnabled: boolean;
}

/** 운동 카드·상세에 내려주는 주차 현황 */
export interface WorkoutParkingStatus {
  /** 클럽 설정이 꺼져 있으면 false. 이때 화면에 주차 영역을 그리지 않는다 */
  enabled: boolean;
  /** 이 운동에 적용되는 유효 정원 */
  capacity: number;
  /** 확정 인원 수 */
  confirmedCount: number;
  /** 대기 인원 수 */
  waitlistCount: number;
  /** 이 운동에 그날 지정값이 있는지. null이면 클럽 기본값을 따르는 중 */
  overrideCapacity: number | null;
  /** 로그인한 회원 본인의 상태 */
  myStatus: 'NONE' | 'CONFIRMED' | 'WAITLIST';
  /** 본인이 대기 중일 때 몇 번째인지. 대기가 아니면 null */
  myWaitlistOrder: number | null;
}

/** 관리자 명단에 쓰는 한 줄 */
export interface ParkingRequestListItem {
  id: number;
  clubMemberId: number;
  name: string;
  status: 'CONFIRMED' | 'WAITLIST';
  position: number;
}
