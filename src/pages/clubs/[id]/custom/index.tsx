import { useEffect, useState } from 'react';

import { useRouter } from 'next/router';

import axios from 'axios';
import { useSelector } from 'react-redux';

import ClubHomeSettingsForm from '@/components/organisms/forms/ClubHomeSettingsForm';
import EmailSettingsForm from '@/components/organisms/forms/EmailSettingsForm';
import GuestPageSettingsForm from '@/components/organisms/forms/GuestPageSettingsForm';
import SmsSettingsForm from '@/components/organisms/forms/SmsSettingsForm';
import { RootState } from '@/store';
import { Role } from '@/types/enums';

interface CustomSetting {
  id: string;
  name: string;
  description: string;
}

interface ClubHomeSettings {
  clubOperatingTime?: string;
  clubLocation?: string;
  clubDescription?: string;
}

const customSettings: CustomSetting[] = [
  {
    id: 'club-home',
    name: '클럽 홈 설명',
    description: '클럽 홈 화면의 운영 시간, 장소, 설명을 설정합니다.',
  },
  {
    id: 'guest-page',
    name: '게스트/문의 페이지',
    description: '게스트 신청 또는 문의하기 페이지의 설명글을 설정합니다.',
  },
  {
    id: 'email',
    name: '이메일 발송',
    description: '이메일을 받을 사람을 설정합니다.',
  },
  {
    id: 'sms',
    name: '문자 발송',
    description: '문자를 받을 사람을 설정합니다.',
  },
];

function CustomSettingPage() {
  const router = useRouter();
  const { id: clubId } = router.query;
  const [selectedSetting, setSelectedSetting] = useState<string>('club-home');
  const [clubHomeSettings, setClubHomeSettings] = useState<ClubHomeSettings>(
    {}
  );
  const [clubCustomSettings, setClubCustomSettings] = useState<{
    inquiryDescription: string;
    guestDescription: string;
  } | null>(null);
  const [emailSettings, setEmailSettings] = useState<{
    emailRecipients: string;
  } | null>(null);
  const [smsSettings, setSmsSettings] = useState<{
    smsRecipients: string;
  } | null>(null);

  const clubMember = useSelector((state: RootState) => state.auth.clubMember);
  const isAdmin = clubMember?.role === Role.ADMIN;

  // 클럽 홈 설정 불러오기
  useEffect(() => {
    if (clubId && selectedSetting === 'club-home') {
      axios
        .get(`/api/clubs/${clubId}/custom/home`)
        .then(({ data }) => {
          return setClubHomeSettings(data);
        })
        .catch((error) =>
          console.error('Error fetching club home settings:', error)
        );
    }
  }, [clubId, selectedSetting]);

  // 게스트/문의 페이지 설정 불러오기
  useEffect(() => {
    if (clubId && selectedSetting === 'guest-page') {
      axios
        .get(`/api/clubs/${clubId}/custom-settings`)
        .then(({ data }) => {
          return setClubCustomSettings({
            inquiryDescription: data.inquiryDescription || '',
            guestDescription: data.guestDescription || '',
          });
        })
        .catch((error) =>
          console.error('Error fetching guest page settings:', error)
        );
    }
  }, [clubId, selectedSetting]);

  // 이메일 설정 불러오기
  useEffect(() => {
    if (clubId && selectedSetting === 'email') {
      axios
        .get(`/api/clubs/${clubId}/custom/email`)
        .then(({ data }) => {
          // emailRecipients가 배열이면 string으로 변환
          const emailRecipients = Array.isArray(data.emailRecipients)
            ? data.emailRecipients.join(',')
            : data.emailRecipients || '';

          return setEmailSettings({
            emailRecipients,
          });
        })
        .catch((error) =>
          console.error('Error fetching email settings:', error)
        );
    }
  }, [clubId, selectedSetting]);

  // 문자 발송 설정 불러오기
  useEffect(() => {
    if (clubId && selectedSetting === 'sms') {
      axios
        .get(`/api/clubs/${clubId}/custom/sms`)
        .then(({ data }) => {
          // smsRecipients가 배열이면 string으로 변환
          const smsRecipients = Array.isArray(data.smsRecipients)
            ? data.smsRecipients.join(',')
            : data.smsRecipients || '';

          return setSmsSettings({
            smsRecipients,
          });
        })
        .catch((error) => console.error('Error fetching SMS settings:', error));
    }
  }, [clubId, selectedSetting]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">접근 권한이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">커스텀 설정</h1>
      <div className="flex flex-col md:flex-row gap-6">
        {/* 왼쪽 메뉴 */}
        <div className="w-full md:w-64 bg-white rounded-lg shadow p-4">
          <nav>
            <ul className="space-y-2">
              {customSettings.map((setting) => (
                <li key={setting.id}>
                  <button
                    onClick={() => setSelectedSetting(setting.id)}
                    className={`w-full text-left px-4 py-2 rounded ${
                      selectedSetting === setting.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-medium">{setting.name}</div>
                    <div className="text-sm text-gray-500">
                      {setting.description}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* 오른쪽 설정 영역 */}
        <div className="flex-1 bg-white rounded-lg shadow p-6">
          {selectedSetting === 'club-home' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">클럽 홈 설명 설정</h2>
              <ClubHomeSettingsForm
                clubId={clubId as string}
                initialData={clubHomeSettings}
              />
            </div>
          )}
          {selectedSetting === 'guest-page' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                게스트/문의 페이지 설정
              </h2>
              <GuestPageSettingsForm
                clubId={clubId as string}
                initialData={clubCustomSettings}
              />
            </div>
          )}
          {selectedSetting === 'email' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">이메일 발송 설정</h2>
              <EmailSettingsForm
                clubId={clubId as string}
                initialData={emailSettings}
              />
            </div>
          )}
          {selectedSetting === 'sms' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">문자 발송 설정</h2>
              <SmsSettingsForm
                clubId={clubId as string}
                initialData={smsSettings}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CustomSettingPage;
