// 종목 옵션 입력 시 제공하는 기본 선택지.
// DB에는 자유 문자열로 저장되므로 여기 없는 값도 '기타'로 입력할 수 있다.
// 주최측마다 표기가 달라 enum으로 고정하지 않는다.

export const EVENT_TYPE_PRESETS = [
  '남자복식',
  '여자복식',
  '혼합복식',
  '남자단식',
  '여자단식',
];

export const AGE_GROUP_PRESETS = [
  '20대부',
  '30대부',
  '40대부',
  '50대부',
  '60대부',
];

export const LEVEL_PRESETS = ['A조', 'B조', 'C조', 'D조', '초심'];

/** '기타 직접입력'을 나타내는 내부 센티넬. 실제 저장값이 아니다. */
export const CUSTOM_VALUE = '__CUSTOM__';

/** 종목명에 '복식'이 들어가면 2명, 아니면 1명으로 추정한다. */
export function guessPlayerCount(eventType: string): 1 | 2 {
  return eventType.includes('복식') ? 2 : 1;
}
