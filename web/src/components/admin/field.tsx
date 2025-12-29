type FieldProps = {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
};

/**
 * 表單欄位標籤組件
 * 用於統一後台表單的標籤樣式
 */
export function Field({ label, htmlFor, children }: FieldProps) {
  return (
    <div className="grid gap-2">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="text-sm font-semibold text-primary">
          {label}
        </label>
      ) : (
        <div className="text-sm font-semibold text-primary">{label}</div>
      )}
      {children}
    </div>
  );
}
