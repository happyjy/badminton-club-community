# 대회 모집 요강 첨부파일 설계

작성일: 2026-08-19

## 1. 배경과 목적

대회 모집 요강은 주최측이 **PDF나 이미지 파일**로 배포하는 경우가 대부분이다. 현재 `Tournament.description`은 텍스트만 담을 수 있어, 관리자가 요강 내용을 손으로 옮겨 적거나 외부 링크를 본문에 붙여야 한다.

이 기능은 관리자가 요강 파일을 직접 올리고, 회원이 **신청 화면에서 곧바로 열어볼 수 있게** 한다.

**이 기능이 하지 않는 것:**

- 파일 내용 파싱 (요강에서 종목·참가비를 자동 추출하지 않는다)
- 파일 미리보기 렌더링 (브라우저 기본 동작에 맡긴다)
- 버전 관리 (교체하면 이전 파일은 사라진다)
- 신청자의 파일 업로드 (관리자만 올린다)

## 2. 확정된 요구사항

| 항목               | 결정                                                   |
| ------------------ | ------------------------------------------------------ |
| 파일 개수          | 대회당 여러 개 (요강 + 대진표 + 코트배정도 등)         |
| 파일 형식          | PDF, JPG, JPEG, PNG                                    |
| 용량 제한          | 파일당 10MB                                            |
| 저장소             | Supabase Storage, `tournament-files` 버킷 (**Public**) |
| 업로드 권한        | 해당 클럽 ADMIN                                        |
| 열람 권한          | 제한 없음 (공개 URL)                                   |
| 업로드 시점        | 대회 저장 후 (수정 화면에서만)                         |
| 기존 `description` | 그대로 유지. 첨부파일은 별도 항목                      |

### 2.1 Public 버킷을 택한 이유

Private + signed URL 방식도 검토했으나 다음 이유로 Public을 택했다.

- **비용**: Supabase 과금은 다운로드 바이트 기준이라 public/private 차이가 없다. 오히려 signed URL은 매번 달라져 CDN 캐시가 무효화되므로 대역폭을 **더** 쓴다.
- **규모**: 2MB 요강 × 100명 × 3회 열람 = 600MB/월. Pro 플랜 포함 250GB의 0.24% 수준이다.
- **노출 위험**: 파일 키가 cuid라 URL 추측이 불가능하고, 버킷 목록 조회는 막혀 있다. URL이 노출되는 대회 상세 페이지 자체가 이미 클럽 회원 인증으로 보호된다.

요강에 개인정보가 포함되는 상황이 생기면 private 전환을 재검토한다. 그때는 `fileUrl` 컬럼을 버리고 조회 시점에 signed URL을 발급하는 구조로 바꿔야 한다.

## 3. 아키텍처

### 3.1 업로드 경로

브라우저에서 Supabase로 **직접** 올리지 않는다. 그러려면 anon key에 Storage 쓰기 권한을 열어야 해서 누구나 버킷에 파일을 넣을 수 있게 된다. 서버를 경유해 기존 `withAuth` + `requireClubAdmin` 패턴으로 권한을 강제한다.

```
[관리자 브라우저]
   │ FormData(file)
   ▼
POST /api/clubs/:id/tournaments/:tid/files
   │ ① withAuth → requireClubAdmin(clubId)
   │ ② 대회가 해당 클럽 소속인지 확인
   │ ③ MIME·확장자·용량 검증
   │ ④ supabaseAdmin.storage.upload()   ← service_role 키
   │ ⑤ prisma.tournamentFile.create()
   ▼
[Supabase Storage: tournament-files (public)]
```

조회는 DB에 저장된 `fileUrl`을 그대로 `<a href>`에 쓰므로 별도 API가 필요 없다. 대회 상세 GET API에 `include`로 끼워넣는다.

### 3.2 Storage 경로 규칙

```
{clubId}/{tournamentId}/{cuid}.{ext}
```

