import { useState, useRef, useEffect } from 'react';

import { Check, ChevronDown, Search, X } from 'lucide-react';

import { Input } from '@/components/atoms/inputs/Input';

import { cn } from '@/lib/utils';

interface Member {
  id: number;
  name: string | null;
  status?: string;
  leftAt?: string | null;
}

function formatLeftLabel(leftAt: string | null | undefined): string {
  if (!leftAt) return '탈퇴';
  const d = new Date(leftAt);
  if (Number.isNaN(d.getTime())) return '탈퇴';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `탈퇴 ${y}-${m}`;
}

interface MemberMultiSelectDropdownProps {
  members: Member[];
  selectedMemberIds: number[];
  onSelect: (memberIds: number[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * 검색해서 여러 회원을 고르는 드롭다운.
 *
 * 펼친 목록은 제자리에 그린다(body로 옮기지 않는다). Sheet 안에서 쓰이는데,
 * 대화상자 밖으로 옮기면 누르는 순간 "바깥 누르기"로 처리되어 Sheet가 닫히고
 * 포커스 가두기 때문에 검색칸에 글자를 넣을 수 없다.
 */
function MemberMultiSelectDropdown({
  members,
  selectedMemberIds,
  onSelect,
  placeholder = '회원 선택 (복수 가능)',
  disabled = false,
}: MemberMultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 선택된 멤버 목록
  const selectedMembers = members.filter((m) =>
    selectedMemberIds.includes(m.id)
  );

  // 검색된 멤버 목록
  const filteredMembers = members.filter((m) =>
    m.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 멤버 토글
  const handleToggle = (memberId: number) => {
    const next = selectedMemberIds.includes(memberId)
      ? selectedMemberIds.filter((id) => id !== memberId)
      : [...selectedMemberIds, memberId];
    onSelect(next);
  };

  // 멤버 하나 해제
  const handleClearOne = (memberId: number) => {
    onSelect(selectedMemberIds.filter((id) => id !== memberId));
  };

  // 모든 멤버 해제
  const handleClearAll = () => {
    onSelect([]);
  };

  const displayText =
    selectedMembers.length > 0
      ? selectedMembers
          .map((m) => {
            const base = m.name || '(이름 없음)';
            return m.status === 'LEFT'
              ? `${base} (${formatLeftLabel(m.leftAt)})`
              : base;
          })
          .join(', ')
      : '';

  const canClearAll = selectedMembers.length > 0 && !disabled;

  return (
    <div ref={dropdownRef} className="relative w-full min-w-0">
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={cn(
            'flex min-h-11 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 text-left text-body',
            'focus-visible:border-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          <span
            className={
              selectedMembers.length > 0
                ? 'min-w-0 flex-1 truncate text-primary'
                : 'min-w-0 flex-1 truncate text-tertiary'
            }
          >
            {displayText || placeholder}
          </span>
          {/* 겹쳐 놓는 지우기 버튼의 자리 */}
          {canClearAll && <span aria-hidden className="w-6 shrink-0" />}
          <ChevronDown
            aria-hidden
            className="h-4 w-4 shrink-0 text-secondary"
          />
        </button>
        {/* 버튼 안에 버튼을 넣을 수 없어 형제로 두고 겹쳐 놓는다. */}
        {canClearAll && (
          <button
            type="button"
            onClick={handleClearAll}
            className="absolute right-9 top-1/2 -translate-y-1/2 rounded-full p-1 text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            title="전체 해제"
            aria-label="전체 해제"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        )}
      </div>

      {selectedMembers.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 rounded-md bg-surface-muted p-2">
          {selectedMembers.map((m) => {
            const isLeft = m.status === 'LEFT';
            return (
              <span
                key={m.id}
                className={cn(
                  'inline-flex max-w-full items-center gap-1 rounded-sm bg-fill px-2 py-0.5 text-caption',
                  isLeft ? 'text-secondary' : 'text-primary'
                )}
              >
                <span className="truncate">
                  {m.name || '(이름 없음)'}
                  {isLeft && (
                    <span className="ml-1">({formatLeftLabel(m.leftAt)})</span>
                  )}
                </span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleClearOne(m.id)}
                    aria-label={`${m.name || '(이름 없음)'} 해제`}
                    className="rounded-full p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <X aria-hidden className="h-3 w-3" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}

      {isOpen && (
        <div className="absolute left-0 top-12 z-dropdown max-h-72 w-full overflow-hidden rounded-md border border-border bg-surface shadow-overlay">
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tertiary"
              />
              <Input
                type="text"
                aria-label="회원 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="검색..."
                className="pl-9"
                autoFocus
              />
            </div>
          </div>
          <div
            role="listbox"
            aria-multiselectable
            className="max-h-52 overflow-y-auto"
          >
            {filteredMembers.length === 0 ? (
              <div className="px-3 py-2 text-footnote text-secondary">
                검색 결과가 없습니다
              </div>
            ) : (
              filteredMembers.map((member) => {
                const isSelected = selectedMemberIds.includes(member.id);
                const isLeft = member.status === 'LEFT';
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => handleToggle(member.id)}
                    role="option"
                    aria-selected={isSelected}
                    className={cn(
                      'flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-callout',
                      isSelected && 'bg-fill',
                      isLeft ? 'text-secondary' : 'text-primary'
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border',
                        isSelected
                          ? 'border-accent bg-accent text-on-accent'
                          : 'border-border'
                      )}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span className="truncate">
                      {member.name || '(이름 없음)'}
                    </span>
                    {isLeft && (
                      <span className="ml-auto shrink-0 rounded-sm bg-fill px-1.5 py-0.5 text-caption text-secondary">
                        {formatLeftLabel(member.leftAt)}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MemberMultiSelectDropdown;
