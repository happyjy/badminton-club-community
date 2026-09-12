import { Input } from '@/components/atoms/inputs/Input';

interface PhoneInputGroupProps {
  values: {
    first: string;
    second: string;
    third: string;
  };
  onChange: (
    e: React.ChangeEvent<HTMLInputElement>,
    part: 'first' | 'second' | 'third'
  ) => void;
  required?: boolean;
}

export function PhoneInputGroup({
  values,
  onChange,
  required = false,
}: PhoneInputGroupProps) {
  // maxLength를 두지 않는다. 자동완성이 '+82 10-6636-8962'를 한 칸에 채울 때
  // 브라우저가 원문을 먼저 잘라 '+82'만 남기면, 핸들러가 숫자를 되찾을 수 없다.
  // 자리 수 제한은 onChange에서 처리한다.
  //
  // 칸 너비를 고정하지 않고 자리 수 비율(3:4:4)로 나눠 갖는다. 고정 폭이면
  // 좁은 화면에서 옆의 인증 버튼과 함께 모달을 넘쳐 가로 스크롤이 생긴다.
  // min-w-0을 함께 두어야 flex 항목이 콘텐츠 폭 아래로 줄어든다.
  return (
    <div className="mt-1 flex min-w-0 gap-2">
      <Input
        id="phone-first"
        type="tel"
        autoComplete="tel"
        value={values.first}
        onChange={(e) => onChange(e, 'first')}
        placeholder="010"
        className="w-full min-w-0 flex-[3] text-center"
        fullWidth={false}
        required={required}
      />
      <span className="flex shrink-0 items-center">-</span>
      <Input
        id="phone-second"
        type="tel"
        value={values.second}
        onChange={(e) => onChange(e, 'second')}
        placeholder="0000"
        className="w-full min-w-0 flex-[4] text-center"
        fullWidth={false}
        required={required}
      />
      <span className="flex shrink-0 items-center">-</span>
      <Input
        id="phone-third"
        type="tel"
        value={values.third}
        onChange={(e) => onChange(e, 'third')}
        placeholder="0000"
        className="w-full min-w-0 flex-[4] text-center"
        fullWidth={false}
        required={required}
      />
    </div>
  );
}
