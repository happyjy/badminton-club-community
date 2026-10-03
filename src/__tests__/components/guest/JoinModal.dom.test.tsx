import { ReactElement } from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, within } from '@testing-library/react';

import { GuestApplicationModal } from '@/components/organisms/modal/join';

import { User } from '@/types';
import { ClubJoinFormData } from '@/types/club.types';

const user = { id: 7, nickname: '나', email: null } as unknown as User;

const filled: Partial<ClubJoinFormData> = {
  name: '홍길동',
  birthDate: '1990-01-01',
  phoneNumber: '010-1234-5678',
  gender: '남성',
  localTournamentLevel: 'C',
  nationalTournamentLevel: 'D',
  lessonPeriod: '6개월',
  playingPeriod: '2년',
  intendToJoin: true,
  visitDate: '2030-01-01',
  message: '안녕하세요',
};

const base = {
  user,
  clubId: '1',
  isOpen: true,
  onClose: () => {},
  onSubmit: () => {},
};

async function renderModal(ui: ReactElement) {
  await act(async () => {
    render(ui);
  });
}

const submitForm = async () => {
  await act(async () => {
    fireEvent.submit(document.querySelector('form') as HTMLFormElement);
  });
};

describe('게스트 신청 창 (JoinModal)', () => {
  it('열려 있으면 제목이 붙은 대화상자로 뜬다', async () => {
    await renderModal(<GuestApplicationModal {...base} />);

    const dialog = screen.getByRole('dialog', { name: '게스트 신청' });
    expect(
      within(dialog).getByText(
        '게스트로 참여하고 싶으시면 아래 정보를 입력해주세요.'
      )
    ).toBeTruthy();
    expect(within(dialog).getByLabelText(/이름/)).toBeTruthy();
  });

  it('수정할 때는 제목과 버튼 글자가 바뀌고 값이 채워져 있다', async () => {
    await renderModal(
      <GuestApplicationModal {...base} initialValues={filled} />
    );

    const dialog = screen.getByRole('dialog', { name: '게스트 신청 수정' });
    expect(
      (within(dialog).getByLabelText(/이름/) as HTMLInputElement).value
    ).toBe('홍길동');
    expect(
      within(dialog).getByRole('button', { name: '수정하기' })
    ).toBeTruthy();
  });

  it('닫혀 있으면 아무것도 그리지 않는다', async () => {
    await renderModal(<GuestApplicationModal {...base} isOpen={false} />);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('ESC로는 닫히지 않는다 (긴 폼을 실수로 잃지 않게)', async () => {
    const onClose = jest.fn();
    await renderModal(<GuestApplicationModal {...base} onClose={onClose} />);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('취소를 누르면 onClose가 불린다', async () => {
    const onClose = jest.fn();
    await renderModal(<GuestApplicationModal {...base} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('값이 올바르면 제출할 때 입력한 내용으로 onSubmit이 불린다', async () => {
    const onSubmit = jest.fn();
    await renderModal(
      <GuestApplicationModal
        {...base}
        initialValues={filled}
        onSubmit={onSubmit}
      />
    );

    await submitForm();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: '홍길동',
      phoneNumber: '010-1234-5678',
      visitDate: '2030-01-01',
    });
  });

  it('전화번호가 모자라면 제출하지 않고, 브라우저 알림창 대신 창 안에 이유를 보여 준다', async () => {
    const onSubmit = jest.fn();
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    await renderModal(
      <GuestApplicationModal
        {...base}
        initialValues={{ ...filled, phoneNumber: '010-12' }}
        onSubmit={onSubmit}
      />
    );

    await submitForm();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
    const alerts = screen.getAllByRole('alert').map((el) => el.textContent);
    expect(alerts.some((text) => /전화번호/.test(text ?? ''))).toBe(true);
    alertSpy.mockRestore();
  });

  it('인증이 필요한 화면에서 인증 전이면 제출 버튼이 잠기고, 엔터로 제출해도 막는다', async () => {
    const onSubmit = jest.fn();
    await renderModal(
      <GuestApplicationModal
        {...base}
        initialValues={filled}
        onSubmit={onSubmit}
        sendPhoneVerificationCode={async () => {}}
        verifyPhoneCode={async () => {}}
        phoneVerificationStatus={null}
      />
    );

    expect(
      (screen.getByRole('button', { name: '수정하기' }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(
      screen.getByText('전화번호 인증을 완료하면 신청할 수 있습니다')
    ).toBeTruthy();

    await submitForm();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen
        .getAllByRole('alert')
        .some((el) => el.textContent === '전화번호 인증을 완료해주세요.')
    ).toBe(true);
  });

  it('개인정보 "내용 보기"를 누르면 안내 창이 뜨고, 확인을 누르면 닫히되 신청 창은 남는다', async () => {
    await renderModal(<GuestApplicationModal {...base} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '내용 보기' }));
    });
    const privacy = screen.getByRole('dialog', {
      name: '개인정보 수집 및 이용에 동의',
    });
    expect(within(privacy).getByText(/수집하는 항목/)).toBeTruthy();

    await act(async () => {
      fireEvent.click(within(privacy).getByRole('button', { name: '확인' }));
    });
    expect(
      (screen.getByLabelText(/이름/) as HTMLInputElement).closest('form')
    ).toBeTruthy();
  });

  it('개인정보 동의 글자를 눌러도 체크된다', async () => {
    await renderModal(<GuestApplicationModal {...base} />);

    const box = screen.getByRole('checkbox', {
      name: /개인정보 수집 및 이용에 동의합니다/,
    }) as HTMLInputElement;
    expect(box.checked).toBe(false);

    fireEvent.click(screen.getByText(/개인정보 수집 및 이용에 동의합니다/));
    expect(box.checked).toBe(true);
  });
});
