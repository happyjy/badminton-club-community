import { KeyboardEvent, MouseEvent, ReactNode, useMemo, useState } from 'react';

import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';

import { Checkbox } from '@/components/atoms/inputs/Checkbox';
import { ListGroup } from '@/components/molecules/list/ListGroup';
import { ListRow } from '@/components/molecules/list/ListRow';
import { Pagination, PaginationProps } from '@/components/molecules/Pagination';

import { cn } from '@/lib/utils';

export type RowKey = string | number;

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** 있으면 머리글을 눌러 이 값으로 정렬할 수 있다. 값이 없는 행은 맨 뒤 */
  sortValue?: (row: T) => string | number | null | undefined;
  align?: 'left' | 'right';
  /** 칸(td)에 붙는다. 폭·줄바꿈을 정할 때 쓴다 */
  className?: string;
}

interface DataTableProps<T> {
  rows: T[];
  rowKey: (row: T) => RowKey;
  columns: Column<T>[];
  /** lg 미만에서 같은 행을 리스트로 그릴 때 무엇을 보일지 */
  list: {
    title: (row: T) => ReactNode;
    subtitle?: (row: T) => ReactNode;
    leading?: (row: T) => ReactNode;
    trailing?: (row: T) => ReactNode;
  };
  onRowClick?: (row: T) => void;
  /** 있으면 표에 체크박스 열이 생긴다 */
  selection?: {
    selected: Set<RowKey>;
    onChange: (selected: Set<RowKey>) => void;
    /** 체크박스 이름에 쓸 글자 (예: 회원 이름). 없으면 list.title이 글자일 때 그것을 쓴다 */
    label?: (row: T) => string;
  };
  /** 행이 없을 때 보여 줄 것 */
  empty: ReactNode;
  /** 표의 이름. 화면 낭독기가 읽는다 */
  'aria-label': string;
  pagination?: PaginationProps;
  className?: string;
}

type SortState = { key: string; direction: 'ascending' | 'descending' } | null;

const collator = new Intl.Collator('ko');

/** 행 안의 버튼·링크·입력칸에서 시작된 이벤트인가 */
function fromInteractiveChild(event: MouseEvent | KeyboardEvent) {
  const target = event.target as HTMLElement;
  const interactive = target.closest(
    'button, a, input, select, textarea, label'
  );
  return interactive !== null && interactive !== event.currentTarget;
}

/**
 * 열 정의로 그리는 표. lg 이상에서는 표, 미만에서는 같은 행을 묶음 리스트로 그린다.
 * 전환은 CSS로만 한다 (두 모양이 모두 DOM에 있다).
 */
