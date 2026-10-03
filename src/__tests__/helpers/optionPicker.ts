import { act, fireEvent, screen } from '@testing-library/react';

/** OptionPicker의 버튼. 이름은 "정렬: 최신순"처럼 "무엇: 값" 꼴이다. */
export function pickerButton(label: string): HTMLElement {
  return screen.getByRole('button', { name: new RegExp(`^${label}(: |$)`) });
}

/** 지금 고른 값의 글자 */
export function pickerValue(label: string): string | null {
  return pickerButton(label).textContent;
}

/** 버튼을 눌러 항목을 펼치고 항목의 글자를 돌려준다. 펼친 채로 둔다. */
export async function openPicker(label: string): Promise<string[]> {
  await act(async () => {
    fireEvent.click(pickerButton(label));
  });
  return screen
    .getAllByRole('option')
    .map((option) => option.textContent ?? '');
}

/** 버튼을 눌러 펼친 뒤 그 항목을 고른다. */
export async function pickOption(label: string, option: string) {
  await openPicker(label);
  await act(async () => {
    fireEvent.click(screen.getByRole('option', { name: option }));
  });
}
