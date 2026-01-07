import { extractHeadings, type TocItem } from "@/lib/utils/toc";

type InlineTocProps = {
  /** 文章 HTML（當未提供 items 時用於解析） */
  html?: string;
  /** 直接提供目錄項目（優先使用，避免重複解析） */
  items?: TocItem[];
};

/**
 * 產生層級編號（1, 1.1, 1.2, 2, 2.1 等格式）
 */
function generateHierarchicalNumbers(items: TocItem[]): string[] {
  const numbers: string[] = [];
  let h2Count = 0;
  let h3Count = 0;

  for (const item of items) {
    if (item.level === 2) {
      h2Count++;
      h3Count = 0; // 重置 H3 計數
      numbers.push(String(h2Count));
    } else {
      // H3
      h3Count++;
      numbers.push(`${h2Count}.${h3Count}`);
    }
  }

  return numbers;
}

export function InlineToc({ html, items: providedItems }: InlineTocProps) {
  // 優先使用傳入的 items，否則從 html 解析
  const items = providedItems ?? (html ? extractHeadings(html) : []);

  if (items.length < 2) {
    return null;
  }

  const numbers = generateHierarchicalNumbers(items);

  return (
    <nav
      className="inline-toc mb-8 rounded-2xl border border-line bg-white p-6 shadow-card dark:bg-base-100 dark:border-base-200"
      aria-label="目錄"
    >
      <div className="mb-4">
        <h2 className="inline-block rounded-lg bg-accent px-4 py-2 text-lg font-bold text-primary dark:bg-amber-500/20 dark:text-amber-200">
          目錄
        </h2>
      </div>

      <ol className="space-y-3">
        {items.map((item, index) => (
          <li
            key={item.id}
            className={`flex items-start gap-3 ${item.level === 3 ? "ml-6" : ""}`}
          >
            <span className="flex-shrink-0 text-purple font-bold dark:text-violet-400">
              {numbers[index]}
            </span>
            <span className="text-base-300 dark:text-base-500" aria-hidden="true">
              |
            </span>
            <a
              href={`#${item.id}`}
              className="text-primary hover:text-purple transition-colors dark:text-stone-200 dark:hover:text-violet-400"
            >
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

