import { SelectOption } from '../atoms/SelectOption';

interface OptionBottomSheetProps<T> {
  title: string;
  options: Array<{ value: T; label: string }>;
  onSelect: (value: T) => void;
  onClose: () => void;
}

export function OptionBottomSheet<T>({
  title,
  options,
  onSelect,
  onClose,
}: OptionBottomSheetProps<T>) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500">
            ✕
          </button>
        </div>
        <div className="space-y-2">
          {options.map(({ value, label }) => (
            <SelectOption
              key={label}
              value={value}
              label={label}
              onClick={onSelect}
              isMobile
            />
          ))}
        </div>
      </div>
    </div>
  );
}
