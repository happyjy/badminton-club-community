import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';

import { User } from '@/types';
import { ClubJoinFormData } from '@/types/club.types';
import { createInitialFormData } from '@/utils/clubForms';
import {
  fillPhoneParts,
  joinPhoneParts,
  splitPhoneParts,
  type PhoneNumberParts,
} from '@/utils/phoneNumber';

export const useClubJoinForm = (
  user: User,
  isGuestApplication = false,
  initialValues?: Partial<ClubJoinFormData>,
  clubMember?: any
) => {
  // 클럽 멤버 여부에 따라 postType 결정
  const postType = clubMember ? 'GUEST_REQUEST' : 'JOIN_INQUIRY_REQUEST';

  // 폼 데이터 입력 필드 상태 관리
  const [formData, setFormData] = useState<ClubJoinFormData>(() => {
    // initialValues가 있으면 그것을 우선 사용
    if (initialValues) {
      return {
        ...createInitialFormData({
          isGuestApplication,
          isClubMember: !!clubMember,
        }),
        ...initialValues,
        ...(!clubMember && { intendToJoin: true }), // 클럽 멤버가 아닌 경우 가입 의사를 true로 설정
        postType, // postType 추가
      };
    }
    // 없으면 기본값 사용
    return {
      ...createInitialFormData({
        isGuestApplication,
        isClubMember: !!clubMember,
      }),
      ...(!clubMember && { intendToJoin: true }), // 클럽 멤버가 아닌 경우 가입 의사를 true로 설정
      postType, // postType 추가
    };
  });
  // 전화번호 입력 필드 상태 관리
  // split('-')이 아니라 자리 수로 나눈다. 하이픈이 빠졌거나 이미 손상된 값이
  // 들어와도 각 칸의 최대 길이를 넘지 않아, 편집할 때마다 손상이
  // 되살아나던 문제가 생기지 않는다.
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumberParts>(() =>
    splitPhoneParts(initialValues?.phoneNumber)
  );

  // 닉네임 변경 시 폼 데이터 업데이트
  useEffect(() => {
    if (user?.nickname && !initialValues?.name) {
      setFormData((prev) => ({
        ...prev,
      }));
    }
  }, [user?.nickname, initialValues?.name]);

  // 초기 폼 데이터 설정 함수
  const initialFormData = () => {
    setFormData(() =>
      createInitialFormData({
        isGuestApplication,
      })
    );
    setPhoneNumbers({
      first: '',
      second: '',
      third: '',
    });
  };

  // 전화번호 입력 필드 변경 함수
  const onChangePhoneNumber = (
    e: ChangeEvent<HTMLInputElement>,
    part: 'first' | 'second' | 'third'
  ) => {
    // 자동완성·붙여넣기는 한 칸에 번호 전체를 넣는다. 칸마다 제 몫만 자르면
    // 나머지 자리가 버려지므로, 넘치는 값은 뒤 칸으로 밀어 담는다.
    const nextParts = fillPhoneParts(phoneNumbers, part, e.target.value);

    // 다음 상태를 먼저 만들어 두 state에 함께 반영한다.
    // 이전 코드는 phoneNumbers를 클로저에서 읽어 formData가 한 박자 밀렸다.
    setPhoneNumbers(nextParts);
    setFormData((prev) => ({
      ...prev,
      phoneNumber: joinPhoneParts(nextParts),
    }));

    // 한 칸을 채우면 다음 칸으로 넘어간다. 여러 칸이 한꺼번에 찬 자동완성은
    // 이미 뒤 칸까지 채워졌으므로 마지막 칸으로 보낸다.
    const maxLength = part === 'first' ? 3 : 4;
    if (nextParts[part].length === maxLength && part !== 'third') {
      const isFilledByAutofill = !!nextParts.third;
      const nextInput = isFilledByAutofill
        ? 'third'
        : part === 'first'
          ? 'second'
          : 'third';
      document.getElementById(`phone-${nextInput}`)?.focus();
    }
  };

  // 입력 필드 변경 함수
  const onChangeInput = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (e.target instanceof HTMLInputElement && e.target.type === 'checkbox') {
      // 체크박스인 경우
      setFormData((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      // 체크박스가 아닌 경우
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  return {
    formData,
    phoneNumbers,
    onChangePhoneNumber,
    onChangeInput,
    //
    initialFormData,
  };
};
