"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/admin/post-form/field";
import { ContentEditorField } from "@/components/admin/post-form/content-editor-field";
import { type AuthoringMode } from "@/components/admin/post-form/mode-selector";
import { detectStrippedRichHtml } from "@/lib/utils/detect-rich-html";

type AboutInitial = {
  aboutTitle: string | null;
  aboutContent: string | null;
  aboutAllowRawHtml: boolean;
  aboutShowRawHtmlToc: boolean;
};

export function AboutEditorForm({ initial }: { initial: AboutInitial }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.aboutTitle ?? "");
  const [content, setContent] = useState(initial.aboutContent ?? "");
  const [authoringMode, setAuthoringMode] = useState<AuthoringMode>(
    initial.aboutAllowRawHtml ? "raw" : "visual"
  );
  const allowRawHtml = authoringMode === "raw";
  const draftsRef = useRef<{ visual: string | null; raw: string | null }>({
    visual: initial.aboutAllowRawHtml ? null : (initial.aboutContent ?? ""),
    raw: initial.aboutAllowRawHtml ? (initial.aboutContent ?? "") : null,
  });
  const [pendingSwitchTarget, setPendingSwitchTarget] = useState<AuthoringMode | null>(null);
  const [showRawHtmlToc, setShowRawHtmlToc] = useState(initial.aboutShowRawHtmlToc ?? false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const showRichHtmlWarning = useMemo(
    () => !allowRawHtml && detectStrippedRichHtml(content),
    [allowRawHtml, content]
  );

  function performSwitch(target: AuthoringMode) {
    draftsRef.current[authoringMode] = content;
    const nextDraft = draftsRef.current[target] ?? content;
    draftsRef.current[target] = nextDraft;
    setContent(nextDraft);
    setAuthoringMode(target);
  }
  function switchMode(target: AuthoringMode) {
    if (target === authoringMode) return;
    if (authoringMode === "raw" && target === "visual" && detectStrippedRichHtml(content)) {
      setPendingSwitchTarget(target);
      return;
    }
    performSwitch(target);
  }
  function confirmPendingSwitch() {
    if (!pendingSwitchTarget) return;
    performSwitch(pendingSwitchTarget);
    setPendingSwitchTarget(null);
  }
  function cancelPendingSwitch() {
    setPendingSwitchTarget(null);
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      if (!allowRawHtml && detectStrippedRichHtml(content)) {
        const confirmed = window.confirm(
          "一般模式將不可逆地剝除區塊結構與 inline 樣式（<div>/style=/<style>）。確定要以一般模式儲存嗎？改用「原始 HTML 模式」可保留樣式。"
        );
        if (!confirmed) {
          setSaving(false);
          return;
        }
      }
      const payload = {
        aboutTitle: title.trim() ? title.trim() : null,
        aboutContent: content,
        aboutAllowRawHtml: allowRawHtml,
        aboutShowRawHtmlToc: showRawHtmlToc,
      };
      const res = await fetch("/api/site-settings/about", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.message || "儲存失敗");
      }
      setMessage("已儲存");
      router.refresh();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6" data-testid="about-editor-form">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-primary">關於我</h1>
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? "儲存中..." : "儲存"}
        </Button>
      </div>
      {message && <p className="text-sm text-base-300">{message}</p>}
      <Field label="標題" htmlFor="about-title">
        <input
          id="about-title"
          className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-primary"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="關於我"
        />
      </Field>
      <ContentEditorField
        authoringMode={authoringMode}
        onModeChange={switchMode}
        pendingSwitchTarget={pendingSwitchTarget}
        onConfirmPendingSwitch={confirmPendingSwitch}
        onCancelPendingSwitch={cancelPendingSwitch}
        content={content}
        onContentChange={setContent}
        allowRawHtml={allowRawHtml}
        showRawHtmlToc={showRawHtmlToc}
        onShowRawHtmlTocChange={setShowRawHtmlToc}
        showRichHtmlWarning={showRichHtmlWarning}
      />
    </div>
  );
}
