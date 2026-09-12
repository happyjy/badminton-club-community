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
  return (
    <div className="mt-1 flex gap-2">
      <Input
        id="phone-first"
        type="tel"
        autoComplete="tel"
        value={values.first}
        onChange={(e) => onChange(e, 'first')}
        placeholder="010"
        className="w-20 text-center"
        fullWidth={false}
        required={required}
      />
      <span className="flex items-center">-</span>
      <Input
        id="phone-second"
        type="tel"
        value={values.second}
        onChange={(e) => onChange(e, 'second')}
        placeholder="0000"
        className="w-24 text-center"
        fullWidth={false}
        required={required}
      />
      <span className="flex items-center">-</span>
      <Input
        id="phone-third"
        type="tel"
        value={values.third}
        onChange={(e) => onChange(e, 'third')}
        placeholder="0000"
        className="w-24 text-center"
        fullWidth={false}
        required={required}
      />
    </div>
  );
}
