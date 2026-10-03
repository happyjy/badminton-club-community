import { useState } from 'react';

import { CalendarX, Plus } from 'lucide-react';

import { Avatar } from '@/components/atoms/Avatar';
import { Button } from '@/components/atoms/buttons/Button';
import { IconButton } from '@/components/atoms/buttons/IconButton';
import { Checkbox } from '@/components/atoms/inputs/Checkbox';
import { Input } from '@/components/atoms/inputs/Input';
import { Select } from '@/components/atoms/inputs/Select';
import { Skeleton } from '@/components/atoms/Skeleton';
import { StatusChip } from '@/components/atoms/StatusChip';
import { Textarea } from '@/components/atoms/Textarea';
import { EmptyState } from '@/components/molecules/EmptyState';
import { FormField } from '@/components/molecules/form/FormField';
import { ListGroup } from '@/components/molecules/list/ListGroup';
import { ListRow } from '@/components/molecules/list/ListRow';
import { SegmentedControl } from '@/components/molecules/SegmentedControl';
import { PageHeader } from '@/components/organisms/PageHeader';
import { useConfirm } from '@/components/organisms/sheet/ConfirmProvider';
import { Sheet } from '@/components/organisms/sheet/Sheet';

import { cn } from '@/lib/utils';

import type { GetServerSideProps } from 'next';

// 개발 서버에서만 연다. 운영에서는 404.
export const getServerSideProps: GetServerSideProps = async () => {
  if (process.env.NODE_ENV === 'production') {
    return { notFound: true };
  }
  return { props: {} };
};

type Filter = 'all' | 'active' | 'unpaid';

const TYPE_SCALE = [
  ['text-large-title', '출석체크'],
  ['text-title', '게스트 신청'],
  ['text-headline', '10월 4일 토요일'],
  ['text-body', '셔틀콕은 클럽에서 준비해요.'],
  ['text-callout', '참가자 24명'],
  ['text-footnote', '오후 7:00 · 당산초 체육관'],
  ['text-caption', '가장 작은 글자'],
] as const;

