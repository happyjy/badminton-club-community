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
    <div className="flex items-center">
      <Checkbox
        name="intendToJoin"
        checked={forceChecked ? true : formData.intendToJoin}
        onChange={disabled ? undefined : onChangeInput}
        disabled={disabled}
      />
      <span className="text-sm font-medium text-gray-700">
        클럽 가입 의사
        {helpText && <span className="ml-1 text-blue-600">{helpText}</span>}
      </span>
    </div>
  );
}

export default IntendToJoinField;
