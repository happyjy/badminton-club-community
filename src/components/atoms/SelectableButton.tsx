interface SelectableButtonProps {
  label: string;
  onClick: () => void;
  className?: string;
}

export function SelectableButton({
  label,
  onClick,
  className = '',
}: SelectableButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`font-semibold text-green-600 hover:text-green-700 focus:outline-none ${className}`}
    >
      {label}
    </button>
  );
}
