import { useState, useRef, useEffect } from 'react';

import { ChevronDown, Search, X } from 'lucide-react';

import { Input } from '@/components/atoms/inputs/Input';

import { cn } from '@/lib/utils';

interface Member {
  id: number;
  name: string | null;
}

interface MemberSelectDropdownProps {
  members: Member[];
  selectedMemberId: number | null;
  onSelect: (memberId: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

/** 검색해서 회원 한 명을 고르는 드롭다운. */
function MemberSelectDropdown({
  members,
  selectedMemberId,
  onSelect,
  placeholder = '회원 선택',
  disabled = false,
}: MemberSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  const filteredMembers = members.filter((m) =>
    m.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (memberId: number) => {
    onSelect(memberId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const canClear = Boolean(selectedMember) && !disabled;

  return (
    <div ref={dropdownRef} className="relative">
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
          className={cn(
            'min-w-0 flex-1 truncate',
            selectedMember ? 'text-primary' : 'text-tertiary'
          )}
        >
          {selectedMember?.name || placeholder}
        </span>
        {/* 겹쳐 놓는 지우기 버튼의 자리 */}
        {canClear && <span aria-hidden className="w-6 shrink-0" />}
        <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-secondary" />
      </button>
      {/* 버튼 안에 버튼을 넣을 수 없어 형제로 두고 겹쳐 놓는다. */}
      {canClear && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-label="선택 해제"
          className="absolute right-9 top-[22px] -translate-y-1/2 rounded-full p-1 text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      )}

      {isOpen && (
        <div className="absolute z-dropdown mt-1 max-h-72 w-full overflow-hidden rounded-md border border-border bg-surface shadow-overlay">
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
          <div role="listbox" className="max-h-52 overflow-y-auto">
            {filteredMembers.length === 0 ? (
              <div className="px-3 py-2 text-footnote text-secondary">
                검색 결과가 없습니다
              </div>
            ) : (
              filteredMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => handleSelect(member.id)}
                  role="option"
                  aria-selected={member.id === selectedMemberId}
                  className={cn(
                    'min-h-11 w-full px-3 py-2 text-left text-callout text-primary',
                    member.id === selectedMemberId && 'bg-fill font-semibold'
                  )}
                >
                  {member.name || '(이름 없음)'}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MemberSelectDropdown;
