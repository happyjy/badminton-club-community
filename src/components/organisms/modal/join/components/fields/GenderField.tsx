import { FormField } from '@/components/molecules/form/FormField';

import { useJoinModalContext } from '../../JoinModalContext';

function GenderField() {
  const { formData, onChangeInput } = useJoinModalContext();

  return (
    <FormField label="성별" required>
      <div className="flex space-x-4">
        <label className="inline-flex items-center">
          <input
            type="radio"
            name="gender"
            value="남성"
            checked={formData.gender === '남성'}
            onChange={onChangeInput}
            className="h-4 w-4 text-blue-600"
            required
          />
          <span className="ml-2 text-gray-700">남성</span>
        </label>
        <label className="inline-flex items-center">
          <input
            type="radio"
            name="gender"
            value="여성"
            checked={formData.gender === '여성'}
            onChange={onChangeInput}
            className="h-4 w-4 text-blue-600"
          />
          <span className="ml-2 text-gray-700">여성</span>
        </label>
      </div>
    </FormField>
  );
}

export default GenderField;
