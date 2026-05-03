import { useState, useRef, useEffect } from 'react';

import { ChevronDown, Search, X } from 'lucide-react';

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

  // 멤버 토글
  const handleToggle = (memberId: number) => {
    const next = selectedMemberIds.includes(memberId)
      ? selectedMemberIds.filter((id) => id !== memberId)
      : [...selectedMemberIds, memberId];
    onSelect(next);
  };

  // 멤버 하나 해제
  const handleClearOne = (e: React.MouseEvent, memberId: number) => {
    e.stopPropagation();
    onSelect(selectedMemberIds.filter((id) => id !== memberId));
  };

  // 모든 멤버 해제
  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  return (
    <div ref={dropdownRef} className="relative min-w-0 w-[calc(100%-20px)]">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full min-h-[2.5rem] flex items-center justify-between gap-2 px-3 py-2 border rounded-lg text-left ${
          disabled
            ? 'bg-gray-100 cursor-not-allowed'
            : 'bg-white hover:border-gray-400'
        }`}
      >
        <span
          className={
            selectedMembers.length > 0
              ? 'min-w-0 flex-1 text-gray-900 truncate'
              : 'min-w-0 flex-1 text-gray-500 truncate'
          }
        >
          {displayText || placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {selectedMembers.length > 0 && !disabled && (
            <button
              type="button"
              onClick={handleClearAll}
              className="p-1 hover:bg-gray-100 rounded"
              title="전체 해제"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown size={16} />
        </div>
      </button>

      {selectedMembers.length > 0 && (
        <div className="mt-2 p-2 border rounded-lg bg-gray-50 flex flex-wrap gap-1">
          {selectedMembers.map((m) => {
            const isLeft = m.status === 'LEFT';
            return (
              <span
                key={m.id}
                className={`inline-flex max-w-full items-center gap-1 px-2 py-0.5 rounded text-xs ${
                  isLeft
                    ? 'bg-gray-200 text-gray-700'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                <span className="truncate">
                  {m.name || '(이름 없음)'}
                  {isLeft && (
                    <span className="ml-1 text-[10px]">
                      ({formatLeftLabel(m.leftAt)})
                    </span>
                  )}
                </span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => handleClearOne(e, m.id)}
                    className={`rounded p-0.5 ${
                      isLeft ? 'hover:bg-gray-300' : 'hover:bg-blue-200'
                    }`}
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="검색..."
                className="w-full pl-8 pr-3 py-1.5 border rounded text-sm focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-48">
            {filteredMembers.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
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
                    className={`w-full px-3 py-2 flex items-center gap-2 text-left text-sm hover:bg-gray-100 ${
                      isSelected ? 'bg-blue-50' : ''
                    } ${isLeft ? 'text-gray-500' : ''}`}
                  >
                    <span
                      className={`w-4 h-4 border rounded flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-300'
                      }`}
                    >
                      {isSelected && (
                        <span className="text-white text-xs">✓</span>
                      )}
                    </span>
                    <span className="truncate">
                      {member.name || '(이름 없음)'}
                    </span>
                    {isLeft && (
                      <span className="ml-auto shrink-0 text-[10px] px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded">
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
