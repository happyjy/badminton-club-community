import { FormField } from '@/components/molecules/form/FormField';

import { useJoinModalContext } from '../../JoinModalContext';

function GenderField() {
  const { formData, onChangeInput } = useJoinModalContext();

  return (
    <FormField label="성별" required>
      <div className="flex space-x-4">
        <label className="inline-flex min-h-11 items-center">
          <input
            type="radio"
            name="gender"
            value="남성"
            checked={formData.gender === '남성'}
            onChange={onChangeInput}
            className="h-5 w-5 accent-accent"
            required
          />
          <span className="ml-2 text-body text-primary">남성</span>
        </label>
        <label className="inline-flex min-h-11 items-center">
          <input
            type="radio"
            name="gender"
            value="여성"
            checked={formData.gender === '여성'}
            onChange={onChangeInput}
            className="h-5 w-5 accent-accent"
          />
          <span className="ml-2 text-body text-primary">여성</span>
        </label>
      </div>
    </FormField>
  );
}

export default GenderField;
