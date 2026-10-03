import { cn } from '@/lib/utils';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function Label({
  children,
  required = false,
  className,
  ...props
}: LabelProps) {
  return (
    <label
      className={cn(
        'block text-footnote font-medium text-secondary',
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="ml-1 text-negative">*</span>}
    </label>
  );
}
