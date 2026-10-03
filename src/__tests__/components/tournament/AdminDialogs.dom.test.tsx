import { ReactElement } from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react';

import DeleteTournamentDialog from '@/components/organisms/tournament/admin/DeleteTournamentDialog';
import EditPlayersDialog, {
  EditablePlayer,
} from '@/components/organisms/tournament/admin/EditPlayersDialog';

async function renderSheet(ui: ReactElement) {
  await act(async () => {
    render(ui);
  });
}

const button = (name: string) =>
  screen.getByRole('button', { name }) as HTMLButtonElement;

describe('DeleteTournamentDialog', () => {
  const props = {
    title: '2026 당산 클럽 대회',
    entryCount: 3,
    isDeleting: false,
    onConfirm: () => {},
    onCancel: () => {},
  };

  it('대화상자로 뜨고 함께 지워지는 신청 수를 알린다', async () => {
    await renderSheet(<DeleteTournamentDialog {...props} />);

    expect(
      screen.getByRole('dialog', { name: '대회를 삭제할까요?' })
    ).toBeTruthy();
    expect(screen.getByText('3건')).toBeTruthy();
  });

  it('신청이 없으면 신청 수 안내 없이 되돌릴 수 없다고만 알린다', async () => {
    await renderSheet(<DeleteTournamentDialog {...props} entryCount={0} />);

    expect(screen.queryByText(/건/)).toBeNull();
    expect(screen.getByText('되돌릴 수 없습니다.')).toBeTruthy();
  });

  it('대회명을 그대로 입력하기 전에는 삭제할 수 없다', async () => {
    const onConfirm = jest.fn();
    await renderSheet(
      <DeleteTournamentDialog {...props} onConfirm={onConfirm} />
    );

    expect(button('삭제').disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/대회명을 그대로 입력/), {
      target: { value: '2026 당산 클럽' },
    });
    expect(button('삭제').disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/대회명을 그대로 입력/), {
      target: { value: '2026 당산 클럽 대회' },
    });
    expect(button('삭제').disabled).toBe(false);

    fireEvent.click(button('삭제'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('앞뒤 공백은 무시하고 일치로 본다', async () => {
    await renderSheet(<DeleteTournamentDialog {...props} />);

    fireEvent.change(screen.getByLabelText(/대회명을 그대로 입력/), {
      target: { value: '  2026 당산 클럽 대회  ' },
    });
    expect(button('삭제').disabled).toBe(false);
  });

  it('삭제 중에는 삭제도 취소도 눌리지 않는다', async () => {
    await renderSheet(<DeleteTournamentDialog {...props} isDeleting />);

    fireEvent.change(screen.getByLabelText(/대회명을 그대로 입력/), {
      target: { value: '2026 당산 클럽 대회' },
    });
    expect(button('취소').disabled).toBe(true);
    const destructive = screen
      .getAllByRole('button')
      .find((el) => el.className.includes('text-negative'));
    expect((destructive as HTMLButtonElement).disabled).toBe(true);
  });

  it('취소를 누르면 onCancel이 불린다', async () => {
    const onCancel = jest.fn();
    await renderSheet(
      <DeleteTournamentDialog {...props} onCancel={onCancel} />
    );

    fireEvent.click(button('취소'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('EditPlayersDialog', () => {
  const players: EditablePlayer[] = [
    {
      id: 'p1',
      name: '김민수',
      gender: '남',
      birthDate: '1990-03-15',
      phoneNumber: '010-1234-5678',
      tshirtSize: 'L',
    },
  ];
  const props = {
    applicantName: '홍길동',
    players,
    tshirtSizes: ['M', 'L'],
    isSaving: false,
    onSave: () => {},
    onCancel: () => {},
  };

  it('대화상자로 뜨고 선수 정보를 칸에 채운다', async () => {
    await renderSheet(<EditPlayersDialog {...props} />);

    expect(screen.getByRole('dialog', { name: '선수 정보 수정' })).toBeTruthy();
    expect(screen.getByText(/홍길동 님의 외부 신청서/)).toBeTruthy();
    expect((screen.getByLabelText(/이름/) as HTMLInputElement).value).toBe(
      '김민수'
    );
    expect((screen.getByLabelText(/생년월일/) as HTMLInputElement).value).toBe(
      '19900315'
    );
    expect((screen.getByLabelText(/전화번호/) as HTMLInputElement).value).toBe(
      '010-1234-5678'
    );
    expect((screen.getByLabelText(/성별/) as HTMLSelectElement).value).toBe(
      '남'
    );
    expect((screen.getByLabelText(/티셔츠/) as HTMLSelectElement).value).toBe(
      'L'
    );
  });

  it('성별 선택칸의 첫 항목은 "선택" 하나뿐이다', async () => {
    await renderSheet(<EditPlayersDialog {...props} />);

    const labels = [
      ...(screen.getByLabelText(/성별/) as HTMLSelectElement).options,
    ].map((option) => option.textContent);
    expect(labels).toEqual(['선택', '남', '여']);
  });

  it('티셔츠 사이즈가 없는 대회면 티셔츠 칸을 그리지 않는다', async () => {
    await renderSheet(<EditPlayersDialog {...props} tshirtSizes={[]} />);

    expect(screen.queryByLabelText(/티셔츠/)).toBeNull();
  });

  it('이름을 비우면 오류를 보여 주고 저장할 수 없다', async () => {
    await renderSheet(<EditPlayersDialog {...props} />);

    fireEvent.change(screen.getByLabelText(/이름/), { target: { value: ' ' } });

    expect(screen.getByText('선수 이름을 입력해주세요.')).toBeTruthy();
    expect(button('저장').disabled).toBe(true);
  });

  it('저장하면 생년월일·전화번호를 저장 형식으로 맞춰 넘긴다', async () => {
    const onSave = jest.fn();
    await renderSheet(<EditPlayersDialog {...props} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText(/이름/), {
      target: { value: '김민준' },
    });
    fireEvent.change(screen.getByLabelText(/전화번호/), {
      target: { value: '01099998888' },
    });
    fireEvent.change(screen.getByLabelText(/티셔츠/), {
      target: { value: '' },
    });
    fireEvent.click(button('저장'));

    expect(onSave).toHaveBeenCalledWith([
      {
        id: 'p1',
        name: '김민준',
        gender: '남',
        birthDate: '1990-03-15',
        phoneNumber: '010-9999-8888',
        tshirtSize: null,
      },
    ]);
  });

  it('선수가 여럿이면 선수마다 칸 묶음을 그린다', async () => {
    await renderSheet(
      <EditPlayersDialog
        {...props}
        players={[...players, { ...players[0], id: 'p2', name: '이지은' }]}
      />
    );

    expect(screen.getByText('선수 1')).toBeTruthy();
    expect(screen.getByText('선수 2')).toBeTruthy();
    expect(screen.getAllByLabelText(/이름/)).toHaveLength(2);
  });

  it('저장 중에는 저장도 취소도 눌리지 않는다', async () => {
    await renderSheet(<EditPlayersDialog {...props} isSaving />);

    expect(button('취소').disabled).toBe(true);
    const primary = screen
      .getAllByRole('button')
      .find((el) => el.className.includes('bg-accent'));
    expect((primary as HTMLButtonElement).disabled).toBe(true);
  });
});
