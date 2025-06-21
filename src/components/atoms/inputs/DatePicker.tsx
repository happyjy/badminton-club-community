import React from 'react';

import { ko } from 'date-fns/locale/ko';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// 한국어 로케일 등록
registerLocale('ko', ko);

interface DatePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  placeholderText?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  name?: string;
  maxDate?: Date;
  minDate?: Date;
  showYearDropdown?: boolean;
  showMonthDropdown?: boolean;
  dropdownMode?: 'scroll' | 'select';
  yearDropdownItemNumber?: number;
  scrollableYearDropdown?: boolean;
}

function CustomDatePicker({
  selected,
  onChange,
  placeholderText = '날짜를 선택하세요',
  required = false,
  disabled = false,
  className = '',
  name,
  maxDate,
  minDate,
  showYearDropdown = true,
  showMonthDropdown = true,
  dropdownMode = 'select',
  yearDropdownItemNumber = 100,
  scrollableYearDropdown = true,
}: DatePickerProps) {
  return (
    <DatePicker
      selected={selected}
      onChange={onChange}
      placeholderText={placeholderText}
      required={required}
      disabled={disabled}
      name={name}
      maxDate={maxDate}
      minDate={minDate}
      showYearDropdown={showYearDropdown}
      showMonthDropdown={showMonthDropdown}
      dropdownMode={dropdownMode}
      yearDropdownItemNumber={yearDropdownItemNumber}
      scrollableYearDropdown={scrollableYearDropdown}
      dateFormat="yyyy-MM-dd"
      locale="ko"
      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${className}`}
      popperClassName="z-50"
      autoComplete="off"
    />
  );
}

export default CustomDatePicker;
