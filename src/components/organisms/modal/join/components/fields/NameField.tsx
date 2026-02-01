import { Input } from '@/components/atoms/inputs/Input';
import { FormField } from '@/components/molecules/form/FormField';

import { useJoinModalContext } from '../../JoinModalContext';

function NameField() {
  const { formData, onChangeInput } = useJoinModalContext();

  return (
    <FormField label="이름" required>
      <Input
        type="text"
        name="name"
        value={formData.name}
        onChange={onChangeInput}
        required
      />
    </FormField>
  );
}

export default NameField;
