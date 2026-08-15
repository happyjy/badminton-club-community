import { useState } from 'react';

interface TagListFieldProps {
  label: string;
  values: string[];
  presets: string[];
  emptyHint: string;
  placeholder: string;
  onChangeValues: (values: string[]) => void;
}

/**
 * 연령·급수처럼 "목록 자체"를 설정하는 필드.
 * 기본 선택지는 칩으로 토글하고, 목록에 없는 값은 직접 입력해 추가한다.
 */
function TagListField({
  label,
  values,
  presets,
  emptyHint,
  placeholder,
  onChangeValues,
}: TagListFieldProps) {
  const [customInput, setCustomInput] = useState('');

  const onClickToggle = (preset: string) => {
    onChangeValues(
      values.includes(preset)
        ? values.filter((value) => value !== preset)
        : [...values, preset]
    );
  };

  const onClickAddCustom = () => {
    const next = customInput.trim();
    if (!next || values.includes(next)) return;
    onChangeValues([...values, next]);
    setCustomInput('');
  };

  // 기본 선택지에 없는, 직접 입력한 값들
  const customValues = values.filter((value) => !presets.includes(value));

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">{label}</p>

      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onClickToggle(preset)}
            className={`rounded-full px-3 py-1 text-sm ${
              values.includes(preset)
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 ring-1 ring-gray-300'
            }`}
          >
            {preset}
          </button>
        ))}

        {customValues.map((value) => (
          <span
            key={value}
            className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-sm text-white"
          >
            {value}
            <button
              type="button"
              onClick={() => onClickToggle(value)}
              aria-label={`${value} 제거`}
              className="text-blue-200 hover:text-white"
            >
              ✕
            </button>
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              // 폼 전체가 제출되지 않도록 막는다
              e.preventDefault();
              onClickAddCustom();
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-md border-gray-300 text-sm"
        />
        <button
          type="button"
          onClick={onClickAddCustom}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-sm"
        >
          추가
        </button>
      </div>

      {values.length === 0 && (
        <p className="text-xs text-gray-400">{emptyHint}</p>
      )}
    </div>
  );
}

export default TagListField;
