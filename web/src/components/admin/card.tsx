import { cn } from "@/lib/utils";

type AdminCardProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * 後台卡片容器組件
 * 用於包裹表單、表格等內容區塊
 */
export function AdminCard({ children, className }: AdminCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-white p-6 shadow-card",
        className
      )}
    >
      {children}
    </div>
  );
}
