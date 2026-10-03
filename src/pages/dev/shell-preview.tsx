import Link from 'next/link';
import { useRouter } from 'next/router';

import { Avatar } from '@/components/atoms/Avatar';
import { StatusChip } from '@/components/atoms/StatusChip';
import { ListGroup } from '@/components/molecules/list/ListGroup';
import { ListRow } from '@/components/molecules/list/ListRow';
import { PageHeader } from '@/components/organisms/PageHeader';
import { AppShell } from '@/components/templates/AppShell';

import { getNavItems } from '@/constants/navItems';

import type { GetServerSideProps } from 'next';

// 개발 서버에서만 연다. 운영에서는 404.
export const getServerSideProps: GetServerSideProps = async () => {
  if (process.env.NODE_ENV === 'production') {
    return { notFound: true };
  }
  return { props: {} };
};

type Role = 'guest' | 'member' | 'admin';

const ROLES: Array<{ value: Role; label: string }> = [
  { value: 'guest', label: '비회원' },
  { value: 'member', label: '회원' },
  { value: 'admin', label: '운영진' },
];

const SAMPLE_PATHS = [
  { path: '/clubs/1', label: '홈' },
  { path: '/clubs/1/attendance', label: '출석체크' },
  { path: '/clubs/1/tournaments', label: '대회 (탭에 없음)' },
  { path: '/clubs/1/members', label: '회원 관리 (관리 화면)' },
];

/**
 * 로그인 없이 앱 뼈대(하단 탭바 · 사이드바 · 더보기)를 보는 화면.
 * ?as=guest|member|admin 으로 보는 사람을, ?path= 로 현재 위치를 바꾼다.
 * 메뉴의 링크는 실제 주소라서 누르면 진짜 화면으로 이동한다.
 */
export default function ShellPreviewPage() {
  const router = useRouter();
  const as = router.query.as;
  const role: Role = as === 'guest' || as === 'member' ? as : 'admin';
  const path =
    typeof router.query.path === 'string'
      ? router.query.path
      : '/clubs/1/attendance';

  const items = getNavItems({
    clubId: '1',
    isMember: role !== 'guest',
    isAdmin: role === 'admin',
    tournamentMenuEnabled: true,
  });
  const isAdminScreen = path.startsWith('/clubs/1/members');
  const link = (next: { as?: Role; path?: string }) =>
    `/dev/shell-preview?as=${next.as ?? role}&path=${encodeURIComponent(next.path ?? path)}`;

  return (
    <AppShell
      variant={isAdminScreen ? 'admin' : 'member'}
      clubId="1"
      clubName="당산 배드민턴 클럽"
      items={items}
      currentPath={path}
      isAuthenticated={role !== 'guest'}
      onLogin={() => {}}
      onLogout={() => {}}
    >
      <PageHeader
        title="뼈대 미리보기"
        subtitle="개발 서버에서만 보이는 화면입니다."
      />

      <div className="space-y-6">
        <ListGroup label="보는 사람">
          {ROLES.map(({ value, label }) => (
            <ListRow
              key={value}
              title={label}
              href={link({ as: value })}
              trailing={
                role === value && <StatusChip tone="positive">지금</StatusChip>
              }
            />
          ))}
        </ListGroup>

        <ListGroup
          label="현재 위치"
          footer="탭에 없는 화면에서는 휴대폰의 '더보기'가 켜져요."
        >
          {SAMPLE_PATHS.map((sample) => (
            <ListRow
              key={sample.path}
              title={sample.label}
              subtitle={sample.path}
              href={link({ path: sample.path })}
              trailing={
                path === sample.path && (
                  <StatusChip tone="positive">지금</StatusChip>
                )
              }
            />
          ))}
        </ListGroup>

        <ListGroup label="본문 예시 — 맨 아래 행이 탭바에 가리지 않아야 해요">
          {Array.from({ length: 14 }, (_, index) => (
            <ListRow
              key={index}
              leading={<Avatar name={`회원${index + 1}`} seed={`m${index}`} />}
              title={`회원 ${index + 1}`}
              subtitle="A조 · 남자"
              trailing={
                <StatusChip tone={index % 3 === 0 ? 'warning' : 'positive'}>
                  {index % 3 === 0 ? '대기' : '참석'}
                </StatusChip>
              }
            />
          ))}
        </ListGroup>

        <p className="px-4 text-footnote text-secondary">
          부품 전체는{' '}
          <Link href="/dev/ui-kit" className="underline">
            부품 미리보기
          </Link>
          에서 볼 수 있어요.
        </p>
      </div>
    </AppShell>
  );
}
