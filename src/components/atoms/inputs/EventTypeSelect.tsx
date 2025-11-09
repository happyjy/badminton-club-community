import { EVENT_TYPE_OPTIONS } from '@/types';
import { Select } from './Select';

interface EventTypeSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'options'> {
  fullWidth?: boolean;
}

function EventTypeSelect({ fullWidth = true, ...props }: EventTypeSelectProps) {
  return (
    <Select
      options={EVENT_TYPE_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
      }))}
      fullWidth={fullWidth}
      {...props}
    />
  );
}

export default EventTypeSelect;

