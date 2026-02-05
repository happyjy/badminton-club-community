import { ChevronLeft, ChevronRight } from 'lucide-react';

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
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handlePrevYear}
        disabled={year <= minYear}
        className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={20} />
      </button>
      <span className="text-lg font-semibold min-w-[80px] text-center">
        {year}년
      </span>
      <button
        type="button"
        onClick={handleNextYear}
        disabled={year >= maxYear}
        className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

export default YearSelector;
