"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

type ConfirmationDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  pending?: boolean;
  returnFocus?: HTMLElement | null;
  onConfirm: () => void;
  onCancel: () => void;
};

/** 顯示具影響說明、焦點管理與鍵盤取消能力的確認對話框。 */
export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel = "確認",
  pending = false,
  returnFocus,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const onCancelRef = useRef(onCancel);
  const pendingRef = useRef(pending);

  useEffect(() => {
    onCancelRef.current = onCancel;
    pendingRef.current = pending;
  }, [onCancel, pending]);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = returnFocus ?? (document.activeElement as HTMLElement | null);
    dialogRef.current?.focus();

    /** 允許使用者以 Escape 安全取消對話框，並將 Tab 焦點循環限制在對話框內。 */
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pendingRef.current) {
        onCancelRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables || focusables.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      const inside = dialogRef.current?.contains(active) ?? false;
      if (event.shiftKey) {
        if (!inside || active === first || active === dialogRef.current) {
          event.preventDefault();
          last.focus();
        }
      } else if (!inside || active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [open, returnFocus]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-primary/40 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirmation-title"
        aria-describedby="admin-confirmation-description"
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-soft outline-none"
      >
        <h2 id="admin-confirmation-title" className="text-lg font-semibold text-primary">
          {title}
        </h2>
        <p id="admin-confirmation-description" className="mt-2 text-sm text-base-300">
          {description}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            取消
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} disabled={pending}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
