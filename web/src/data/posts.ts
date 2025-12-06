export type Author = {
  name: string;
  title: string;
  initials: string;
  tone: "amber" | "teal" | "blue" | "rose";
};

export type RichContent =
  | { type: "paragraph"; text: string }
  | { type: "quote"; text: string; cite?: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "subheading"; text: string };

export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  date: string;
  readingTime: string;
  author: Author;
  hero: string;
  featured?: boolean;
  content: RichContent[];
};

export const posts: Post[] = [
  {
    slug: "community-first-blog-strategy",
    title: "從社群思維出發的部落格策略：讓讀者變成夥伴",
    excerpt:
      "如何讓內容不只被閱讀，而是引發對話？這份策略將設計、敘事與社群參與結合，打造高黏著度的內容體驗。",
    category: "策略",
    tags: ["社群經營", "品牌敘事", "Growth"],
    date: "2024-08-12",
    readingTime: "8 分鐘",
    author: { name: "林語安", title: "內容設計顧問", initials: "YA", tone: "amber" },
    hero: "/images/hero-community.svg",
    featured: true,
    content: [
      { type: "paragraph", text: "社群思維不只是把文章丟到社群平台，而是從第一段開始就邀請讀者參與。這篇文章拆解如何在標題、導讀、段落設計與行動呼籲中，留下「可共創」的空間。" },
      { type: "subheading", text: "三個讓讀者捲入的設計重點" },
      { type: "list", ordered: true, items: ["提供意見掛鉤：在段落結尾丟出具體問題，誘發留言。", "給出可複製模板：把流程拆成步驟，附上範例。", "設計社群任務：提供可分享的微挑戰，讓讀者主動擴散。"] },
      { type: "paragraph", text: "真正的社群感來自雙向信任。當你願意分享決策過程、公開實驗結果，讀者會更願意提供回饋，甚至成為共同創作者。" },
      { type: "quote", text: "內容的價值不在於被看見，而在於被延續。", cite: "Community-first 原則" },
    ],
  },
  {
    slug: "designing-readable-layouts",
    title: "打造高可讀性的版面：排版、節奏與留白指南",
    excerpt:
      "從行長、字級到行距，每個細節都影響閱讀節奏。這份指南示範如何運用留白、強調色與圖文節奏，讓文章更耐讀。",
    category: "設計",
    tags: ["UI/UX", "排版", "Design System"],
    date: "2024-07-03",
    readingTime: "6 分鐘",
    author: { name: "張葳妮", title: "產品設計師", initials: "WN", tone: "teal" },
    hero: "/images/layout-balance.svg",
    featured: true,
    content: [
      { type: "paragraph", text: "可讀性的核心是節奏。若所有段落都一樣長、圖都擠在一起，讀者很快就會疲乏。善用留白、不同層次的標題與插圖，能讓閱讀更像散步而非衝刺。" },
      { type: "subheading", text: "版面節奏的三個指標" },
      { type: "list", items: ["行長 60-74 字最舒適，中文以 28-34 個字元為佳。", "每 2-3 個段落插入小標或圖表，幫助視覺重置。", "CTA 前後預留留白，讓行動更聚焦。"] },
      { type: "paragraph", text: "用顏色與字重區分資訊層級，同時避免一次塞入過多重點。讀者在五秒內就能判斷文章是否值得讀，版面決定了這五秒的印象。" },
    ],
  },
  {
    slug: "seo-without-losing-voice",
    title: "兼顧 SEO 與品牌語氣：讓搜尋與識別並存",
    excerpt:
      "SEO 不是堆疊關鍵字，而是用讀者熟悉的語言回答問題。這篇文章示範如何保持品牌語氣，同時對搜尋友善。",
    category: "行銷",
    tags: ["SEO", "內容行銷", "品牌"],
    date: "2024-06-18",
    readingTime: "7 分鐘",
    author: { name: "陳右揚", title: "品牌策略", initials: "RY", tone: "blue" },
    hero: "/images/seo-voice.svg",
    content: [
      { type: "paragraph", text: "關鍵字研究應該服務於讀者，而非取代品牌語氣。選擇能代表用戶問題、同時貼合品牌風格的詞彙，把它融入標題、小標與導讀。" },
      { type: "subheading", text: "實作檢查清單" },
      { type: "list", items: ["每篇文章聚焦 1-2 個核心意圖，避免分散。", "導讀段落以品牌語氣解釋讀者能獲得的價值。", "內文保持語調一致，避免為了關鍵字犧牲可讀性。"] },
      { type: "quote", text: "最好的 SEO 文章，是讀者願意收藏與轉貼的文章。", cite: "內容駭客手冊" },
    ],
  },
  {
    slug: "community-rituals",
    title: "社群儀式感：用固定節奏累積參與",
    excerpt:
      "週一靈感、週五放送、月度 AMA，儀式感讓社群有可預期的節奏，也讓內容被期待。這篇拆解設定方法與維運心法。",
    category: "社群",
    tags: ["營運", "活動設計"],
    date: "2024-05-22",
    readingTime: "5 分鐘",
    author: { name: "林語安", title: "內容設計顧問", initials: "YA", tone: "amber" },
    hero: "/images/rituals.svg",
    content: [
      { type: "paragraph", text: "儀式感的核心是可預期。固定的發布節奏、專屬的欄位名稱，讓社群知道何時回來、要期待什麼。這不僅提升回訪率，也降低內容製作成本。" },
      { type: "list", items: ["設定一個「固定時間 + 固定欄目」的骨架。", "保持格式一致，例如同樣的封面、標題模板。", "適度加入讀者作品或留言，強化參與感。"] },
    ],
  },
  {
    slug: "newsletter-playbook",
    title: "打造高轉換 Newsletter：從欄位到 CTA 的微調清單",
    excerpt:
      "Newsletter 不是再貼一次文章連結，而是為忠實讀者設計的「精選與提醒」。這份清單協助你提升開信率與點擊率。",
    category: "策略",
    tags: ["Newsletter", "轉換", "Email"],
    date: "2024-04-10",
    readingTime: "6 分鐘",
    author: { name: "張葳妮", title: "產品設計師", initials: "WN", tone: "teal" },
    hero: "/images/newsletter.svg",
    content: [
      { type: "paragraph", text: "每封信都要回答：為什麼現在要寄？對收件者的明確價值是什麼？只有當理由清楚，CTA 才有力度。" },
      { type: "subheading", text: "微調重點" },
      { type: "list", items: ["Subject line 14-38 字，聚焦一個行動。", "置頂一句「本期你會收穫什麼」。", "CTA 保持單一明確，避免多重動作稀釋轉換。"] },
    ],
  },
  {
    slug: "design-system-for-content",
    title: "為內容建立 Design System：從 token 到模組",
    excerpt:
      "內容常被視為一次性產出，但如果把標題、小圖、引言、CTA 模組化，就能讓團隊協作更快速。這篇分享建制方法。",
    category: "設計",
    tags: ["Design System", "Component", "內容營運"],
    date: "2024-03-15",
    readingTime: "9 分鐘",
    author: { name: "陳右揚", title: "品牌策略", initials: "RY", tone: "blue" },
    hero: "/images/system.svg",
    content: [
      { type: "paragraph", text: "把內容視為模組而非文章，能讓設計、行銷與工程共用同一套語言。定義 token（字體、色彩、間距）後，再設計卡片、引用、CTA 等模組，最後組成版面。" },
      { type: "quote", text: "模組化不是犧牲創意，而是把創意放在真正需要的地方。", cite: "Design Ops 策略" },
      { type: "paragraph", text: "定期回收使用率低的模組，讓系統保持精簡。把「如何使用」寫進指南，讓新成員能快速上手。" },
    ],
  },
];

export const categories = Array.from(new Set(posts.map((post) => post.category)));

export const tags = Array.from(
  new Set(
    posts
      .map((post) => post.tags)
      .flat()
      .sort()
  )
);

export function getPost(slug: string) {
  return posts.find((post) => post.slug === slug);
}

export function getRelatedPosts(slug: string, take = 3) {
  const current = getPost(slug);
  if (!current) return [];
  return posts
    .filter((post) => post.slug !== slug && (post.category === current.category || post.tags.some((tag) => current.tags.includes(tag))))
    .slice(0, take);
}
