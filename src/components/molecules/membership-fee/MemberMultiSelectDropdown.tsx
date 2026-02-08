import { useState, useRef, useEffect } from 'react';

import { ChevronDown, Search, X } from 'lucide-react';

interface Member {
  id: number;
  name: string | null;
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

  const selectedMembers = members.filter((m) => selectedMemberIds.includes(m.id));

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

  const handleToggle = (memberId: number) => {
    const next = selectedMemberIds.includes(memberId)
      ? selectedMemberIds.filter((id) => id !== memberId)
      : [...selectedMemberIds, memberId];
    onSelect(next);
  };

  const handleClearOne = (e: React.MouseEvent, memberId: number) => {
    e.stopPropagation();
    onSelect(selectedMemberIds.filter((id) => id !== memberId));
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect([]);
  };

  const displayText =
    selectedMembers.length > 0
      ? selectedMembers.map((m) => m.name || '(이름 없음)').join(', ')
      : '';

  return (
    <div ref={dropdownRef} className="relative">
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
            selectedMembers.length > 0 ? 'text-gray-900 truncate' : 'text-gray-500'
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
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => handleToggle(member.id)}
                    className={`w-full px-3 py-2 flex items-center gap-2 text-left text-sm hover:bg-gray-100 ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                  >
                    <span
                      className={`w-4 h-4 border rounded flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                      }`}
                    >
                      {isSelected && (
                        <span className="text-white text-xs">✓</span>
                      )}
                    </span>
                    {member.name || '(이름 없음)'}
                  </button>
                );
              })
            )}
          </div>
          {selectedMembers.length > 0 && (
            <div className="p-2 border-t bg-gray-50 flex flex-wrap gap-1">
              {selectedMembers.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs"
                >
                  {m.name || '(이름 없음)'}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => handleClearOne(e, m.id)}
                      className="hover:bg-blue-200 rounded p-0.5"
                    >
                      <X size={12} />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MemberMultiSelectDropdown;
