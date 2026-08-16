import { renderContentWithLinks } from '@/utils/renderContentWithLinks';

interface ApplyNoticeProps {
  notice: string | null | undefined;
}

/**
 * 신청 페이지 상단의 주의사항 안내.
 * 관리자가 작성하지 않았으면 아무것도 그리지 않는다.
 */
function ApplyNotice({ notice }: ApplyNoticeProps) {
  if (!notice?.trim()) return null;

  return (
    <section className="mb-6 rounded-md border-l-4 border-amber-400 bg-amber-50 p-4">
      <h2 className="text-sm font-semibold text-amber-900">
        신청 전 확인해주세요
      </h2>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-amber-900">
        {renderContentWithLinks(notice)}
      </p>
    </section>
  );
}

export default ApplyNotice;
