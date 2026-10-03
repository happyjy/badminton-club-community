import { Checkbox } from '@/components/atoms/inputs/Checkbox';

import { useJoinModalContext } from '../../JoinModalContext';

interface IntendToJoinFieldProps {
  disabled?: boolean;
  forceChecked?: boolean;
  helpText?: string;
}

function IntendToJoinField({
  disabled = false,
  forceChecked = false,
  helpText,
}: IntendToJoinFieldProps) {
  const { formData, onChangeInput } = useJoinModalContext();

  return (
    <label className="flex min-h-11 items-center text-body text-primary">
      <Checkbox
        name="intendToJoin"
        checked={forceChecked ? true : formData.intendToJoin}
        onChange={disabled ? undefined : onChangeInput}
        disabled={disabled}
        readOnly={disabled}
      />
      <span>
        클럽 가입 의사
        {helpText && (
          <span className="ml-1 text-footnote text-secondary">{helpText}</span>
        )}
      </span>
    </label>
  );
}

export default IntendToJoinField;
