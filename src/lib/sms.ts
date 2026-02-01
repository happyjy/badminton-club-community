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

// 전화번호 형식 검증 및 정리 함수
function validateAndCleanPhoneNumber(phoneNumber: string): string {
  // 숫자만 추출
  const cleaned = phoneNumber.replace(/[^0-9]/g, '');

  // 한국 전화번호 형식 검증 (010, 011, 016, 017, 018, 019로 시작하는 10-11자리)
  const phoneRegex = /^(01[0-9])\d{7,8}$/;

  if (!phoneRegex.test(cleaned)) {
    throw new Error(`유효하지 않은 전화번호 형식입니다: ${phoneNumber}`);
  }

  return cleaned;
}

// SMS 전송 함수
export async function sendSMS(to: string, content: string): Promise<any> {
  validateSensConfig();

  // 환경변수 검증 후 타입 단언으로 타입 에러 해결
  const serviceId = SENS_SERVICE_ID as string;
  const accessKey = SENS_ACCESS_KEY as string;
  const secretKey = SENS_SECRET_KEY as string;
  const fromNumber = SENS_FROM_NUMBER as string;

  // 발신번호 형식 검증 및 정리
  const cleanedFromNumber = validateAndCleanPhoneNumber(fromNumber);
  const cleanedToNumber = validateAndCleanPhoneNumber(to);

  const timestamp = Date.now().toString();
  const method = 'POST';
  const url = `/sms/v2/services/${serviceId}/messages`;

  // 디버깅을 위한 로그
  console.log('SMS 전송 설정:', {
    serviceId: serviceId,
    fromNumber: cleanedFromNumber,
    to: cleanedToNumber,
    content: content,
    url: url,
  });

  // Signature 생성
  const signature = generateSignature(
    timestamp,
    method,
    url,
    accessKey,
    secretKey
  );

  // 요청 헤더
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'x-ncp-apigw-timestamp': timestamp,
    'x-ncp-iam-access-key': accessKey,
    'x-ncp-apigw-signature-v2': signature,
  };

  // 요청 바디
  const body = {
    type: 'SMS',
    contentType: 'COMM',
    countryCode: '82',
    from: cleanedFromNumber,
    content: content,
    messages: [
      {
        to: cleanedToNumber,
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
    // axios 에러 타입으로 캐스팅하여 안전하게 접근
    const axiosError = error as any;
    console.error('SMS 전송 오류 상세:', {
      error: error,
      response: axiosError.response?.data,
      status: axiosError.response?.status,
      statusText: axiosError.response?.statusText,
    });
    throw error;
  }
}

// 게스트 신청 SMS 메시지 생성
export function createGuestApplicationSMSMessage(
  guestName: string,
  clubName: string,
  applicantName?: string | null
): string {
  if (applicantName) {
    return `[${clubName}] 게스트 신청: ${applicantName}→${guestName} (관리자 확인 필요)`;
  }
  return `[${clubName}] 게스트 신청: ${guestName} (관리자 확인 필요)`;
}
