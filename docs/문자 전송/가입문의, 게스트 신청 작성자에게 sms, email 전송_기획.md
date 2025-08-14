# 가입문의, 게스트 신청 작성자에게 SMS, Email 전송 기능 기획서

## 1. 개요

- "가입 문의, 게스트 신청 모달"을 작성한 사람에게 문자 전송하기
- 문자 전송은 아래 2가지 케이스에서 **최초 일 회만** 보낼 수 있게 한다.

## 2. 문자 전송 케이스

### 2.1 첫 번째: 승인/거절 상태 업데이트 시

- 게스트 신청의 상태가 `PENDING` → `APPROVED` 또는 `REJECTED`로 변경될 때
- 해당 게시글 작성자에게 최초 1회만 문자 전송

### 2.2 두 번째: 본인이 아닌 다른 사람이 남긴 댓글

- 게스트 신청 게시글에 다른 사람이 댓글을 작성할 때
- 게시글 작성자에게 최초 1회만 문자 전송

## 3. 데이터베이스 설계

### 3.1 새로운 테이블: SmsNotificationLog

```prisma
model SmsNotificationLog {
  id                 Int                @id @default(autoincrement())
  guestPostId        String             // 게스트 신청 게시글 ID
  userId             Int                // 문자를 받을 사용자 ID
  notificationType   NotificationType   // 알림 타입
  sentAt             DateTime           @default(now())

  // Relations
  guestPost          GuestPost @relation(fields: [guestPostId], references: [id], onDelete: Cascade)
  user               User      @relation(fields: [userId], references: [id])

  @@unique([guestPostId, userId, notificationType]) // 중복 전송 방지
  @@index([guestPostId])
  @@index([userId])
}

enum NotificationType {
  STATUS_UPDATE    // 승인/거절 상태 업데이트
  COMMENT_ADDED    // 댓글 추가
}
```

### 3.2 기존 테이블 수정사항

- `GuestPost` 테이블에 `SmsNotificationLog[]` 관계 추가
- `User` 테이블에 `SmsNotificationLog[]` 관계 추가

## 4. 시스템 동작 흐름

### 4.1 승인/거절 상태 업데이트 시 문자 전송

1. 관리자가 게스트 신청 상태를 승인/거절로 변경
2. 시스템이 `SmsNotificationLog` 테이블에서 해당 게시글의 `STATUS_UPDATE` 타입 로그 존재 여부 확인
3. 로그가 없으면:
   - SMS 전송 실행
   - `SmsNotificationLog`에 전송 기록 저장
4. 로그가 있으면: SMS 전송하지 않음

### 4.2 댓글 추가 시 문자 전송

1. 사용자가 게스트 신청 게시글에 댓글 작성
2. 시스템이 댓글 작성자가 게시글 작성자와 다른지 확인
3. 다른 사람이면 `SmsNotificationLog` 테이블에서 해당 게시글의 `COMMENT_ADDED` 타입 로그 존재 여부 확인
4. 로그가 없으면:
   - SMS 전송 실행
   - `SmsNotificationLog`에 전송 기록 저장
5. 로그가 있으면: SMS 전송하지 않음

## 5. API 설계

### 5.1 문자 전송 여부 확인 API

```typescript
// GET /api/clubs/[clubId]/guests/[guestId]/sms-status
interface SmsStatusResponse {
  statusUpdateSmsSent: boolean;
  commentAddedSmsSent: boolean;
}
```

### 5.2 문자 전송 실행 API

```typescript
// POST /api/clubs/[clubId]/guests/[guestId]/send-sms
interface SendSmsRequest {
  notificationType: 'STATUS_UPDATE' | 'COMMENT_ADDED';
}
```

## 6. 구현 우선순위

### Phase 1: 데이터베이스 스키마

- `SmsNotificationLog` 테이블 생성
- 기존 테이블 관계 설정
- 마이그레이션 스크립트 작성

### Phase 2: 핵심 로직

- 문자 전송 여부 확인 함수 구현
- 문자 전송 실행 함수 구현
- 중복 전송 방지 로직 구현

### Phase 3: API 연동

- 승인/거절 상태 업데이트 시 문자 전송 연동
- 댓글 추가 시 문자 전송 연동
- 문자 전송 상태 조회 API 구현

### Phase 4: 테스트 및 검증

- 단위 테스트 작성
- 통합 테스트 작성
- 실제 SMS 전송 테스트

## 7. 고려사항

### 7.1 성능

- `@@unique` 제약조건으로 중복 전송 방지
- 적절한 인덱스 설정으로 조회 성능 최적화

### 7.2 확장성

- 향후 다른 알림 타입 추가 시 `NotificationType` enum에 추가만 하면 됨
- 알림 관련 로직을 한 곳에서 관리하여 유지보수성 향상

### 7.3 데이터 무결성

- `onDelete: Cascade`로 게시글 삭제 시 관련 로그도 함께 삭제
- 전송 이력의 정확한 추적과 감사 가능

## 8. 예외 처리

### 8.1 SMS 전송 실패 시

- 전송 실패 로그 기록
- 재시도 메커니즘 구현 (선택사항)
- 관리자에게 알림 (선택사항)

### 8.2 사용자 전화번호 미등록 시

- SMS 전송 건너뛰기
- 로그에 전화번호 미등록 사유 기록

## 9. 모니터링 및 로깅

### 9.1 전송 성공률 모니터링

- 일별/월별 SMS 전송 성공률 추적
- 실패 원인별 통계 수집

### 9.2 사용자 행동 분석

- SMS 수신 후 사용자 반응률 분석
- 알림 효과성 측정
