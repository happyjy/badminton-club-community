import Image from 'next/image';

import badmintonNetIcon from '@/icon/badmintonNet.svg';
import badmintonShuttleCockIcon from '@/icon/badmintonShuttleCock.svg';
import broomStickIcon from '@/icon/broomStick.svg';
import keyIcon from '@/icon/key.svg';
import mopIcon from '@/icon/mop.svg';

// 선택된 아이콘 타입 정의
export type SelectedIcon = 'net' | 'broomStick' | 'shuttlecock' | 'key' | 'mop';

interface CircleMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onIconSelect: (icon: SelectedIcon) => void;
  selectedIcons: SelectedIcon[];
}

function CircleMenu({
  isOpen,
  onClose,
  onIconSelect,
  selectedIcons,
}: CircleMenuProps) {
  const handleIconClick = (icon: SelectedIcon) => {
    onIconSelect(icon);
    onClose();
  };

  return (
    <div className="relative">
      <div
        className={`fixed inset-0 ${isOpen ? 'block' : 'hidden'}`}
        onClick={onClose}
      />
      <div className="absolute -top-2 -right-2">
        <div className="relative">
          <div
            className={`absolute transform transition-all duration-300 ease-in-out z-50
              ${isOpen ? 'translate-y-[-50px]' : 'translate-y-0 translate-x-0 opacity-0 pointer-events-none'}`}
          >
            <button
              className={`w-12 h-12 rounded-full ${
                selectedIcons.includes('net')
                  ? 'bg-blue-100 hover:bg-blue-200'
                  : 'bg-gray-100 hover:bg-gray-200'
              } flex items-center justify-center shadow-lg`}
              onClick={() => handleIconClick('net')}
            >
              <Image
                src={badmintonNetIcon}
                alt="badminton net"
                width={30}
                height={30}
                className="w-7 h-7"
              />
            </button>
          </div>
          <div
            className={`absolute transform transition-all duration-300 ease-in-out z-50
              ${isOpen ? 'translate-x-[47px] translate-y-[-15px]' : 'translate-y-0 translate-x-0 opacity-0 pointer-events-none'}`}
          >
            <button
              className={`w-12 h-12 rounded-full ${
                selectedIcons.includes('broomStick')
                  ? 'bg-blue-100 hover:bg-blue-200'
                  : 'bg-gray-100 hover:bg-gray-200'
              } flex items-center justify-center shadow-lg`}
              onClick={() => handleIconClick('broomStick')}
            >
              <Image
                src={broomStickIcon}
                alt="broom stick"
                width={30}
                height={30}
                className="w-7 h-7"
              />
            </button>
          </div>
          <div
            className={`absolute transform transition-all duration-300 ease-in-out z-50
              ${isOpen ? 'translate-x-[29px] translate-y-[40px]' : 'translate-y-0 translate-x-0 opacity-0 pointer-events-none'}`}
          >
            <button
              className={`w-12 h-12 rounded-full ${
                selectedIcons.includes('shuttlecock')
                  ? 'bg-blue-100 hover:bg-blue-200'
                  : 'bg-gray-100 hover:bg-gray-200'
              } flex items-center justify-center shadow-lg`}
              onClick={() => handleIconClick('shuttlecock')}
            >
              <Image
                src={badmintonShuttleCockIcon}
                alt="shuttlecock"
                width={30}
                height={30}
                className="w-7 h-7"
              />
            </button>
          </div>
          <div
            className={`absolute transform transition-all duration-300 ease-in-out z-50
              ${isOpen ? 'translate-x-[-29px] translate-y-[40px]' : 'translate-y-0 translate-x-0 opacity-0 pointer-events-none'}`}
          >
            <button
              className={`w-12 h-12 rounded-full ${
                selectedIcons.includes('key')
                  ? 'bg-blue-100 hover:bg-blue-200'
                  : 'bg-gray-100 hover:bg-gray-200'
              } flex items-center justify-center shadow-lg`}
              onClick={() => handleIconClick('key')}
            >
              <Image
                src={keyIcon}
                alt="key"
                width={30}
                height={30}
                className="w-7 h-7"
              />
            </button>
          </div>
          <div
            className={`absolute transform transition-all duration-300 ease-in-out z-50
              ${isOpen ? 'translate-x-[-47px] translate-y-[-15px]' : 'translate-y-0 translate-x-0 opacity-0 pointer-events-none'}`}
          >
            <button
              className={`w-12 h-12 rounded-full ${
                selectedIcons.includes('mop')
                  ? 'bg-blue-100 hover:bg-blue-200'
                  : 'bg-gray-100 hover:bg-gray-200'
              } flex items-center justify-center shadow-lg`}
              onClick={() => handleIconClick('mop')}
            >
              <Image
                src={mopIcon}
                alt="mop"
                width={30}
                height={30}
                className="w-7 h-7"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CircleMenu;
