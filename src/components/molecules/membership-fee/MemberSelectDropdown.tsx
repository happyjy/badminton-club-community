import { useState, useRef, useEffect } from 'react';

import { ChevronDown, Search, X } from 'lucide-react';

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

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-left ${
          disabled
            ? 'bg-gray-100 cursor-not-allowed'
            : 'bg-white hover:border-gray-400'
        }`}
      >
        <span className={selectedMember ? 'text-gray-900' : 'text-gray-500'}>
          {selectedMember?.name || placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selectedMember && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded"
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
              filteredMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => handleSelect(member.id)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                    member.id === selectedMemberId ? 'bg-blue-50' : ''
                  }`}
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
