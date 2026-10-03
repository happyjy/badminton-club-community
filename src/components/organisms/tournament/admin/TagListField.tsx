import { useState } from 'react';

import { Input } from '@/components/atoms/inputs/Input';

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
      <p className="text-callout font-medium text-primary">{label}</p>

      {/* 아직 선택하지 않은 기본 선택지 */}
      {unselectedPresets.length > 0 && (
        <div>
          <p className="mb-1.5 text-footnote text-secondary">빠른 선택</p>
          <div className="flex flex-wrap gap-1.5">
            {unselectedPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onClickToggle(preset)}
                className="rounded-full bg-surface px-3 py-1 text-callout text-secondary ring-1 ring-border"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Input
          type="text"
          fullWidth={false}
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
          className="min-w-0 flex-1"
        />
        <button
          type="button"
          onClick={onClickAddCustom}
          className="rounded-md bg-fill px-3 py-1.5 text-callout"
        >
          추가
        </button>
      </div>

      {values.length === 0 ? (
        <p className="text-footnote text-secondary">{emptyHint}</p>
      ) : (
        <div className="rounded-md bg-fill p-2">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-footnote text-secondary">
              <span className="font-medium text-primary">선택한 {label}</span> ·
              신청 화면에 이 순서대로 보입니다
            </p>
            <button
              type="button"
              onClick={() => onChangeValues(sortTagValues(values))}
              disabled={isSorted}
              className="rounded-md px-2 py-1 text-footnote text-primary disabled:text-tertiary"
            >
              숫자순 정렬
            </button>
          </div>

          <ul className="flex flex-wrap gap-1.5">
            {values.map((value, index) => (
              <li
                key={value}
                className="inline-flex items-center gap-1 rounded-full bg-accent py-1 pl-2 pr-1 text-callout text-on-accent"
              >
                <button
                  type="button"
                  onClick={() => onClickMove(index, -1)}
                  disabled={index === 0}
                  aria-label={`${value} 앞으로`}
                  className="px-0.5 text-primary hover:text-on-accent disabled:text-primary"
                >
                  ‹
                </button>
                {value}
                <button
                  type="button"
                  onClick={() => onClickMove(index, 1)}
                  disabled={index === values.length - 1}
                  aria-label={`${value} 뒤로`}
                  className="px-0.5 text-primary hover:text-on-accent disabled:text-primary"
                >
                  ›
                </button>
                <button
                  type="button"
                  onClick={() => onClickToggle(value)}
                  aria-label={`${value} 제거`}
                  className="px-1 text-primary hover:text-on-accent"
                >
                  ×
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
