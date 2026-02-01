import React from 'react';

import CustomDatePicker from '@/components/atoms/inputs/DatePicker';
import { FormField } from '@/components/molecules/form/FormField';

import { useJoinModalContext } from '../../JoinModalContext';

function VisitDateField() {
  const {
    formData,
    onChangeInput,
    parseDate,
    formatDate,
    minVisitDate,
    maxVisitDate,
  } = useJoinModalContext();

  const handleChange = (date: Date | null) => {
    const event = {
      target: {
        name: 'visitDate',
        value: formatDate(date),
      },
    } as React.ChangeEvent<HTMLInputElement>;
    onChangeInput(event);
  };

  return (
    <FormField label="방문 날짜" required>
      <CustomDatePicker
        selected={parseDate(formData.visitDate || '')}
        onChange={handleChange}
        placeholderText="방문 날짜를 선택하세요"
        required
        minDate={minVisitDate}
        maxDate={maxVisitDate}
        showYearDropdown
        showMonthDropdown
        dropdownMode="select"
        yearDropdownItemNumber={5}
        scrollableYearDropdown
      />
    </FormField>
  );
}

export default VisitDateField;