export default function UiKitPage() {
  const confirm = useConfirm();
  const [filter, setFilter] = useState<Filter>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [lastConfirm, setLastConfirm] = useState('아직 없음');

  return (
    <div
      data-density={compact ? 'compact' : undefined}
      className="mx-auto max-w-2xl space-y-6 py-6"
    >
      <header>
        <PageHeader
          title="부품 미리보기"
          subtitle="개발 서버에서만 보이는 화면입니다."
        />
        <label className="flex items-center text-callout text-primary">
          <Checkbox
            checked={compact}
            onChange={(event) => setCompact(event.target.checked)}
          />
          PC 관리용 작은 글자 (창 폭 1024px 이상에서만 바뀜)
        </label>
      </header>

      <ListGroup label="글자 크기 7단계">
        {TYPE_SCALE.map(([cls, sample]) => (
          <div key={cls} className="flex items-baseline gap-3 px-4 py-3">
            <code className="w-36 shrink-0 text-caption text-secondary">
              {cls}
            </code>
            <span className={cn(cls, 'text-primary')}>{sample}</span>
          </div>
        ))}
      </ListGroup>

      <ListGroup label="버튼">
        <div className="space-y-3 px-4 py-4">
          <div className="flex flex-wrap gap-2">
            <Button>주 버튼</Button>
            <Button variant="secondary">보조</Button>
            <Button variant="destructive">삭제</Button>
            <Button variant="plain">글자만</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="lg">크게 48</Button>
            <Button size="md">보통 44</Button>
            <Button size="sm">작게 32</Button>
            <Button disabled>비활성</Button>
            <Button pending pendingText="저장 중" pendingPosition="left">
              저장
            </Button>
            <IconButton aria-label="추가">
              <Plus aria-hidden className="h-5 w-5" />
            </IconButton>
            <IconButton aria-label="추가" variant="filled">
              <Plus aria-hidden className="h-5 w-5" />
            </IconButton>
          </div>
          <Button size="lg" className="w-full">
            10월 9일 참석하기
          </Button>
        </div>
      </ListGroup>

      <ListGroup label="상태 칩">
        <div className="flex flex-wrap gap-2 px-4 py-4">
          <StatusChip tone="positive">참석</StatusChip>
          <StatusChip tone="warning">대기</StatusChip>
          <StatusChip tone="negative">불참</StatusChip>
          <StatusChip tone="neutral">미응답</StatusChip>
          <StatusChip domain="guest" status="APPROVED">
            게스트 승인
          </StatusChip>
          <StatusChip domain="feeRecord" status="ERROR">
            회비 오류
          </StatusChip>
        </div>
      </ListGroup>

      <ListGroup
        label="묶음 리스트"
        footer="누를 수 있는 행에는 오른쪽에 화살표가 붙어요."
      >
        <ListRow
          leading={<Avatar name="김민수" seed="m1" />}
          title="김민수"
          subtitle="A조 · 남자"
          trailing={<StatusChip tone="positive">참석</StatusChip>}
          href="/dev/ui-kit"
        />
        <ListRow
          leading={<Avatar name="이지은" seed="m2" />}
          title="이지은"
          subtitle="B조 · 여자"
          trailing={<StatusChip tone="warning">대기</StatusChip>}
          onClick={() => setSheetOpen(true)}
        />
        <ListRow
          leading={<Avatar name="박준호" seed="m3" />}
          title="박준호"
          subtitle="C조 · 남자"
          trailing={<StatusChip tone="negative">불참</StatusChip>}
        />
        <ListRow
          title="이번 달 회비 합계"
          trailing={
            <span className="text-callout font-semibold tabular-nums text-primary">
              1,320,000원
            </span>
          }
        />
      </ListGroup>

      <ListGroup label="아바타">
        <div className="flex items-center gap-3 px-4 py-4">
          <Avatar name="김민수" size={28} />
          <Avatar name="이지은" />
          <Avatar name="박준호" size={56} />
          <Avatar name="최서연" seed="a" />
          <Avatar name="정우진" seed="b" />
          <Avatar name="한소희" seed="c" />
          <Avatar name="깨진 사진" src="https://example.invalid/x.jpg" />
        </div>
      </ListGroup>

      <ListGroup label="입력">
        <div className="space-y-4 px-4 py-4">
          <FormField label="이름" required>
            <Input placeholder="홍길동" autoComplete="name" />
          </FormField>
          <FormField label="전화번호" error="전화번호를 확인해주세요">
            <Input type="tel" defaultValue="010-1234" autoComplete="tel" />
          </FormField>
          <FormField label="급수">
            <Select
              options={[
                { value: 'A', label: 'A조' },
                { value: 'B', label: 'B조' },
              ]}
            />
          </FormField>
          <FormField label="남길 말">
            <Textarea
              placeholder="운영진에게 전할 말을 적어주세요"
              minRows={2}
            />
          </FormField>
          <label className="flex min-h-11 items-center text-body text-primary">
            <Checkbox />
            개인정보 수집에 동의합니다
          </label>
        </div>
      </ListGroup>

      <ListGroup label="세그먼트">
        <div className="px-4 py-4">
          <SegmentedControl<Filter>
            aria-label="회원 필터"
            options={[
              { value: 'all', label: '전체 445' },
              { value: 'active', label: '활동' },
              { value: 'unpaid', label: '미납' },
            ]}
            value={filter}
            onChange={setFilter}
          />
          <p className="mt-2 text-footnote text-secondary">고른 값: {filter}</p>
        </div>
      </ListGroup>

      <ListGroup label="시트 · 확인창">
        <div className="space-y-3 px-4 py-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setSheetOpen(true)}>
              시트 열기
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                const ok = await confirm({
                  title: '게시글을 삭제할까요?',
                  message: '삭제하면 되돌릴 수 없어요.',
                  confirmLabel: '삭제',
                  destructive: true,
                });
                setLastConfirm(ok ? '삭제를 눌렀어요' : '취소했어요');
              }}
            >
              확인창 열기
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                await confirm({ title: '신청이 마감됐어요', hideCancel: true });
                setLastConfirm('알림을 닫았어요');
              }}
            >
              알림창 열기
            </Button>
          </div>
          <p className="text-footnote text-secondary">
            마지막 결과: {lastConfirm}
          </p>
        </div>
      </ListGroup>

      <ListGroup label="불러오는 중 · 빈 화면">
        <div className="space-y-2 px-4 py-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <EmptyState
          icon={CalendarX}
          title="이번 주 운동이 아직 없어요"
          description="일정이 올라오면 여기에 보여요"
          action={<Button variant="secondary">일정 만들기</Button>}
        />
      </ListGroup>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="게스트 신청"
        footer={
          <Button
            size="lg"
            className="w-full"
            onClick={() => setSheetOpen(false)}
          >
            신청하기
          </Button>
        }
      >
        <div className="space-y-4">
          {[
            '이름',
            '전화번호',
            '소속 클럽',
            '급수',
            '방문 날짜',
            '남길 말',
          ].map((label) => (
            <FormField key={label} label={label}>
              <Input />
            </FormField>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
