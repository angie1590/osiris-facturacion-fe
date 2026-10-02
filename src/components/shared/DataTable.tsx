import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Eye,
  Pencil,
  Power,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { TablePagination } from "./TablePagination";
import { cn } from "@/lib/utils";

export type SortDir = "asc" | "desc";
export interface SortState {
  key: string;
  dir: SortDir;
}

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
  /** Mark the column sortable; renders an interactive, accessible header. */
  sortable?: boolean;
  /** Value used to sort this column (client-side sorting). */
  sortAccessor?: (row: T) => string | number | Date | null | undefined;
  /** Text alignment for header + cells. */
  align?: "left" | "right" | "center";
}

export interface DataTableRowActions<T> {
  getLabel: (row: T) => string;
  isActive?: (row: T) => boolean;
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onToggleActive?: (row: T) => void;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyHeading?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };
  className?: string;
  /** Initial/base sort. Third click on a header returns here (or to unsorted). */
  defaultSort?: SortState;
  /**
   * Controlled sort. Provide together with `onSortChange` for server-side
   * sorting — DataTable then renders indicators but does NOT reorder `data`.
   */
  sort?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;
  expandableRow?: (row: T) => React.ReactNode;
  rowActions?: DataTableRowActions<T>;
  pageSize?: number;
  pagination?:
    | boolean
    | {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
        onPageChange: (page: number) => void;
        itemLabel?: string;
      };
}

const SKELETON_ROWS = 5;

const ALIGN_CLASS: Record<NonNullable<Column<unknown>["align"]>, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "es-EC", {
    numeric: true,
    sensitivity: "base",
  });
}

