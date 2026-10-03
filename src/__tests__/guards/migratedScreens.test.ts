import fs from 'fs';
import path from 'path';

import { describe, expect, it } from '@jest/globals';

const SRC = path.resolve(__dirname, '../..');

/**
 * 새 디자인으로 옮긴 파일. 옮길 때마다 여기에 더한다.
 * 이 파일들에는 옛 색·이모지·그라디언트가 다시 들어오면 안 된다.
 */
const MIGRATED = [
  // 4단계 ① 출석체크 · 운동 상세
  'components/organisms/workout/WorkoutCard.tsx',
  'components/organisms/workout/WorkoutEditSheet.tsx',
  'components/organisms/workout/WorkoutDeleteSheet.tsx',
  'pages/clubs/[id]/attendance/index.tsx',
  'components/organisms/workout/WorkoutDetailView.tsx',
  'components/organisms/workout/WorkoutParkingSection.tsx',
  'components/organisms/workout/HelperSheet.tsx',
  'components/molecules/PersonInfo.tsx',
  'pages/clubs/[id]/workouts/[workoutId].tsx',
  // 4단계 ② 게스트 신청 목록
  'components/organisms/guest/GuestApplicationList.tsx',
  'pages/clubs/[id]/guest/index.tsx',
  'pages/clubs/[id]/guest/[guestId]/index.tsx',
  'components/molecules/InfoItem.tsx',
  'components/organisms/InfoSection.tsx',
  'components/organisms/comment/CommentInput.tsx',
  'components/organisms/comment/CommentItem.tsx',
  'components/molecules/form/PhoneNumberText.tsx',
  // 4단계 ② 게스트 신청 창
  'components/organisms/modal/join/JoinModal.tsx',
  'components/organisms/modal/join/components/Header.tsx',
  'components/organisms/modal/join/components/Section.tsx',
  'components/organisms/modal/join/components/Footer.tsx',
  'components/organisms/modal/join/components/fields/PhoneField.tsx',
  'components/organisms/modal/join/components/fields/IntendToJoinField.tsx',
  'components/organisms/modal/join/components/fields/PrivacyAgreementField.tsx',
  'components/organisms/modal/join/components/fields/GenderField.tsx',
  'components/organisms/modal/join/components/fields/MessageField.tsx',
  'components/organisms/modal/PrivacyModal.tsx',
  'components/molecules/form/VerificationCodeInput.tsx',
  'components/molecules/form/PhoneInputGroup.tsx',
  // 4단계 ③ 게시판
  'components/organisms/board/BoardCategoryTabs.tsx',
  'components/organisms/board/BoardToolbar.tsx',
  'components/organisms/board/PostCard.tsx',
  'components/organisms/board/PostList.tsx',
  'components/organisms/board/PostDetail.tsx',
  'components/organisms/board/PostForm.tsx',
  'components/molecules/board/CommentItem.tsx',
  'components/molecules/board/CommentList.tsx',
  'pages/clubs/[id]/board/index.tsx',
  'pages/clubs/[id]/board/new.tsx',
  'pages/clubs/[id]/board/[postId]/index.tsx',
  'pages/clubs/[id]/board/[postId]/edit.tsx',
  'utils/renderContentWithLinks.tsx',
  // 4단계 ④ 대회 (운영진 화면의 표·폼 구조는 5단계에서 다시 본다)
  'components/organisms/tournament/TournamentCard.tsx',
  'components/organisms/tournament/TournamentFileList.tsx',
  'components/organisms/tournament/TournamentStatusBadge.tsx',
  'components/organisms/tournament/admin/DeleteTournamentDialog.tsx',
  'components/organisms/tournament/admin/EditPlayersDialog.tsx',
  'components/organisms/tournament/admin/EntryTable.tsx',
  'components/organisms/tournament/admin/EventGroupList.tsx',
  'components/organisms/tournament/admin/EventTypeEditor.tsx',
  'components/organisms/tournament/admin/PresetOrCustomInput.tsx',
  'components/organisms/tournament/admin/TagListField.tsx',
  'components/organisms/tournament/admin/TournamentFileField.tsx',
  'components/organisms/tournament/admin/TournamentForm.tsx',
  'components/organisms/tournament/entry/ApplyNotice.tsx',
  'components/organisms/tournament/entry/EntrySummary.tsx',
  'components/organisms/tournament/entry/EventListField.tsx',
  'components/organisms/tournament/entry/PlayerListField.tsx',
  'pages/clubs/[id]/tournaments/[tournamentId]/admin.tsx',
  'pages/clubs/[id]/tournaments/[tournamentId]/apply.tsx',
  'pages/clubs/[id]/tournaments/[tournamentId]/edit.tsx',
  'pages/clubs/[id]/tournaments/[tournamentId]/external-apply.tsx',
  'pages/clubs/[id]/tournaments/[tournamentId]/external-entry.tsx',
  'pages/clubs/[id]/tournaments/[tournamentId]/index.tsx',
  'pages/clubs/[id]/tournaments/[tournamentId]/my.tsx',
  'pages/clubs/[id]/tournaments/index.tsx',
  'pages/clubs/[id]/tournaments/new.tsx',
  'lib/tournament/display.ts',
  // 4단계 ⑤ 내 정보 · 로그인 · 클럽 목록 · 클럽 홈
  'pages/profile/index.tsx',
  'pages/auth/login.tsx',
  'pages/clubs/index.tsx',
  'pages/clubs/[id]/index.tsx',
  'pages/clubs/[id]/photos/index.tsx',
  'components/organisms/ClubDetailContent.tsx',
  'components/molecules/ClubInfoSection.tsx',
  'components/molecules/RankingTable.tsx',
  'components/molecules/buttons/JoinClubButton.tsx',
  'components/organisms/navigation/clubNavigation/ClubListItem.tsx',
  // 5단계 ① 표 부품 · 회원 관리
  'components/molecules/Pagination.tsx',
  'components/organisms/table/DataTable.tsx',
  'components/organisms/table/Toolbar.tsx',
  'components/organisms/table/BulkActionBar.tsx',
  'components/organisms/club/MembersView.tsx',
  'components/molecules/StatusFilter.tsx',
  'pages/clubs/[id]/members/index.tsx',
  // 5단계 ② 게스트 확인
  'components/organisms/guest/GuestCheckView.tsx',
  'pages/clubs/[id]/guest/check/index.tsx',
];

