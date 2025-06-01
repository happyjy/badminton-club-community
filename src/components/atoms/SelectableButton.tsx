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
      className={`${className} font-semibold focus:outline-none`}
    >
      {label}
    </button>
  );
}
