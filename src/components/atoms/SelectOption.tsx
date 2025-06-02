interface SelectOptionProps<T> {
  value: T;
  label: string;
  onClick: (value: T) => void;
  isMobile?: boolean;
}

export function SelectOption<T>({
  value,
  label,
  onClick,
  isMobile = false,
}: SelectOptionProps<T>) {
  const baseClasses = isMobile
    ? 'w-full px-4 py-3 text-left text-base bg-gray-50 rounded-lg hover:bg-gray-100 active:bg-gray-200'
    : 'block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100';

  return (
    <button
      onClick={() => onClick(value)}
      className={baseClasses}
      role="menuitem"
    >
      {label}
    </button>
  );
}