function SortableColumnHeader({
  label,
  state,
  align,
  onToggle,
}: {
  label: React.ReactNode;
  state: SortDir | null;
  align?: Column<unknown>["align"];
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "group inline-flex w-full items-center gap-1.5 font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm",
        align === "right" && "flex-row-reverse",
        align === "center" && "justify-center",
      )}
    >
      <span>{label}</span>
      {state === "asc" ? (
        <ArrowUp className="h-3.5 w-3.5 text-primary" />
      ) : state === "desc" ? (
        <ArrowDown className="h-3.5 w-3.5 text-primary" />
      ) : (
        <ChevronsUpDown className="h-3.5 w-3.5 opacity-40 group-hover:opacity-70" />
      )}
    </button>
  );
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  isLoading,
  isError,
  onRetry,
  emptyHeading = "No hay registros",
  emptyDescription,
  emptyAction,
  className,
  defaultSort,
  sort,
  onSortChange,
  expandableRow,
  rowActions,
  pageSize = 10,
  pagination = true,
}: DataTableProps<T>) {
  const isControlled = onSortChange != null;
  const [internalSort, setInternalSort] = React.useState<SortState | null>(
    defaultSort ?? null,
  );
  const [expandedRowKey, setExpandedRowKey] = React.useState<
    string | number | null
  >(null);
  const [page, setPage] = React.useState(1);
  const effectiveSort = isControlled ? (sort ?? null) : internalSort;

  const handleToggle = (key: string) => {
    const current = effectiveSort?.key === key ? effectiveSort.dir : null;
    let next: SortState | null;
    if (current == null) next = { key, dir: "asc" };
    else if (current === "asc") next = { key, dir: "desc" };
    else next = defaultSort ?? null;
    if (isControlled) onSortChange!(next);
    else setInternalSort(next);
  };

  const sortedData = React.useMemo(() => {
    if (isControlled || !effectiveSort) return data;
    const col = columns.find((c) => c.key === effectiveSort.key);
    if (!col?.sortAccessor) return data;
    const accessor = col.sortAccessor;
    return [...data].sort((ra, rb) => {
      const cmp = compareValues(accessor(ra), accessor(rb));
      return effectiveSort.dir === "asc" ? cmp : -cmp;
    });
  }, [data, columns, effectiveSort, isControlled]);

  const totalRows = sortedData.length;
  const actionColumnCount = rowActions ? 1 : 0;
  const actionButtonCount = rowActions
    ? Number(Boolean(rowActions.onView)) +
      Number(Boolean(rowActions.onEdit)) +
      Number(Boolean(rowActions.onToggleActive))
    : 0;
  const expansionColumnCount = expandableRow ? 1 : 0;
  const totalColumns =
    columns.length + actionColumnCount + expansionColumnCount;
  const serverPagination = typeof pagination === "object" ? pagination : null;
  const totalPages =
    serverPagination?.totalPages ??
    Math.max(1, Math.ceil(totalRows / pageSize));

  React.useEffect(() => {
    setPage(1);
  }, [totalRows, effectiveSort?.key, effectiveSort?.dir, pageSize]);

  const currentPage = serverPagination?.page ?? Math.min(page, totalPages);
  const effectivePageSize = serverPagination?.pageSize ?? pageSize;
  const effectiveTotalRows = serverPagination?.total ?? totalRows;
  const start = (currentPage - 1) * effectivePageSize;
  const end = start + effectivePageSize;
  const pagedData = serverPagination
    ? sortedData
    : pagination
      ? sortedData.slice(start, end)
      : sortedData;

  React.useEffect(() => {
    if (
      expandedRowKey != null &&
      !data.some((row) => rowKey(row) === expandedRowKey)
    ) {
      setExpandedRowKey(null);
    }
  }, [data, expandedRowKey, rowKey]);
  const setCurrentPage = (nextPage: number) => {
    if (serverPagination) serverPagination.onPageChange(nextPage);
    else setPage(nextPage);
  };

  return (
    <div className={cn("rounded-md border", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {expandableRow && <TableHead className="w-10" />}
            {columns.map((col) => {
              const sortState =
                effectiveSort?.key === col.key ? effectiveSort.dir : null;
              const ariaSort = col.sortable
                ? sortState === "asc"
                  ? "ascending"
                  : sortState === "desc"
                    ? "descending"
                    : "none"
                : undefined;
              return (
                <TableHead
                  key={col.key}
                  aria-sort={ariaSort}
                  className={cn(
                    col.align && ALIGN_CLASS[col.align],
                    col.sortable && "cursor-pointer",
                    col.className,
                  )}
                >
                  {col.sortable ? (
                    <SortableColumnHeader
                      label={col.header}
                      state={sortState}
                      align={col.align}
                      onToggle={() => handleToggle(col.key)}
                    />
                  ) : (
                    col.header
                  )}
                </TableHead>
              );
            })}
            {rowActions && (
              <TableHead className="w-32 text-right">Acciones</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <TableRow key={i}>
                {expandableRow && <TableCell />}
                {columns.map((col) => (
                  <TableCell key={col.key}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
                {rowActions && (
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {Array.from({ length: actionButtonCount }, (_, index) => (
                        <Skeleton key={index} className="h-8 w-8" />
                      ))}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          ) : isError ? (
            <TableRow>
              <TableCell colSpan={totalColumns} className="p-0">
                <ErrorState onRetry={onRetry} />
              </TableCell>
            </TableRow>
          ) : sortedData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={totalColumns} className="p-0">
                <EmptyState
                  heading={emptyHeading}
                  description={emptyDescription}
                  action={emptyAction}
                />
              </TableCell>
            </TableRow>
          ) : (
            pagedData.map((row) => {
              const key = rowKey(row);
              const isExpanded = expandedRowKey === key;
              return (
                <React.Fragment key={key}>
                  <TableRow>
                    {expandableRow && (
                      <TableCell className="w-10 px-2">
                        <button
                          type="button"
                          className="rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() =>
                            setExpandedRowKey(isExpanded ? null : key)
                          }
                          aria-label={
                            isExpanded
                              ? "Colapsar detalles"
                              : "Expandir detalles"
                          }
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={cn(
                          col.align && ALIGN_CLASS[col.align],
                          col.className,
                        )}
                      >
                        {col.cell(row)}
                      </TableCell>
                    ))}
                    {rowActions && (
                      <TableCell className="whitespace-nowrap text-right">
                        <div className="flex justify-end gap-1">
                          {rowActions.onView && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => rowActions.onView?.(row)}
                              title={`Ver ${rowActions.getLabel(row)}`}
                              aria-label={`Ver ${rowActions.getLabel(row)}`}
                            >
                              <Eye className="h-4 w-4 text-primary" />
                            </Button>
                          )}
                          {rowActions.onEdit && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => rowActions.onEdit?.(row)}
                              title={`Editar ${rowActions.getLabel(row)}`}
                              aria-label={`Editar ${rowActions.getLabel(row)}`}
                            >
                              <Pencil className="h-4 w-4 text-primary" />
                            </Button>
                          )}
                          {rowActions.onToggleActive && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-8 w-8",
                                (rowActions.isActive?.(row) ?? true)
                                  ? "text-destructive hover:text-destructive"
                                  : "text-success hover:text-success",
                              )}
                              onClick={() => rowActions.onToggleActive?.(row)}
                              title={`${(rowActions.isActive?.(row) ?? true) ? "Desactivar" : "Activar"} ${rowActions.getLabel(row)}`}
                              aria-label={`${(rowActions.isActive?.(row) ?? true) ? "Desactivar" : "Activar"} ${rowActions.getLabel(row)}`}
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                  {isExpanded && expandableRow && (
                    <TableRow>
                      <TableCell
                        colSpan={totalColumns}
                        className="bg-muted/30 p-4"
                      >
                        {expandableRow(row)}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })
          )}
        </TableBody>
      </Table>
      {pagination && !isLoading && !isError && sortedData.length > 0 && (
        <TablePagination
          page={currentPage}
          pageSize={effectivePageSize}
          total={effectiveTotalRows}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemLabel={serverPagination?.itemLabel}
        />
      )}
    </div>
  );
}
