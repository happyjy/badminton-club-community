import { useEffect, useState } from 'react';

import { useRouter } from 'next/router';

import axios from 'axios';
import { useSelector } from 'react-redux';

import { ListGroup } from '@/components/molecules/list/ListGroup';
import { ListRow } from '@/components/molecules/list/ListRow';
import { OptionPicker } from '@/components/molecules/OptionPicker';
import ClubHomeSettingsForm from '@/components/organisms/forms/ClubHomeSettingsForm';
import EmailSettingsForm from '@/components/organisms/forms/EmailSettingsForm';
import GuestPageSettingsForm from '@/components/organisms/forms/GuestPageSettingsForm';
import MenuSettingsForm from '@/components/organisms/forms/MenuSettingsForm';
import ParkingSettingsForm from '@/components/organisms/forms/ParkingSettingsForm';
import SmsSettingsForm from '@/components/organisms/forms/SmsSettingsForm';
import WorkoutScheduleForm from '@/components/organisms/forms/WorkoutScheduleForm';
import { PageHeader } from '@/components/organisms/PageHeader';

import { RootState } from '@/store';
import { Role } from '@/types/enums';
import { ClubParkingSettingsResponse } from '@/types/parking.types';

interface CustomSetting {
  id: string;
  name: string;
  /** 오른쪽 설정 영역의 제목 */
  title: string;
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
    title: '클럽 홈 설명 설정',
    description: '클럽 홈 화면의 운영 시간, 장소, 설명을 설정합니다.',
  },
  {
    id: 'guest-page',
    name: '게스트/문의 페이지',
    title: '게스트/문의 페이지 설정',
    description: '게스트 신청 또는 문의하기 페이지의 설명글을 설정합니다.',
  },
  {
    id: 'email',
    name: '이메일 발송',
    title: '이메일 발송 설정',
    description: '이메일을 받을 사람을 설정합니다.',
  },
  {
    id: 'sms',
    name: '문자 발송',
    title: '문자 발송 설정',
    description: '문자를 받을 사람을 설정합니다.',
  },
  {
    id: 'workout-schedule',
    name: '운동 일정 생성',
    title: '운동 일정 설정',
    description: '정기적인 운동 일정을 자동으로 생성합니다.',
  },
  {
    id: 'parking',
    name: '주차 신청',
    title: '주차 신청 설정',
    description: '주차 신청 기능 사용 여부와 기본 주차 대수를 설정합니다.',
  },
  {
    id: 'menu',
    name: '메뉴 설정',
    title: '메뉴 설정',
    description: '클럽 메뉴에 보일 탭을 설정합니다.',
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
  const [workoutScheduleSettings, setWorkoutScheduleSettings] = useState<{
    startDate: string;
    endDate: string;
    weekdayStartTime: string;
    weekdayEndTime: string;
    weekendStartTime: string;
    weekendEndTime: string;
    location: string;
    maxParticipants: number;
  } | null>(null);
  const [parkingSettings, setParkingSettings] =
    useState<ClubParkingSettingsResponse | null>(null);

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
        .get(`/api/clubs/${clubId}/custom/guest-page`)
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

  // 운동 일정 설정 불러오기
  useEffect(() => {
    if (clubId && selectedSetting === 'workout-schedule') {
      // 운동 일정 설정은 기본값으로 초기화
      setWorkoutScheduleSettings({
        startDate: '',
        endDate: '',
        weekdayStartTime: '',
        weekdayEndTime: '',
        weekendStartTime: '',
        weekendEndTime: '',
        location: '',
        maxParticipants: 10,
      });
    }
  }, [clubId, selectedSetting]);

  // 주차 설정 불러오기
  useEffect(() => {
    if (clubId && selectedSetting === 'parking') {
      axios
        .get(`/api/clubs/${clubId}/custom/parking`)
        .then(({ data }) => setParkingSettings(data))
        .catch((error) =>
          console.error('Error fetching parking settings:', error)
        );
    }
  }, [clubId, selectedSetting]);

  if (!isAdmin) {
    return (
      <p role="alert" className="py-12 text-center text-callout text-negative">
        접근 권한이 없습니다.
      </p>
    );
  }

  const renderForm = () => {
    switch (selectedSetting) {
      case 'club-home':
        return (
          <ClubHomeSettingsForm
            clubId={clubId as string}
            initialData={clubHomeSettings}
          />
        );
      case 'guest-page':
        return (
          <GuestPageSettingsForm
            clubId={clubId as string}
            initialData={clubCustomSettings}
          />
        );
      case 'email':
        return (
          <EmailSettingsForm
            clubId={clubId as string}
            initialData={emailSettings}
          />
        );
      case 'sms':
        return (
          <SmsSettingsForm
            clubId={clubId as string}
            initialData={smsSettings}
          />
        );
      case 'workout-schedule':
        return (
          <WorkoutScheduleForm
            clubId={clubId as string}
            initialData={workoutScheduleSettings}
          />
        );
      case 'parking':
        return (
          <ParkingSettingsForm
            settings={parkingSettings}
            onSubmit={async (values) => {
              const { data } = await axios.put(
                `/api/clubs/${clubId}/custom/parking`,
                values
              );
              setParkingSettings(data);
            }}
          />
        );
      case 'menu':
        return <MenuSettingsForm clubId={clubId as string} />;
      default:
        return null;
    }
  };

  const current = customSettings.find(
    (setting) => setting.id === selectedSetting
  );

  return (
    <>
      <PageHeader title="커스텀 설정" />
      <div className="lg:flex lg:items-start lg:gap-6">
        {/* 설정 고르기: 휴대폰은 아래 시트로 고르는 버튼, PC는 왼쪽 메뉴 */}
        <div className="mb-4 lg:hidden">
          <OptionPicker
            aria-label="설정 항목"
            options={customSettings.map((setting) => ({
              value: setting.id,
              label: setting.name,
            }))}
            value={selectedSetting}
            onChange={setSelectedSetting}
            className="text-headline"
          />
        </div>
        <nav aria-label="설정 항목" className="hidden w-64 shrink-0 lg:block">
          <ListGroup>
            {customSettings.map((setting) => (
              <ListRow
                key={setting.id}
                title={setting.name}
                subtitle={setting.description}
                onClick={() => setSelectedSetting(setting.id)}
                aria-current={
                  selectedSetting === setting.id ? 'page' : undefined
                }
                className={
                  selectedSetting === setting.id ? 'bg-fill' : undefined
                }
              />
            ))}
          </ListGroup>
        </nav>

        <section className="min-w-0 flex-1 rounded-md bg-surface p-4 lg:p-6">
          {current && (
            <>
              <h2 className="text-title text-primary">{current.title}</h2>
              <p className="mb-4 mt-1 text-footnote text-secondary">
                {current.description}
              </p>
            </>
          )}
          {renderForm()}
        </section>
      </div>
    </>
  );
}

export default CustomSettingPage;
