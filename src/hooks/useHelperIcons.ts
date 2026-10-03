import { useCallback, useRef, useState } from 'react';

import { SelectedIcon } from '@/components/organisms/workout/HelperSheet';

/** 한 사람에 기록할 수 있는 도움의 수 */
export const HELPER_LIMIT = 3;

/** userId → 그 사람이 한 도움 */
export type ParticipantIcons = Record<string, SelectedIcon[]>;

const keyOf = (userId: number, icon: SelectedIcon) => `${userId}:${icon}`;

/**
 * 운동 참여자의 도움 기록(네트 설치, 청소 등)을 들고 있다가 서버에 저장한다.
 *
 * - 저장이 끝난 뒤에만 화면의 기록을 바꾼다.
 * - 같은 항목의 저장이 진행 중이면 다시 눌러도 요청을 보내지 않는다.
 *   (연달아 두 번 누르면 화면과 서버가 어긋나던 문제를 막는다.)
 * - 한 사람에 HELPER_LIMIT개가 차면 더 고르지 못하게 하고 이유를 알린다.
 */
export function useHelperIcons(workoutId: string | string[] | undefined) {
  const [icons, setIconsState] = useState<ParticipantIcons>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pendingKeys, setPendingKeys] = useState<ReadonlySet<string>>(
    new Set()
  );

  // 같은 틱에 연달아 불려도 최신 값을 보도록 ref로도 들고 있는다.
  const iconsRef = useRef<ParticipantIcons>({});
  const pendingRef = useRef(new Set<string>());

  const setIcons = useCallback((next: ParticipantIcons) => {
    iconsRef.current = next;
    setIconsState(next);
  }, []);

  const toggle = useCallback(
    async (
      userId: number,
      clubMemberId: number | undefined,
      icon: SelectedIcon
    ) => {
      if (!clubMemberId) return;

      const key = keyOf(userId, icon);
      if (pendingRef.current.has(key)) return;

      const current = iconsRef.current[userId] ?? [];
      const isSelected = !current.includes(icon);

      if (isSelected) {
        // 지금 저장 중인 "추가"도 센다.
        const pendingAdds = [...pendingRef.current].filter(
          (pendingKey) =>
            pendingKey.startsWith(`${userId}:`) &&
            !current.includes(pendingKey.split(':')[1] as SelectedIcon)
        ).length;

        if (current.length + pendingAdds >= HELPER_LIMIT) {
          setMessage(
            `도움은 한 사람에 ${HELPER_LIMIT}개까지 기록할 수 있어요.`
          );
          return;
        }
      }

      pendingRef.current.add(key);
      setPendingKeys(new Set(pendingRef.current));
      setMessage(null);

      try {
        const response = await fetch(
          `/api/workouts/${workoutId}/helper-status`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              iconType: icon,
              isSelected,
              targetUserId: userId,
              clubMemberId,
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to update helper status');
        }

        const latest = iconsRef.current[userId] ?? [];
        setIcons({
          ...iconsRef.current,
          [userId]: isSelected
            ? [...latest, icon]
            : latest.filter((value) => value !== icon),
        });
      } catch (error) {
        console.error('Failed to update helper status:', error);
        setMessage(
          '도움 기록을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.'
        );
      } finally {
        pendingRef.current.delete(key);
        setPendingKeys(new Set(pendingRef.current));
      }
    },
    [workoutId, setIcons]
  );

  const isPending = useCallback(
    (userId: number, icon: SelectedIcon) =>
      pendingKeys.has(keyOf(userId, icon)),
    [pendingKeys]
  );

  const clearMessage = useCallback(() => setMessage(null), []);

  return { icons, setIcons, toggle, isPending, message, clearMessage };
}
