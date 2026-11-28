import { useRouter } from 'next/router';

import { MemberFeeHistorySection } from '@/components/organisms/membership-fee/MemberFeeHistorySection';
import { PageHeader } from '@/components/organisms/PageHeader';

import { AuthProps, withAuth } from '@/lib/withAuth';

/**
 * 내 회비: 회원이 자기 납부 이력(몇 월분을 언제 냈는지, 미납, 월 회비)을 본다.
 * 회원 상세의 "납부 이력"과 같은 부품이고, 서버가 본인·임원만 읽게 막는다.
 */
function MyFeePage({ user }: AuthProps) {
  const router = useRouter();
  const { id: clubId } = router.query;

  if (!user || typeof clubId !== 'string') return null;

  return (
    <>
      <PageHeader title="내 회비" />
      <MemberFeeHistorySection clubId={clubId} userId={user.id} showLeaves />
    </>
  );
}

export default withAuth(MyFeePage);
