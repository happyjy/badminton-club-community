import { useState } from 'react';

import { parseTagInput } from '@/lib/tournament/parseTagInput';
import { moveTagValue, sortTagValues } from '@/lib/tournament/sortTagValues';

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
 *
 * 선택한 값의 배열 순서가 신청 화면의 선택지 순서가 되므로,
 * 선택 목록을 순서대로 보여주고 화살표·정렬로 순서를 조절할 수 있게 한다.
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

  // "1부, 2부"처럼 쉼표로 구분해 한 번에 여러 개를 등록할 수 있다
  const onClickAddCustom = () => {
    const next = parseTagInput(customInput, values);
    if (next.length > 0) {
      onChangeValues([...values, ...next]);
    }
    setCustomInput('');
  };

  const onClickMove = (index: number, direction: -1 | 1) => {
    onChangeValues(moveTagValue(values, index, direction));
  };

  const isSorted = sortTagValues(values).every(
    (value, index) => value === values[index]
  );

  // 이미 고른 값은 아래 선택 목록에 있으므로 후보에서 뺀다
  const unselectedPresets = presets.filter(
    (preset) => !values.includes(preset)
  );

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">{label}</p>

      {/* 아직 선택하지 않은 기본 선택지 */}
      {unselectedPresets.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs text-gray-500">빠른 선택</p>
          <div className="flex flex-wrap gap-1.5">
            {unselectedPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onClickToggle(preset)}
                className="rounded-full bg-white px-3 py-1 text-sm text-gray-600 ring-1 ring-gray-300"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      )}

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

      {values.length === 0 ? (
        <p className="text-xs text-gray-400">{emptyHint}</p>
      ) : (
        <div className="rounded-md bg-gray-50 p-2">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              <span className="font-medium text-gray-700">선택한 {label}</span>{' '}
              · 신청 화면에 이 순서대로 보입니다
            </p>
            <button
              type="button"
              onClick={() => onChangeValues(sortTagValues(values))}
              disabled={isSorted}
              className="rounded-md px-2 py-1 text-xs text-blue-600 disabled:text-gray-300"
            >
              숫자순 정렬
            </button>
          </div>

          <ul className="flex flex-wrap gap-1.5">
            {values.map((value, index) => (
              <li
                key={value}
                className="inline-flex items-center gap-1 rounded-full bg-blue-600 py-1 pl-2 pr-1 text-sm text-white"
              >
                <button
                  type="button"
                  onClick={() => onClickMove(index, -1)}
                  disabled={index === 0}
                  aria-label={`${value} 앞으로`}
                  className="px-0.5 text-blue-200 hover:text-white disabled:text-blue-500"
                >
                  ‹
                </button>
                {value}
                <button
                  type="button"
                  onClick={() => onClickMove(index, 1)}
                  disabled={index === values.length - 1}
                  aria-label={`${value} 뒤로`}
                  className="px-0.5 text-blue-200 hover:text-white disabled:text-blue-500"
                >
                  ›
                </button>
                <button
                  type="button"
                  onClick={() => onClickToggle(value)}
                  aria-label={`${value} 제거`}
                  className="px-1 text-blue-200 hover:text-white"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default TagListField;
