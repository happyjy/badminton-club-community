import { GRADE_OPTIONS } from '@/types';
import { Select } from './Select';

interface GradeSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'options'> {
  fullWidth?: boolean;
}

function GradeSelect({ fullWidth = true, ...props }: GradeSelectProps) {
  return (
    <Select
      options={GRADE_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
      }))}
      fullWidth={fullWidth}
      {...props}
    />
  );
}

export default GradeSelect;

