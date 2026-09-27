/**
 * 운동 일정의 유효 주차 정원을 구한다.
 *
 * 정원은 세 군데에 흩어져 있다: 그날 지정값, 주말 기본값, 평일 기본값.
 * 어느 값을 쓸지 판정하는 코드는 이 파일에만 존재한다.
 * 나중에 요일별 설정이나 기간 한정 규칙이 필요해지면 이 함수 내부만 바꾸면 되고,
 * 호출하는 쪽(API·화면·배정 로직)은 손대지 않는다.
 */

export type WorkoutCapacityInput = {
  date: Date | string;
  parkingCapacity: number | null;
};

export type ClubParkingSettings = {
  parkingWeekdayCapacity: number;
  parkingWeekendCapacity: number;
};

/**
 * 주말(토·일) 운동인지 판정한다.
 *
 * 이 레포는 운동 시간을 "벽시계 시각을 UTC 슬롯에 그대로 담는" 방식으로 저장한다
 * (src/lib/workout/datetime.ts 참고). 따라서 getDay()가 아니라 getUTCDay()를 써야
 * 서버 타임존과 무관하게 같은 요일이 나온다.
 */
export function isWeekendWorkout(date: Date | string): boolean {
  const day = new Date(date).getUTCDay();
  return day === 0 || day === 6; // 0=일요일, 6=토요일
}

/**
 * 구체적인 쪽이 이긴다: 그날 지정값 > 요일별 기본값.
 *
 * parkingCapacity의 0과 null은 다르다.
 * 0은 "그날은 주차 자리가 없음"을 관리자가 명시한 상태이고,
 * null은 "따로 정하지 않았으니 클럽 기본값을 따름"이다.
 */
export function resolveParkingCapacity(
  workout: WorkoutCapacityInput,
  settings: ClubParkingSettings | null
): number {
  if (workout.parkingCapacity !== null) {
    return workout.parkingCapacity;
  }
  if (!settings) {
    return 0;
  }
  return isWeekendWorkout(workout.date)
    ? settings.parkingWeekendCapacity
    : settings.parkingWeekdayCapacity;
}
