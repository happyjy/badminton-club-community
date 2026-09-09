import { toDisplayPhoneNumber } from '@/utils/phoneNumber';

interface PhoneNumberTextProps {
  /** DB에 저장된 전화번호. 형식이 어긋나 있을 수 있다. */
  value?: string | null;
  /** 번호가 비어 있을 때 대신 보여줄 문구. */
  fallback?: string;
}

/**
 * 저장된 전화번호를 화면에 보여주는 컴포넌트
 *
 * 하이픈이 빠졌을 뿐인 값은 정규화해서 보여주고, 자리 수가 맞지 않아
 * 신뢰할 수 없는 값은 원본 그대로 두고 확인이 필요하다고 표시한다.
 * 임의로 잘라내면 근거 없는 번호가 정상처럼 보여 잘못된 연락으로 이어진다.
 */
function PhoneNumberText({ value, fallback = '-' }: PhoneNumberTextProps) {
  const { text, isMalformed } = toDisplayPhoneNumber(value);

  if (!text) return <>{fallback}</>;

  if (!isMalformed) return <>{text}</>;

  return (
    <span className="inline-flex items-center gap-1">
      <span>{text}</span>
      <span
        title="전화번호 형식이 올바르지 않습니다. 확인이 필요합니다."
        className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800"
      >
        확인 필요
      </span>
    </span>
  );
}

export default PhoneNumberText;
