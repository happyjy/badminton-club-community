/**
 * 생년월일 문자열로부터 연령대를 계산하는 함수
 * @param birthDate 'YYYY-MM-DD' 형식의 생년월일 문자열
 * @returns '20대', '30대' 등의 연령대 문자열 또는 '정보없음'
 */
export const calculateAgeGroup = (birthDate?: string): string => {
  if (!birthDate) return '정보없음';

  try {
    const year = parseInt(birthDate.split('-')[0]);
    const currentYear = new Date().getFullYear();
    const age = currentYear - year;

    const ageGroup = Math.floor(age / 10) * 10;
    return `${ageGroup}대`;
  } catch {
    return '정보없음';
  }
};
