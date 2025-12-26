"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageResize from "tiptap-extension-resize-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  value: string;
  onChange: (html: string) => void;
};

export function TiptapEditor({ value, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const [htmlDraft, setHtmlDraft] = useState(value);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      ImageResize.configure({
        allowBase64: true,
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "min-h-[360px] rounded-2xl border border-line bg-white p-6 shadow-card focus:outline-none wysiwyg",
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() === value) return;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    if (mode === "html") {
      setHtmlDraft(value);
    }
  }, [mode, value]);

  async function uploadAndInsert(file: File) {
    if (!editor) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const json = (await res.json()) as { success: boolean; data?: { src: string }; message?: string };
      if (!res.ok || !json.success || !json.data?.src) {
        throw new Error(json.message || "上傳失敗");
      }
      editor.chain().focus().setImage({ src: json.data.src, alt: file.name }).run();
    } finally {
      setUploading(false);
    }
  }

  function toggleLink() {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("連結 URL", previousUrl || "");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: url.trim() }).run();
  }

  if (!editor) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "html" ? "primary" : "secondary"}
          onClick={() => {
            if (mode === "html") {
              setMode("visual");
              editor.commands.setContent(htmlDraft || "<p></p>", { emitUpdate: false });
              onChange(editor.getHTML());
            } else {
              setHtmlDraft(editor.getHTML());
              setMode("html");
            }
          }}
        >
          HTML
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => editor.chain().focus().toggleBold().run()}>
          粗體
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => editor.chain().focus().toggleItalic().run()}>
          斜體
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => editor.chain().focus().toggleUnderline().run()}>
          底線
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => editor.chain().focus().toggleStrike().run()}>
          刪除線
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          無序清單
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          有序清單
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          引言
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={toggleLink}>
          連結
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          靠左
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          置中
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          靠右
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          分隔線
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={uploading || mode === "html"}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? "上傳中..." : "插入圖片"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            void uploadAndInsert(file);
            e.target.value = "";
          }}
        />
      </div>
      {mode === "html" ? (
        <textarea
          className="min-h-[360px] w-full rounded-2xl border border-line bg-white p-6 text-sm text-primary shadow-card focus:outline-none font-mono"
          value={htmlDraft}
          onChange={(e) => setHtmlDraft(e.target.value)}
        />
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  );
}
