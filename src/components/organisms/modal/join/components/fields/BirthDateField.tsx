import React from 'react';

import { Input } from '@/components/atoms/inputs/Input';
import { FormField } from '@/components/molecules/form/FormField';

import { toLocalDateString } from '@/utils/date';

import { useJoinModalContext } from '../../JoinModalContext';

function BirthDateField() {
  const { formData, onChangeInput, minBirthDate, maxBirthDate } =
    useJoinModalContext();

  return (
    <FormField label="생년월일" required>
      <Input
        type="date"
        name="birthDate"
        value={formData.birthDate || ''}
        onChange={onChangeInput}
        required
        min={toLocalDateString(minBirthDate)}
        max={toLocalDateString(maxBirthDate)}
      />
    </FormField>
  );
}

export default BirthDateField;