원본 파일명(한글·공백 포함)은 Storage 키로 쓰지 않고 DB `fileName`에만 보관한다. Supabase 키에 한글이 들어가면 URL 인코딩 문제가 생기고, 같은 이름 파일을 두 번 올릴 때 충돌한다.

### 3.3 service_role 키

`src/lib/supabaseAdmin.ts`를 새로 만들고 **서버(API 라우트)에서만** import한다. 이 키는 RLS를 우회하는 마스터 키이므로 `NEXT_PUBLIC_` 접두어를 붙이면 안 된다.

기존 `src/lib/supabase.ts`(anon key)는 건드리지 않는다.

## 4. 데이터 모델

`prisma/schema/tournament.prisma`에 모델을 추가한다. `Tournament`에는 역방향 관계 한 줄만 추가한다.

```prisma
// 모집 요강 첨부파일 (관리자가 업로드)
model TournamentFile {
  id           String     @id @default(cuid())
  tournamentId String
  fileName     String                          // 사용자에게 보여줄 원본 이름
  storagePath  String                          // Supabase 키. 삭제할 때 필요
  fileUrl      String                          // 공개 URL
  fileSize     Int                             // bytes
  mimeType     String
  order        Int        @default(0)
  uploadedAt   DateTime   @default(now())

  tournament   Tournament @relation(fields: [tournamentId], references: [id], onDelete: Cascade)

  @@index([tournamentId])
}
```

`storagePath`를 `fileUrl`과 따로 두는 이유: 삭제할 때 URL을 역파싱하지 않고 바로 Storage 키를 쓸 수 있다.

`onDelete: Cascade`는 **DB 행만** 지운다. 대회를 지울 때 Storage 파일이 남지 않도록 삭제 API에서 명시적으로 정리한다 (§6.2).

## 5. 신규 대회의 순서 문제

`TournamentFile`은 `tournamentId`가 필요한데 신규 생성 화면(`new.tsx`)에는 아직 대회가 없다.

**결정: 신규 화면에서는 첨부 영역을 비활성화하고 안내 문구를 띄운다.**

> 대회를 먼저 저장하면 첨부파일을 올릴 수 있습니다.

파일을 메모리에 들고 있다가 저장 후 순차 업로드하는 방식(폼 상태 복잡, 중간 실패 시 부분 저장)이나 임시 DRAFT 대회를 미리 만드는 방식(이탈 시 유령 대회)보다 단순하고 실패 지점이 없다.

관리자는 저장 후 수정 화면으로 이동하면 되므로 클릭 한 번 차이다.

### 5.1 업로드는 폼 제출과 무관하다

파일 선택 → 즉시 POST → 목록에 반영. 폼의 "저장" 버튼과 연동하지 않는다. 폼 상태에 `File` 객체를 끌고 다니는 복잡도를 없앤다.

삭제도 마찬가지로 즉시 반영된다.

## 6. API

### 6.1 신규 엔드포인트

| 메서드 | 경로                                            | 권한       | 설명            |
| ------ | ----------------------------------------------- | ---------- | --------------- |
| GET    | `/api/clubs/:id/tournaments/:tid/files`         | 클럽 회원  | 첨부 목록 조회  |
| POST   | `/api/clubs/:id/tournaments/:tid/files`         | 클럽 ADMIN | 파일 1개 업로드 |
| DELETE | `/api/clubs/:id/tournaments/:tid/files/:fileId` | 클럽 ADMIN | 파일 1개 삭제   |

관리자 화면이 폼 제출과 무관하게 목록을 갱신해야 하므로 GET도 함께 둔다.

`bodyParser`를 꺼야 multipart를 받을 수 있다.

```ts
export const config = { api: { bodyParser: false } };
```

