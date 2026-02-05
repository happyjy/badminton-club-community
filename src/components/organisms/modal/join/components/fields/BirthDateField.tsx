import React from 'react';

import CustomDatePicker from '@/components/atoms/inputs/DatePicker';
import { FormField } from '@/components/molecules/form/FormField';

import { useJoinModalContext } from '../../JoinModalContext';

function BirthDateField() {
  const {
    formData,
    onChangeInput,
    parseDate,
    formatDate,
    minBirthDate,
    maxBirthDate,
  } = useJoinModalContext();

  const handleChange = (date: Date | null) => {
    const event = {
      target: {
        name: 'birthDate',
        value: formatDate(date),
      },
    } as React.ChangeEvent<HTMLInputElement>;
    onChangeInput(event);
  };

  return (
    <FormField label="생년월일" required>
      <CustomDatePicker
        selected={parseDate(formData.birthDate || '')}
        onChange={handleChange}
        placeholderText="생년월일을 선택하세요"
        required
        minDate={minBirthDate}
        maxDate={maxBirthDate}
        showYearDropdown
        showMonthDropdown
        dropdownMode="select"
        yearDropdownItemNumber={50}
        scrollableYearDropdown
      />
    </FormField>
  );
}

export default BirthDateField;