const COLOR_NAMES =
  'gray|slate|zinc|neutral|stone|blue|red|green|yellow|amber|orange|purple|pink|indigo|teal|lime|sky|emerald|cyan|violet|rose|fuchsia';
const COLOR_PREFIXES =
  'bg|text|border|ring|ring-offset|from|to|via|divide|placeholder|fill|stroke|outline|decoration|accent|caret|shadow';

// tsconfig의 target이 낮아 일부 정규식은 리터럴 대신 생성자를 쓴다.
const FORBIDDEN: Array<{ what: string; pattern: RegExp }> = [
  {
    what: 'Tailwind 기본 색',
    // 뒤에 숫자 단계가 붙은 것만 잡는다. 토큰(bg-neutral-soft)은 숫자가 없다.
    pattern: new RegExp(
      `\\b(?:${COLOR_PREFIXES})-(?:${COLOR_NAMES})-\\d{2,3}\\b`
    ),
  },
  {
    what: '흑백 직접 지정',
    pattern: /\b(?:bg|text|border|ring|divide)-(?:white|black)\b/,
  },
  { what: '그라디언트', pattern: /\bbg-gradient-/ },
  {
    what: '옛 그림자',
    // shadow, shadow-sm … 은 금지. 토큰인 shadow-overlay와 shadow-none만 허용.
    pattern: new RegExp(
      '(?<![\\w-])shadow(?:-(?:sm|md|lg|xl|2xl|inner))?(?![\\w-])'
    ),
  },
  { what: '색 값 (#hex)', pattern: /#[0-9a-fA-F]{3,8}\b/ },
  { what: '색 값 (rgb/hsl)', pattern: /\b(?:rgba?|hsla?)\(/ },
  {
    what: '이모지',
    pattern: new RegExp(
      '[\\u{1F000}-\\u{1FAFF}\\u{2300}-\\u{23FF}\\u{2600}-\\u{27BF}\\u{2B00}-\\u{2BFF}]',
      'u'
    ),
  },
];

const violations = (line: string) =>
  FORBIDDEN.filter(({ pattern }) => pattern.test(line)).map(({ what }) => what);

describe('지킴이의 규칙 자체', () => {
  it.each([
    ['bg-gray-100', 'Tailwind 기본 색'],
    ['bg-neutral-500', 'Tailwind 기본 색'],
    ['text-fuchsia-600', 'Tailwind 기본 색'],
    ['outline-red-500', 'Tailwind 기본 색'],
    ['hover:bg-blue-50', 'Tailwind 기본 색'],
    ['text-white', '흑백 직접 지정'],
    ['bg-gradient-to-r', '그라디언트'],
    ['rounded shadow p-3', '옛 그림자'],
    ['shadow-md', '옛 그림자'],
    ['bg-[#fff]', '색 값 (#hex)'],
    ['color: #3b82f6', '색 값 (#hex)'],
    ['rgba(0, 0, 0, 0.5)', '색 값 (rgb/hsl)'],
    ['⏰ 시간', '이모지'],
    ['📅 날짜', '이모지'],
    ['🚗 주차', '이모지'],
    ['⭐', '이모지'],
  ])('%s 를 잡는다', (line, what) => {
    expect(violations(line)).toContain(what);
  });

  it.each([
    'bg-neutral-soft text-neutral',
    'bg-positive-soft text-positive',
    'shadow-overlay',
    'bg-surface text-primary border-border',
    'divide-y-[0.5px] divide-separator',
    'text-large-title',
    '// 10월 4일 토요일 · 오후 7:00 – 10:00',
    'href={`/clubs/${clubId}/workouts/${workout.id}`}',
  ])('%s 는 잡지 않는다', (line) => {
    expect(violations(line)).toEqual([]);
  });
});

describe('새 디자인으로 옮긴 화면', () => {
  it.each(MIGRATED)('%s 에 옛 색·이모지·그라디언트가 없다', (file) => {
    const source = fs.readFileSync(path.join(SRC, file), 'utf8');
    const found: string[] = [];

    source.split('\n').forEach((line, index) => {
      for (const what of violations(line)) {
        found.push(`${index + 1}: ${what} — ${line.trim().slice(0, 80)}`);
      }
    });

    expect(found).toEqual([]);
  });

  it('등록된 파일이 모두 실제로 있다', () => {
    const missing = MIGRATED.filter(
      (file) => !fs.existsSync(path.join(SRC, file))
    );
    expect(missing).toEqual([]);
  });
});