**멀티파트 파싱은 새 의존성 없이 처리한다.** 설계 당시에는 `formidable` 추가를 계획했으나, 실행 환경이 Node 22라 내장 `Request`/`FormData`로 충분했다. 요청 본문을 버퍼로 모아 `new Request(...).formData()`로 파싱한다. 파일이 10MB로 제한되므로 메모리에 올려도 안전하다.

### 6.2 기존 API 수정

| 파일                                         | 변경                                                    |
| -------------------------------------------- | ------------------------------------------------------- |
| `tournaments/[tournamentId]/index.ts` GET    | `include`에 `files: { orderBy: { order: 'asc' } }` 추가 |
| `tournaments/[tournamentId]/index.ts` DELETE | DB 삭제 전에 Storage 파일 일괄 제거                     |

대회 삭제 시 Storage 정리를 빠뜨리면 고아 파일이 영구히 쌓인다.

## 7. UI

### 7.1 관리자 — `TournamentForm.tsx`

① 섹션의 "모집 요강" textarea 바로 아래에 첨부 영역을 둔다.

```
모집 요강                    [기존 textarea 유지]

첨부파일
┌────────────────────────────────────────┐
│ 모집 요강.pdf      1.2MB        [삭제] │
│ 대진표.png         2.1MB        [삭제] │
└────────────────────────────────────────┘
[+ 파일 추가]   PDF·이미지, 10MB 이하
```

신규 생성 화면에서는 목록·버튼 대신 안내 문구만 보인다 (§5).

### 7.2 신청자 — 2곳

- **대회 상세**(`[tournamentId]/index.tsx`): 기존 "모집 요강" 섹션 안, 텍스트 아래
- **신청 페이지**(`apply.tsx`): `ApplyNotice` 아래

두 곳 모두 같은 `TournamentFileList` 컴포넌트를 쓴다. 파일이 없으면 아무것도 그리지 않는다 (`ApplyNotice`와 동일한 패턴).

클릭하면 `target="_blank"`로 새 탭에서 열린다. PDF·이미지 모두 브라우저가 바로 렌더한다.

## 8. 검증과 에러 처리

### 8.1 검증 규칙

`src/lib/tournament/fileValidation.ts`에 순수 함수로 분리한다. 클라이언트와 서버가 **같은 함수**를 쓴다.

```ts
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];
const ALLOWED_EXT = ['pdf', 'jpg', 'jpeg', 'png'];
const MAX_SIZE = 10 * 1024 * 1024;
```

확장자와 MIME을 **둘 다** 검사한다. 확장자만 보면 위조가 가능하고, MIME만 보면 브라우저마다 값이 흔들린다.

### 8.2 실패 처리

| 상황                           | 처리                                                     |
| ------------------------------ | -------------------------------------------------------- |
| 10MB 초과                      | 클라이언트에서 선택 즉시 차단 + 서버 재검증              |
| 허용 안 된 형식                | 위와 동일                                                |
| Storage 업로드 성공 후 DB 실패 | 업로드한 파일을 Storage에서 지우고 에러 반환 (고아 방지) |
| DB 삭제 성공 후 Storage 실패   | 로그만 남기고 성공 처리 (사용자에겐 이미 안 보인다)      |
| 관리자 아님                    | 기존 `requireClubAdmin`이 403                            |
| 다른 클럽의 대회               | 404                                                      |

## 9. 테스트

기존 `src/__tests__/components/tournament/` 패턴을 따른다.

| 대상          | 파일                                                                  | 검증 내용                                                 |
| ------------- | --------------------------------------------------------------------- | --------------------------------------------------------- |
| 검증 로직     | `src/lib/tournament/fileValidation.test.ts`                           | 용량 경계값, 허용/거부 MIME, 확장자 위조, 대소문자 확장자 |
| 목록 컴포넌트 | `src/__tests__/components/tournament/TournamentFileList.dom.test.tsx` | 빈 목록이면 렌더 안 함, 파일명·용량 표시, 링크 속성       |