export function DataTable<T>({
  rows,
  rowKey,
  columns,
  list,
  onRowClick,
  selection,
  empty,
  'aria-label': ariaLabel,
  pagination,
  className,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>(null);

  const sortedRows = useMemo(() => {
    const column = sort && columns.find((c) => c.key === sort.key);
    if (!sort || !column?.sortValue) return rows;

    const valueOf = column.sortValue;
    const sign = sort.direction === 'ascending' ? 1 : -1;
    const isBlank = (value: unknown) =>
      value === null || value === undefined || value === '';

    // 원래 순서를 함께 들고 있어, 값이 같으면 원래 순서를 지킨다.
    return rows
      .map((row, index) => ({ row, index, value: valueOf(row) }))
      .sort((a, b) => {
        if (isBlank(a.value) || isBlank(b.value)) {
          if (isBlank(a.value) && isBlank(b.value)) return a.index - b.index;
          return isBlank(a.value) ? 1 : -1;
        }
        const compared =
          typeof a.value === 'number' && typeof b.value === 'number'
            ? a.value - b.value
            : collator.compare(String(a.value), String(b.value));
        return compared === 0 ? a.index - b.index : compared * sign;
      })
      .map(({ row }) => row);
  }, [rows, columns, sort]);

  const onClickHeader = (key: string) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, direction: 'ascending' };
      if (prev.direction === 'ascending')
        return { key, direction: 'descending' };
      return null;
    });
  };

  if (rows.length === 0) {
    return (
      <div className={className}>
        <div className="rounded-md bg-surface">
          {typeof empty === 'string' ? (
            <p className="px-4 py-12 text-center text-callout text-secondary">
              {empty}
            </p>
          ) : (
            empty
          )}
        </div>
        {/* 빈 쪽에서도 다른 쪽으로 갈 수 있어야 한다. */}
        {pagination && <Pagination {...pagination} className="mt-4" />}
      </div>
    );
  }

  const keys = sortedRows.map(rowKey);
  const selectedCount = selection
    ? keys.filter((key) => selection.selected.has(key)).length
    : 0;
  const allSelected = selectedCount > 0 && selectedCount === keys.length;

  const toggleRow = (key: RowKey) => {
    if (!selection) return;
    const next = new Set(selection.selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    selection.onChange(next);
  };

  const toggleAll = () => {
    if (!selection) return;
    const next = new Set(selection.selected);
    keys.forEach((key) => (allSelected ? next.delete(key) : next.add(key)));
    selection.onChange(next);
  };

  const selectionLabel = (row: T) => {
    if (selection?.label) return selection.label(row);
    const title = list.title(row);
    return typeof title === 'string' ? title : String(rowKey(row));
  };

  return (
    <div className={className}>
      <div
        data-testid="data-table-table"
        className="hidden overflow-x-auto rounded-md bg-surface lg:block"
      >
        <table
          aria-label={ariaLabel}
          className="w-full border-collapse text-left"
        >
          <thead>
            <tr className="border-b border-border">
              {selection && (
                <th scope="col" className="w-10 py-2 pl-4">
                  <Checkbox
                    aria-label="전체 선택"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate = selectedCount > 0 && !allSelected;
                      }
                    }}
                    onChange={toggleAll}
                    className="mr-0 align-middle"
                  />
                </th>
              )}
              {columns.map((column) => {
                const direction =
                  sort?.key === column.key ? sort.direction : 'none';
                const SortIcon =
                  direction === 'ascending'
                    ? ArrowUp
                    : direction === 'descending'
                      ? ArrowDown
                      : ChevronsUpDown;

                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={column.sortValue ? direction : undefined}
                    className={cn(
                      'whitespace-nowrap px-4 py-2 text-footnote font-medium text-secondary',
                      column.align === 'right' && 'text-right'
                    )}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        onClick={() => onClickHeader(column.key)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                          direction !== 'none' && 'text-primary'
                        )}
                      >
                        {column.header}
                        <SortIcon aria-hidden className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y-[0.5px] divide-separator">
            {sortedRows.map((row) => {
              const key = rowKey(row);
              const isSelected = selection?.selected.has(key) ?? false;

              return (
                <tr
                  key={key}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={
                    onRowClick
                      ? (event) => {
                          if (!fromInteractiveChild(event)) onRowClick(row);
                        }
                      : undefined
                  }
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (
                            event.key === 'Enter' &&
                            !fromInteractiveChild(event)
                          ) {
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  className={cn(
                    'transition-colors duration-150',
                    onRowClick &&
                      'cursor-pointer hover:bg-bg focus-visible:bg-bg focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
                    isSelected && 'bg-bg'
                  )}
                >
                  {selection && (
                    <td className="w-10 py-2 pl-4">
                      <Checkbox
                        aria-label={`${selectionLabel(row)} 선택`}
                        checked={isSelected}
                        onChange={() => toggleRow(key)}
                        className="mr-0 align-middle"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'px-4 py-2.5 text-callout text-primary',
                        column.align === 'right' && 'text-right',
                        column.className
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div data-testid="data-table-list" className="lg:hidden">
        <ListGroup>
          {sortedRows.map((row) => (
            <ListRow
              key={rowKey(row)}
              title={list.title(row)}
              subtitle={list.subtitle?.(row)}
              leading={list.leading?.(row)}
              trailing={list.trailing?.(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            />
          ))}
        </ListGroup>
      </div>

      {pagination && <Pagination {...pagination} className="mt-4" />}
    </div>
  );
}

export default DataTable;
