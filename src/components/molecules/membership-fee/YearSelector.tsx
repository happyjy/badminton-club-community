import { ChevronLeft, ChevronRight } from 'lucide-react';

import { IconButton } from '@/components/atoms/buttons/IconButton';

interface YearSelectorProps {
  year: number;
  onYearChange: (year: number) => void;
  minYear?: number;
  maxYear?: number;
}

function YearSelector({
  year,
  onYearChange,
  minYear = 2020,
  maxYear = new Date().getFullYear() + 1,
}: YearSelectorProps) {
  const handlePrevYear = () => {
    if (year > minYear) {
      onYearChange(year - 1);
    }
  };

  const handleNextYear = () => {
    if (year < maxYear) {
      onYearChange(year + 1);
    }
  };

  return (
    <div className="flex items-center">
      <IconButton
        aria-label="이전 연도"
        onClick={handlePrevYear}
        disabled={year <= minYear}
      >
        <ChevronLeft aria-hidden className="h-5 w-5" />
      </IconButton>
      <span className="min-w-[72px] text-center text-headline text-primary">
        {year}년
      </span>
      <IconButton
        aria-label="다음 연도"
        onClick={handleNextYear}
        disabled={year >= maxYear}
      >
        <ChevronRight aria-hidden className="h-5 w-5" />
      </IconButton>
    </div>
  );
}

export default YearSelector;