업로드 API 핸들러는 Supabase·formidable 모킹 비용이 커서 자동 테스트하지 않는다. 검증 로직을 순수 함수로 뽑아 테스트하고, 핸들러 자체는 수동 확인한다.

## 10. 사전 준비 (완료됨)

1. Supabase 대시보드 → Storage → `tournament-files` 버킷 생성, **Public 켜기**
2. Settings → API → `service_role` 키 복사 → `.env`에 `SUPABASE_SERVICE_ROLE_KEY` 추가

배포 시 호스팅 환경(Vercel 등)에도 `SUPABASE_SERVICE_ROLE_KEY`를 동일하게 등록해야 한다.

## 10.1 마이그레이션 적용 시 발견한 문제

`prisma migrate dev`가 **데이터베이스 리셋을 요구했다.** 실행하지 않았다.

원인은 이 프로젝트가 그동안 `db push` 위주로 스키마를 반영해 와서, 마이그레이션 이력과 실제 DB가 어긋나 있었기 때문이다. `_prisma_migrations` 테이블 자체가 없었고, 스키마가 선언한 인덱스·FK 일부가 DB에 빠져 있었다.

**대응:** `TournamentFile` 생성 SQL만 손으로 떼어내 `prisma db execute`로 적용하고, `prisma migrate resolve --applied`로 기록했다. 기존 마이그레이션 9개도 같은 방식으로 적용됨 처리해 `migrate status`를 정상으로 되돌렸다.

**남은 부채(이 작업 범위 밖):** 스키마에 선언됐지만 DB에 없는 인덱스·FK가 여전히 있다. `PostCategory`, `PostComment`, `PaymentRecord` 등이 해당한다. 성능·정합성에 영향을 줄 수 있으므로 별도로 정리하는 편이 좋다. 확인 명령:

```bash
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma --script
```

## 11. 변경 파일 목록

| 구분   | 경로                                                                    |
| ------ | ----------------------------------------------------------------------- |
| 신규   | `prisma/schema/tournament.prisma` (모델 추가) + 마이그레이션            |
| 신규   | `src/lib/supabaseAdmin.ts`                                              |
| 신규   | `src/lib/tournament/fileValidation.ts`                                  |
| 신규   | `src/lib/tournament/fileStorage.ts`                                     |
| 신규   | `src/pages/api/clubs/[id]/tournaments/[tournamentId]/files/index.ts`    |
| 신규   | `src/pages/api/clubs/[id]/tournaments/[tournamentId]/files/[fileId].ts` |
| 신규   | `src/components/organisms/tournament/TournamentFileList.tsx`            |
| 신규   | `src/components/organisms/tournament/admin/TournamentFileField.tsx`     |
| 신규   | `src/hooks/useTournamentFiles.ts`                                       |
| 수정   | `src/components/organisms/tournament/admin/TournamentForm.tsx`          |
| 수정   | `src/pages/clubs/[id]/tournaments/[tournamentId]/index.tsx`             |
| 수정   | `src/pages/clubs/[id]/tournaments/[tournamentId]/apply.tsx`             |
| 수정   | `src/pages/api/clubs/[id]/tournaments/[tournamentId]/index.ts`          |
| 수정   | `src/types/tournament.types.ts`                                         |
| 테스트 | 위 2개 신규                                                             |

## 12. 작업 순서

스키마 → 검증 로직 → API → UI 순으로 아래에서 위로 쌓는다. 각 단계는 앞 단계에만 의존한다.

1. Prisma 모델 추가 → `npm run build:schema` → 마이그레이션
2. `fileValidation.ts` + 테스트 (TDD)
3. `supabaseAdmin.ts`
4. 업로드·삭제 API
5. `TournamentFileList` + 테스트 (TDD)
6. `TournamentFileField` (관리자)
7. 기존 화면 3곳 연결
8. 대회 상세 GET / 삭제 API 수정
9. 수동 확인 (업로드 → 조회 → 삭제 → 대회 삭제)
