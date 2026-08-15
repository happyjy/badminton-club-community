import { useEffect, useState } from 'react';

import { CUSTOM_VALUE } from './eventOptionPresets';

interface PresetOrCustomInputProps {
  value: string;
  presets: string[];
  placeholder?: string;
  allowEmpty?: boolean;
  onChangeValue: (value: string) => void;
}

/**
 * 기본 선택지를 드롭다운으로 고르되, '기타'를 고르면 자유 입력으로 바뀌는 필드.
 * 저장값은 항상 문자열이므로 DB 스키마와 무관하게 동작한다.
 */
function PresetOrCustomInput({
  value,
  presets,
  placeholder,
  allowEmpty = false,
  onChangeValue,
}: PresetOrCustomInputProps) {
  // 기존 값이 목록에 없으면(수정 화면 등) 처음부터 자유 입력으로 연다
  const isPresetValue = value === '' || presets.includes(value);
  const [isCustom, setIsCustom] = useState(!isPresetValue);

  // 외부에서 값이 통째로 바뀌는 경우(폼 reset)에 모드를 맞춰준다
  useEffect(() => {
    if (value !== '' && !presets.includes(value)) setIsCustom(true);
  }, [value, presets]);

  const onChangeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === CUSTOM_VALUE) {
      setIsCustom(true);
      onChangeValue('');
      return;
    }
    onChangeValue(e.target.value);
  };

  if (isCustom) {
    return (
      <div className="flex min-w-0 items-center gap-1">
        <input
          className="w-full min-w-0 rounded border-gray-300 text-sm"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChangeValue(e.target.value)}
        />
        <button
          type="button"
          onClick={() => {
            setIsCustom(false);
            onChangeValue('');
          }}
          aria-label="목록에서 선택으로 되돌리기"
          title="목록에서 선택"
          className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <select
      className="w-full rounded border-gray-300 text-sm"
      value={value}
      onChange={onChangeSelect}
    >
      <option value="">{allowEmpty ? '없음' : '선택'}</option>
      {presets.map((preset) => (
        <option key={preset} value={preset}>
          {preset}
        </option>
      ))}
      <option value={CUSTOM_VALUE}>기타 직접입력...</option>
    </select>
  );
}

export default PresetOrCustomInput;
