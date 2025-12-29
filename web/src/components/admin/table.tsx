import { cn } from "@/lib/utils";

type AdminTableProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * 後台表格容器
 */
export function AdminTable({ children, className }: AdminTableProps) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-line", className)}>
      <table className="min-w-full text-sm">{children}</table>
    </div>
  );
}

/**
 * 後台表格標題列
 */
export function AdminTableHead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-base-100 text-left text-base-300">{children}</thead>;
}

/**
 * 後台表格內容區
 */
export function AdminTableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

type AdminTableRowProps = {
  children: React.ReactNode;
  selected?: boolean;
  className?: string;
};

/**
 * 後台表格資料列
 */
export function AdminTableRow({ children, selected, className }: AdminTableRowProps) {
  return (
    <tr
      className={cn(
        "border-t border-line",
        selected && "bg-accent-500/5",
        className
      )}
    >
      {children}
    </tr>
  );
}

type AdminTableCellProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * 後台表格儲存格
 */
export function AdminTableCell({ children, className }: AdminTableCellProps) {
  return <td className={cn("px-4 py-3", className)}>{children}</td>;
}

/**
 * 後台表格標題儲存格
 */
export function AdminTableHeaderCell({ children, className }: AdminTableCellProps) {
  return <th className={cn("px-4 py-3", className)}>{children}</th>;
}

type AdminTableEmptyProps = {
  colSpan: number;
  message: string;
};

/**
 * 後台表格空狀態
 */
export function AdminTableEmpty({ colSpan, message }: AdminTableEmptyProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-6 text-center text-base-300">
        {message}
      </td>
    </tr>
  );
}
