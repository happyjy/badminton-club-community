import { ReactElement } from 'react';

import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { WorkoutDeleteSheet } from '@/components/organisms/workout/WorkoutDeleteSheet';
import {
  WorkoutEditSheet,
  WorkoutEditValues,
} from '@/components/organisms/workout/WorkoutEditSheet';

import { Workout } from '@/types';

/** headlessui의 전환이 렌더 직후 상태를 한 번 더 바꾸므로 act 안에서 기다린다. */
async function renderSheet(ui: ReactElement) {
  await act(async () => {
    render(ui);
  });
}

async function click(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
}

const workout: Workout = {
  id: 7,
  title: '토요 정기 운동',
  description: '셔틀콕 제공',
  date: new Date('2026-10-04T00:00:00Z'),
  startTime: new Date('2026-10-04T19:00:00Z'),
  endTime: new Date('2026-10-04T22:00:00Z'),
  maxParticipants: 24,
  location: '당산초 체육관',
  createdAt: new Date('2026-10-01T00:00:00Z'),
  updatedAt: new Date('2026-10-01T00:00:00Z'),
};

describe('WorkoutDeleteSheet', () => {
  it('대화상자로 뜨고 일정 이름을 보여 준다', async () => {
    await renderSheet(
      <WorkoutDeleteSheet
        title="토요 정기 운동"
        participantCount={0}
        onConfirm={async () => {}}
        onClose={() => {}}
      />
    );

    expect(screen.getByRole('dialog', { name: '운동 일정 삭제' })).toBeTruthy();
    expect(screen.getByText(/토요 정기 운동/)).toBeTruthy();
  });

  it('참여자가 있으면 몇 명의 기록이 지워지는지 알린다', async () => {
    await renderSheet(
      <WorkoutDeleteSheet
        title="토요 정기 운동"
        participantCount={12}
        onConfirm={async () => {}}
        onClose={() => {}}
      />
    );

    expect(screen.getByText(/12명이 참여 중/)).toBeTruthy();
  });

  it('참여자가 없으면 그 안내를 보여 주지 않는다', async () => {
    await renderSheet(
      <WorkoutDeleteSheet
        title="토요 정기 운동"
        participantCount={0}
        onConfirm={async () => {}}
        onClose={() => {}}
      />
    );

    expect(screen.queryByText(/참여 중/)).toBeNull();
  });

  it('삭제를 누르면 onConfirm이 불린다', async () => {
    const onConfirm = jest.fn(async () => {});
    await renderSheet(
      <WorkoutDeleteSheet
        title="토요 정기 운동"
        participantCount={0}
        onConfirm={onConfirm}
        onClose={() => {}}
      />
    );

    await click('삭제');
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('삭제에 실패하면 오류를 시트 안에 보여 주고 다시 누를 수 있다', async () => {
    const onConfirm = jest.fn(async () => {
      throw new Error('이미 삭제된 일정입니다.');
    });
    await renderSheet(
      <WorkoutDeleteSheet
        title="토요 정기 운동"
        participantCount={0}
        onConfirm={onConfirm}
        onClose={() => {}}
      />
    );

    await click('삭제');

    expect(screen.getByRole('alert').textContent).toBe(
      '이미 삭제된 일정입니다.'
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: '삭제' }) as HTMLButtonElement)
        .disabled
    ).toBe(false);
  });

  it('삭제가 진행되는 동안에는 다시 눌리지 않는다', async () => {
    let finish: () => void = () => {};
    const onConfirm = jest.fn(
      () => new Promise<void>((resolve) => (finish = resolve))
    );
    await renderSheet(
      <WorkoutDeleteSheet
        title="토요 정기 운동"
        participantCount={0}
        onConfirm={onConfirm}
        onClose={() => {}}
      />
    );

    await click('삭제');
    const pending = screen
      .getAllByRole('button')
      .find((button) => button.className.includes('text-negative'));
    expect((pending as HTMLButtonElement).disabled).toBe(true);
    await act(async () => {
      fireEvent.click(pending as HTMLButtonElement);
    });
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await act(async () => {
      finish();
    });
  });

  it('취소와 ESC는 onClose를 부른다', async () => {
    const onClose = jest.fn();
    await renderSheet(
      <WorkoutDeleteSheet
        title="토요 정기 운동"
        participantCount={0}
        onConfirm={async () => {}}
        onClose={onClose}
      />
    );

    await click('취소');
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('WorkoutEditSheet', () => {
  it('저장된 값으로 칸을 채우고, 라벨로 칸을 찾을 수 있다', async () => {
    await renderSheet(
      <WorkoutEditSheet
        workout={workout}
        onSubmit={async () => {}}
        onClose={() => {}}
      />
    );

    expect(screen.getByRole('dialog', { name: '운동 일정 수정' })).toBeTruthy();
    const value = (label: RegExp) =>
      (screen.getByLabelText(label) as HTMLInputElement).value;
    expect(value(/제목/)).toBe('토요 정기 운동');
    expect(value(/설명/)).toBe('셔틀콕 제공');
    expect(value(/날짜/)).toBe('2026-10-04');
    expect(value(/시작 시간/)).toBe('19:00');
    expect(value(/종료 시간/)).toBe('22:00');
    expect(value(/장소/)).toBe('당산초 체육관');
    expect(value(/최대 인원/)).toBe('24');
  });

  it('고친 값으로 onSubmit이 불린다', async () => {
    const onSubmit = jest.fn<(values: WorkoutEditValues) => Promise<void>>(
      async () => {}
    );
    await renderSheet(
      <WorkoutEditSheet
        workout={workout}
        onSubmit={onSubmit}
        onClose={() => {}}
      />
    );

    fireEvent.change(screen.getByLabelText(/제목/), {
      target: { value: '일요 번개' },
    });
    fireEvent.change(screen.getByLabelText(/최대 인원/), {
      target: { value: '16' },
    });
    await click('저장');

    expect(onSubmit).toHaveBeenCalledWith({
      title: '일요 번개',
      description: '셔틀콕 제공',
      date: '2026-10-04',
      startTime: '19:00',
      endTime: '22:00',
      location: '당산초 체육관',
      maxParticipants: 16,
    });
  });

  it('최대 인원을 비우면 0이 되고, 최소 1명 조건에 걸려 저장되지 않는다', async () => {
    const onSubmit = jest.fn<(values: WorkoutEditValues) => Promise<void>>(
      async () => {}
    );
    await renderSheet(
      <WorkoutEditSheet
        workout={workout}
        onSubmit={onSubmit}
        onClose={() => {}}
      />
    );

    const max = screen.getByLabelText(/최대 인원/) as HTMLInputElement;
    fireEvent.change(max, { target: { value: '' } });
    await click('저장');

    expect(max.value).toBe('0');
    expect(max.getAttribute('min')).toBe('1');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('설명이 null인 일정도 빈 칸으로 열린다', async () => {
    await renderSheet(
      <WorkoutEditSheet
        workout={{ ...workout, description: null as unknown as string }}
        onSubmit={async () => {}}
        onClose={() => {}}
      />
    );

    expect((screen.getByLabelText(/설명/) as HTMLInputElement).value).toBe('');
  });

  it('저장에 실패하면 오류를 보여 주고 시트는 열린 채다', async () => {
    const onSubmit = jest.fn(async () => {
      throw new Error('종료 시간이 시작 시간보다 빠릅니다.');
    });
    await renderSheet(
      <WorkoutEditSheet
        workout={workout}
        onSubmit={onSubmit}
        onClose={() => {}}
      />
    );

    await click('저장');

    expect(screen.getByRole('alert').textContent).toBe(
      '종료 시간이 시작 시간보다 빠릅니다.'
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    // 폼이 길어 본문이 스크롤되는 작은 화면에서도 보이도록, 오류는 늘 보이는
    // 바닥 영역(저장 버튼 바로 위)에 있어야 한다.
    expect(screen.getByRole('alert').closest('footer')).toBeTruthy();
  });

  it('입력칸의 글자는 16px 이상이다 (아이폰 확대 방지)', async () => {
    await renderSheet(
      <WorkoutEditSheet
        workout={workout}
        onSubmit={async () => {}}
        onClose={() => {}}
      />
    );

    expect(screen.getByLabelText(/제목/).className.split(' ')).toContain(
      'text-body'
    );
  });

  it('취소와 닫기 버튼은 onClose를 부른다', async () => {
    const onClose = jest.fn();
    await renderSheet(
      <WorkoutEditSheet
        workout={workout}
        onSubmit={async () => {}}
        onClose={onClose}
      />
    );

    await click('취소');
    await click('닫기');
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
