"use client";

import { useEffect, useRef, useState } from "react";

// 支援的語言列表
const SUPPORTED_LANGUAGES = [
  "javascript", "typescript", "jsx", "tsx",
  "html", "css", "scss",
  "json", "yaml",
  "python", "go", "rust",
  "bash", "shell",
  "sql",
  "markdown",
];

type CodeBlockProps = {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
};

/**
 * 程式碼區塊元件
 * 使用 CSS 樣式實現基本的語法高亮效果
 */
export function CodeBlock({ 
  code, 
  language = "text", 
  showLineNumbers = true 
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 降級方案
      const textArea = document.createElement("textarea");
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const lines = code.split("\n");
  const isSupported = SUPPORTED_LANGUAGES.includes(language.toLowerCase());

  return (
    <div className="group relative rounded-xl bg-[#1e1e2e] text-sm font-mono overflow-hidden">
      {/* 頂部工具列 */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#181825] border-b border-[#313244]">
        <span className="text-xs text-[#6c7086]">
          {isSupported ? language : "text"}
        </span>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
            copied
              ? "bg-green-500/20 text-green-400"
              : "text-[#6c7086] hover:bg-[#313244] hover:text-[#cdd6f4]"
          }`}
        >
          {copied ? (
            <>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              已複製
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              複製
            </>
          )}
        </button>
      </div>

      {/* 程式碼內容 */}
      <div className="overflow-x-auto">
        <pre ref={codeRef} className="py-4">
          <code className={`language-${language}`}>
            {lines.map((line, index) => (
              <div key={index} className="flex">
                {showLineNumbers && (
                  <span className="select-none w-12 text-right pr-4 text-[#6c7086]">
                    {index + 1}
                  </span>
                )}
                <span className="flex-1 px-4 text-[#cdd6f4]">{line || " "}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
