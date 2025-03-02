import { useState, useEffect } from 'react';
import { User } from '@/types';
import { ClubJoinFormData } from '@/types/club.types';
import { createInitialFormData } from '@/utils/clubForms';

export const useClubJoinForm = (user: User, isGuestApplication = false) => {
  const [formData, setFormData] = useState<ClubJoinFormData>(() =>
    createInitialFormData({
      name: user?.nickname || '',
      isGuestApplication,
    })
  );

  const [phoneNumbers, setPhoneNumbers] = useState({
    first: '',
    second: '',
    third: '',
  });

  useEffect(() => {
    if (user?.nickname) {
      setFormData((prev) => ({
        ...prev,
        name: user.nickname,
      }));
    }
  }, [user?.nickname]);

  const onChangePhoneNumber = (
    e: React.ChangeEvent<HTMLInputElement>,
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

  const onChangeInput = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
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
  };
};
