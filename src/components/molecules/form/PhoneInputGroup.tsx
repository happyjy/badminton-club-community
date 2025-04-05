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
  return (
    <div className="mt-1 flex gap-2">
      <Input
        id="phone-first"
        value={values.first}
        onChange={(e) => onChange(e, 'first')}
        maxLength={3}
        placeholder="010"
        className="w-20 text-center"
        fullWidth={false}
        required={required}
      />
      <span className="flex items-center">-</span>
      <Input
        id="phone-second"
        value={values.second}
        onChange={(e) => onChange(e, 'second')}
        maxLength={4}
        placeholder="0000"
        className="w-24 text-center"
        fullWidth={false}
        required={required}
      />
      <span className="flex items-center">-</span>
      <Input
        id="phone-third"
        value={values.third}
        onChange={(e) => onChange(e, 'third')}
        maxLength={4}
        placeholder="0000"
        className="w-24 text-center"
        fullWidth={false}
        required={required}
      />
    </div>
  );
}
