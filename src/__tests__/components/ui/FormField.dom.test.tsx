import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import { Input } from '@/components/atoms/inputs/Input';
import { FormField } from '@/components/molecules/form/FormField';

describe('FormField', () => {
  it('라벨과 입력을 이어서, 라벨 글자로 입력을 찾을 수 있다', () => {
    render(
      <FormField label="이름">
        <Input />
      </FormField>
    );

    expect(screen.getByLabelText(/이름/).tagName).toBe('INPUT');
  });

  it('자식이 이미 id를 가졌으면 그 id를 쓴다', () => {
    render(
      <FormField label="이름">
        <Input id="my-name" />
      </FormField>
    );

    expect(screen.getByLabelText(/이름/).getAttribute('id')).toBe('my-name');
  });

  it('한 화면에 여러 개 있어도 id가 겹치지 않는다', () => {
    render(
      <>
        <FormField label="이름">
          <Input />
        </FormField>
        <FormField label="전화번호">
          <Input />
        </FormField>
      </>
    );

    const nameId = screen.getByLabelText(/이름/).getAttribute('id');
    const phoneId = screen.getByLabelText(/전화번호/).getAttribute('id');
    expect(nameId).toBeTruthy();
    expect(nameId).not.toBe(phoneId);
  });

  it('필수면 별표를 붙인다', () => {
    render(
      <FormField label="이름" required>
        <Input />
      </FormField>
    );

    expect(screen.getByText('*')).toBeTruthy();
  });

  it('오류가 있으면 문구를 보여 주고 입력에 알린다', () => {
    render(
      <FormField label="이름" error="이름을 입력해주세요">
        <Input />
      </FormField>
    );

    const alert = screen.getByRole('alert');
    const input = screen.getByLabelText(/이름/);
    expect(alert.textContent).toBe('이름을 입력해주세요');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(
      alert.getAttribute('id')
    );
  });

  it('오류가 없으면 aria-invalid를 붙이지 않는다', () => {
    render(
      <FormField label="이름">
        <Input />
      </FormField>
    );

    expect(screen.getByLabelText(/이름/).hasAttribute('aria-invalid')).toBe(
      false
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('자식이 Fragment·문자열·여러 개여도 경고 없이 그린다', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <>
        <FormField label="조각">
          <>
            <Input placeholder="앞" />
            <Input placeholder="뒤" />
          </>
        </FormField>
        <FormField label="글자">그냥 글자</FormField>
        <FormField label="여러 개">
          <Input placeholder="하나" />
          <Input placeholder="둘" />
        </FormField>
      </>
    );

    expect(screen.getByPlaceholderText('앞')).toBeTruthy();
    expect(screen.getByText('그냥 글자')).toBeTruthy();
    expect(screen.getByPlaceholderText('둘')).toBeTruthy();
    expect(errorSpy).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it('전화번호 3칸처럼 div로 감싼 자식이면 그 div에 id가 붙고 오류 없이 그려진다', () => {
    render(
      <FormField label="전화번호">
        <div data-testid="group">
          <Input placeholder="010" />
          <Input placeholder="1234" />
        </div>
      </FormField>
    );

    expect(screen.getByTestId('group').getAttribute('id')).toBeTruthy();
    expect(screen.getByPlaceholderText('1234')).toBeTruthy();
  });
});
