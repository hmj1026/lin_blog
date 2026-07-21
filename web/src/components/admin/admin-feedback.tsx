import { Button } from "@/components/ui/button";

type AdminFeedbackProps = {
  tone: "success" | "error" | "info";
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
};

/** 以一致且可被輔助科技讀取的方式呈現後台操作回饋。 */
export function AdminFeedback({ tone, message, onRetry, retryLabel = "重試" }: AdminFeedbackProps) {
  const isError = tone === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      className={`rounded-xl border p-4 text-sm ${
        isError
          ? "border-red-300 bg-red-50 text-red-800"
          : tone === "success"
            ? "border-green-300 bg-green-50 text-green-800"
            : "border-line bg-base-50 text-primary"
      }`}
    >
      <p>{message}</p>
      {onRetry ? (
        <Button type="button" size="sm" variant="secondary" className="mt-3" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
