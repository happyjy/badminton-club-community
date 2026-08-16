import React from 'react';

import { Input } from '@/components/atoms/inputs/Input';
import { FormField } from '@/components/molecules/form/FormField';

import { toLocalDateString } from '@/utils/date';

import { useJoinModalContext } from '../../JoinModalContext';

function VisitDateField() {
  const { formData, onChangeInput, minVisitDate, maxVisitDate } =
    useJoinModalContext();

  return (
    <FormField label="방문 날짜" required>
      <Input
        type="date"
        name="visitDate"
        value={formData.visitDate || ''}
        onChange={onChangeInput}
        required
        min={toLocalDateString(minVisitDate)}
        max={toLocalDateString(maxVisitDate)}
      />
    </FormField>
  );
}

export default VisitDateField;
