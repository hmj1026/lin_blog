import { AdminTable } from "./table";

type AdminDataTableProps = {
  ariaLabel: string;
  children: React.ReactNode;
  className?: string;
};

/** 提供在窄螢幕仍可由鍵盤操作的後台資料表容器。 */
export function AdminDataTable({ ariaLabel, children, className }: AdminDataTableProps) {
  return (
    <AdminTable ariaLabel={ariaLabel} className={className}>
      {children}
    </AdminTable>
  );
}
