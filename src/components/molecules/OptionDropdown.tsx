import { SelectOption } from '../atoms/SelectOption';

interface OptionDropdownProps<T> {
  options: Array<{ value: T; label: string }>;
  onSelect: (value: T) => void;
}

export function OptionDropdown<T>({
  options,
  onSelect,
}: OptionDropdownProps<T>) {
  return (
    <div className="absolute z-10 mt-1 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
      <div className="py-1" role="menu">
        {options.map(({ value, label }) => (
          <SelectOption
            key={label}
            value={value}
            label={label}
            onClick={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
