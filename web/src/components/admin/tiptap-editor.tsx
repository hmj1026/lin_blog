"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageResize from "tiptap-extension-resize-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageCropperModal, cropImageToBlob } from "@/components/admin/image-cropper-modal";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
  ImagePlus,
  Code,
} from "lucide-react";

type Props = {
  value: string;
  onChange: (html: string) => void;
};

// 工具欄按鈕包裝元件（含 Tooltip）
type ToolbarButtonProps = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
};

function ToolbarButton({ icon, label, onClick, disabled, active }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "primary" : "secondary"}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="p-2"
    >
      {icon}
    </Button>
  );
}

export function TiptapEditor({ value, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const [htmlDraft, setHtmlDraft] = useState(value);
  // 圖片裁切狀態
  const [cropOpen, setCropOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("");

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

  async function uploadBlobAndInsert(blob: Blob, fileName: string) {
    if (!editor) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", new File([blob], fileName, { type: blob.type || "image/jpeg" }));
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const json = (await res.json()) as { success: boolean; data?: { src: string }; message?: string };
      if (!res.ok || !json.success || !json.data?.src) {
        throw new Error(json.message || "上傳失敗");
      }
      editor.chain().focus().setImage({ src: json.data.src, alt: fileName }).run();
    } finally {
      setUploading(false);
    }
  }

  function handleFileSelect(file: File) {
    // 清理之前的 URL
    if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
    const url = URL.createObjectURL(file);
    setSelectedImageUrl(url);
    setSelectedFileName(file.name);
    setCropOpen(true);
  }

  function cleanupSelectedImage() {
    if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
    setSelectedImageUrl(null);
    setSelectedFileName("");
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
      <div className="flex flex-wrap items-center gap-1">
        {/* HTML 模式切換 */}
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
          aria-label="HTML"
          title="HTML 模式"
          className="px-2"
        >
          <Code className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-line mx-1" />

        {/* 文字格式 */}
        <ToolbarButton
          icon={<Bold className="h-4 w-4" />}
          label="粗體"
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          icon={<Italic className="h-4 w-4" />}
          label="斜體"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          icon={<UnderlineIcon className="h-4 w-4" />}
          label="底線"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <ToolbarButton
          icon={<Strikethrough className="h-4 w-4" />}
          label="刪除線"
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />

        <div className="w-px h-6 bg-line mx-1" />

        {/* 標題 */}
        <ToolbarButton
          icon={<Heading2 className="h-4 w-4" />}
          label="H2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarButton
          icon={<Heading3 className="h-4 w-4" />}
          label="H3"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />

        <div className="w-px h-6 bg-line mx-1" />

        {/* 列表 */}
        <ToolbarButton
          icon={<List className="h-4 w-4" />}
          label="無序清單"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          icon={<ListOrdered className="h-4 w-4" />}
          label="有序清單"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          icon={<Quote className="h-4 w-4" />}
          label="引言"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />

        <div className="w-px h-6 bg-line mx-1" />

        {/* 連結 */}
        <ToolbarButton
          icon={<LinkIcon className="h-4 w-4" />}
          label="連結"
          onClick={toggleLink}
        />

        <div className="w-px h-6 bg-line mx-1" />

        {/* 對齊 */}
        <ToolbarButton
          icon={<AlignLeft className="h-4 w-4" />}
          label="靠左"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        />
        <ToolbarButton
          icon={<AlignCenter className="h-4 w-4" />}
          label="置中"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        />
        <ToolbarButton
          icon={<AlignRight className="h-4 w-4" />}
          label="靠右"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        />

        <div className="w-px h-6 bg-line mx-1" />

        {/* 分隔線 */}
        <ToolbarButton
          icon={<Minus className="h-4 w-4" />}
          label="分隔線"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        />

        {/* 圖片 */}
        <ToolbarButton
          icon={<ImagePlus className="h-4 w-4" />}
          label={uploading ? "上傳中..." : "插入圖片"}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || mode === "html"}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            handleFileSelect(file);
            e.target.value = "";
          }}
        />
      </div>

      {/* 圖片裁切模態框 */}
      <ImageCropperModal
        open={cropOpen}
        imageUrl={selectedImageUrl}
        initialAspect={16 / 9}
        onCancel={() => {
          setCropOpen(false);
          cleanupSelectedImage();
        }}
        onConfirm={async ({ cropAreaPixels, outputWidth, outputHeight, mimeType }) => {
          if (!selectedImageUrl) return;
          setUploading(true);
          try {
            const blob = await cropImageToBlob({
              imageSrc: selectedImageUrl,
              cropAreaPixels,
              outputWidth,
              outputHeight,
              mimeType,
            });
            await uploadBlobAndInsert(blob, selectedFileName);
            setCropOpen(false);
            cleanupSelectedImage();
          } catch (error) {
            console.error("圖片裁切上傳失敗:", error);
            alert(error instanceof Error ? error.message : "圖片裁切上傳失敗");
          } finally {
            setUploading(false);
          }
        }}
      />
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
