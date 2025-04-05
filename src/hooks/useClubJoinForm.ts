import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';

import { User } from '@/types';
import { ClubJoinFormData } from '@/types/club.types';
import { createInitialFormData } from '@/utils/clubForms';

export const useClubJoinForm = (
  user: User,
  isGuestApplication = false,
  initialValues?: Partial<ClubJoinFormData>
) => {
  // 폼 데이터 입력 필드 상태 관리
  const [formData, setFormData] = useState<ClubJoinFormData>(() => {
    // initialValues가 있으면 그것을 우선 사용
    if (initialValues) {
      return {
        ...createInitialFormData({
          name: user?.nickname || '',
          isGuestApplication,
        }),
        ...initialValues,
      };
    }
    // 없으면 기본값 사용
    return createInitialFormData({
      name: user?.nickname || '',
      isGuestApplication,
    });
  });
  // 전화번호 입력 필드 상태 관리
  const [phoneNumbers, setPhoneNumbers] = useState(() => {
    if (initialValues?.phoneNumber) {
      // phoneNumber 형식: "010-1234-5678"
      const parts = initialValues.phoneNumber.split('-');
      return {
        first: parts[0] || '',
        second: parts[1] || '',
        third: parts[2] || '',
      };
    }
    return {
      first: '',
      second: '',
      third: '',
    };
  });

  // 닉네임 변경 시 폼 데이터 업데이트
  useEffect(() => {
    if (user?.nickname && !initialValues?.name) {
      setFormData((prev) => ({
        ...prev,
        name: user.nickname,
      }));
    }
  }, [user?.nickname, initialValues?.name]);

  // 초기 폼 데이터 설정 함수
  const initialFormData = () => {
    setFormData(() =>
      createInitialFormData({
        name: user?.nickname || '',
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
    const value = e.target.value.replace(/[^0-9]/g, '');
    const maxLength = part === 'first' ? 3 : 4;

    if (value.length > maxLength) return;

    setPhoneNumbers((prev) => ({
      ...prev,
      [part]: value,
    }));

    if (value.length === maxLength) {
      const nextInput = {
        first: 'second',
        second: 'third',
        third: 'third',
      }[part];

      const nextElement = document.getElementById(`phone-${nextInput}`);
      nextElement?.focus();
    }

    const fullPhoneNumber = `${part === 'first' ? value : phoneNumbers.first}-${
      part === 'second' ? value : phoneNumbers.second
    }-${part === 'third' ? value : phoneNumbers.third}`;

    setFormData((prev) => ({
      ...prev,
      phoneNumber: fullPhoneNumber,
    }));
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
