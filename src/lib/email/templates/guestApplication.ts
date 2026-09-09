import { GuestPost } from '@prisma/client';

import { getGuestPageStrategyByPostType } from '@/strategies/GuestPageStrategy';

const formatDate = (date: Date | string | null) => {
  if (!date) return '미입력';
  if (date === '') return '미입력';
  return new Date(date).toLocaleDateString('ko-KR');
};

const formatBoolean = (value: boolean) => {
  return value ? '예' : '아니오';
};

export const generateGuestApplicationEmailTemplate = (
  application: GuestPost,
  url: string
) => {
  // 관리자는 이 메일만 보고 연락하므로 누구 번호인지 드러나야 한다.
  // 게스트 신청은 회원이 남의 방문을 대신 신청해 번호 주인이 게스트가 아니다.
  const strategy = getGuestPageStrategyByPostType(application.postType);

  const tableRows = [
    { label: '이름', value: application.name },
    { label: '생년월일', value: formatDate(application.birthDate) },
    { label: strategy.getPhoneLabel(), value: application.phoneNumber },
    { label: '성별', value: application.gender || '미입력' },
    {
      label: '지역 대회 수준',
      value: application.localTournamentLevel || '미입력',
    },
    {
      label: '전국 대회 수준',
      value: application.nationalTournamentLevel || '미입력',
    },
    { label: '레슨 기간', value: application.lessonPeriod || '미입력' },
    { label: '플레이 기간', value: application.playingPeriod || '미입력' },
    { label: '입회 희망', value: formatBoolean(application.intendToJoin) },
    { label: '방문 희망일', value: formatDate(application.visitDate) },
    { label: '메시지', value: application.message || '미입력' },
  ];

  const tableHTML = tableRows
    .map(
      (row) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${row.label}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${row.value}</td>
      </tr>
    `
    )
    .join('');

  return `
    <h2>새로운 게스트 신청</h2>
    <p>새로운 게스트 신청이 접수되었습니다.</p>
    
    <p>아래 링크에서 신청 내용을 확인해주세요:</p>
    <a href="${url}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">신청 내용 보기</a>
    
    <h3>신청자 정보</h3>
    <table style="border-collapse: collapse; width: 100%; margin-bottom: 20px;">
      <tr style="background-color: #f5f5f5;">
        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">항목</th>
        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">내용</th>
      </tr>
      ${tableHTML}
    </table>

    
  `;
};
