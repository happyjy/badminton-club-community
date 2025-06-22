import React, { forwardRef } from 'react';

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

// eslint-disable-next-line react/display-name
const CustomInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ value, onClick, className, placeholder }, ref) => (
  <input
    type="text"
    className={className}
    onClick={onClick}
    value={value}
    ref={ref}
    readOnly
    placeholder={placeholder}
    autoComplete="off"
  />
));

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
  const finalClassName = `mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${className}`;
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
      // customInput을 사용하여 readOnly 속성이 적용된 입력 필드를 렌더링합니다.
      customInput={<CustomInput className={finalClassName} />}
      dateFormat="yyyy-MM-dd"
      dateFormatCalendar="yyyy년 MM월"
      locale="ko"
      popperClassName="z-50"
      autoComplete="off"
      calendarClassName="swap-year-month-dropdowns"
    />
  );
}

export default CustomDatePicker;
