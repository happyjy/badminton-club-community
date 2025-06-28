import crypto from 'crypto';

import axios from 'axios';

// SENS SMS API 설정
const SENS_SERVICE_ID = process.env.SENS_SERVICE_ID;
const SENS_ACCESS_KEY = process.env.SENS_ACCESS_KEY;
const SENS_SECRET_KEY = process.env.SENS_SECRET_KEY;
const SENS_FROM_NUMBER = process.env.SENS_FROM_NUMBER;

// SENS API URL
const SENS_API_URL = 'https://sens.apigw.ntruss.com';

// 환경 변수 검증 함수
function validateSensConfig() {
  const missingVars = [];

  if (!SENS_SERVICE_ID) missingVars.push('SENS_SERVICE_ID');
  if (!SENS_ACCESS_KEY) missingVars.push('SENS_ACCESS_KEY');
  if (!SENS_SECRET_KEY) missingVars.push('SENS_SECRET_KEY');
  if (!SENS_FROM_NUMBER) missingVars.push('SENS_FROM_NUMBER');

  if (missingVars.length > 0) {
    throw new Error(
      `SENS 환경 변수가 설정되지 않았습니다: ${missingVars.join(', ')}`
    );
  }

  console.log('SENS 환경 변수 검증 완료:', {
    serviceId: SENS_SERVICE_ID ? '설정됨' : '미설정',
    accessKey: SENS_ACCESS_KEY ? '설정됨' : '미설정',
    secretKey: SENS_SECRET_KEY ? '설정됨' : '미설정',
    fromNumber: SENS_FROM_NUMBER ? '설정됨' : '미설정',
  });
}

// Signature 생성 함수
function generateSignature(
  timestamp: string,
  method: string,
  url: string,
  accessKey: string,
  secretKey: string
): string {
  const message = `${method} ${url}\n${timestamp}\n${accessKey}`;
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(message)
    .digest('base64');
  return signature;
}

// SMS 전송 함수
export async function sendSMS(to: string, content: string): Promise<any> {
  validateSensConfig();

  const timestamp = Date.now().toString();
  const method = 'POST';
  const url = `/sms/v2/services/${SENS_SERVICE_ID}/messages`;

  // 디버깅을 위한 로그
  console.log('SMS 전송 설정:', {
    serviceId: SENS_SERVICE_ID,
    fromNumber: SENS_FROM_NUMBER,
    to: to,
    content: content,
    url: url,
  });

  // Signature 생성
  const signature = generateSignature(
    timestamp,
    method,
    url,
    SENS_ACCESS_KEY,
    SENS_SECRET_KEY
  );

  // 요청 헤더
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'x-ncp-apigw-timestamp': timestamp,
    'x-ncp-iam-access-key': SENS_ACCESS_KEY,
    'x-ncp-apigw-signature-v2': signature,
  };

  // 요청 바디
  const body = {
    type: 'SMS',
    contentType: 'COMM',
    countryCode: '82',
    from: SENS_FROM_NUMBER,
    content: content,
    messages: [
      {
        to: to.replace(/-/g, ''), // 하이픈 제거
      },
    ],
  };

  try {
    const fullUrl = `${SENS_API_URL}${url}`;
    console.log('SMS API 요청 URL:', fullUrl);
    console.log('SMS API 요청 헤더:', headers);
    console.log('SMS API 요청 바디:', body);

    const response = await axios.post(fullUrl, body, { headers });

    console.log('SMS API 응답:', response.data);

    if (response.data.statusCode === '202') {
      return {
        success: true,
        requestId: response.data.requestId,
        statusCode: response.data.statusCode,
        statusName: response.data.statusName,
      };
    } else {
      throw new Error(`SMS 전송 실패: ${response.data.statusName}`);
    }
  } catch (error) {
    console.error('SMS 전송 오류 상세:', {
      error: error,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
    });
    throw error;
  }
}

// 게스트 신청 SMS 메시지 생성
export function createGuestApplicationSMSMessage(
  guestName: string,
  clubName: string
): string {
  return `[${clubName}] ${guestName}님이 게스트 신청을 하셨습니다. 클럽 관리자 페이지에서 확인해주세요.`;
}
