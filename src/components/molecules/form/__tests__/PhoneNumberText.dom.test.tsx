import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import PhoneNumberText from '@/components/molecules/form/PhoneNumberText';

describe('PhoneNumberText', () => {
  it('정상 번호를 하이픈 형식으로 보여준다', () => {
    render(<PhoneNumberText value="010-2743-9047" />);

    expect(screen.getByText('010-2743-9047')).toBeTruthy();
    expect(screen.queryByText('확인 필요')).toBeNull();
  });

  it('하이픈이 빠진 번호를 보정해서 보여준다', () => {
    render(<PhoneNumberText value="01079366342" />);

    expect(screen.getByText('010-7936-6342')).toBeTruthy();
    expect(screen.queryByText('확인 필요')).toBeNull();
  });

  it('손상된 번호는 원본을 그대로 두고 확인 표시를 붙인다', () => {
    render(<PhoneNumberText value="010-71347219-7219" />);

    // 11자리로 잘라낸 '010-7134-7219'가 아니라 원본이 그대로 보여야 한다.
    expect(screen.getByText('010-71347219-7219')).toBeTruthy();
    expect(screen.queryByText('010-7134-7219')).toBeNull();
    expect(screen.getByText('확인 필요')).toBeTruthy();
  });

  it('번호가 없으면 대체 문구를 보여준다', () => {
    render(<PhoneNumberText value="" />);

    expect(screen.getByText('-')).toBeTruthy();
  });
});
