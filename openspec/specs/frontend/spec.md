# frontend Specification

## Purpose
TBD - created by archiving change add-phase3-advanced-features. Update Purpose after archive.
## Requirements
### Requirement: Table of Contents Navigation
The system SHALL provide a table of contents for blog posts with multiple headings.

#### Scenario: Display TOC for long articles
- **WHEN** a blog post contains H2/H3 headings
- **THEN** the system SHALL display a sidebar TOC listing all headings

#### Scenario: TOC navigation
- **WHEN** a user clicks on a TOC item
- **THEN** the page SHALL scroll to the corresponding heading

#### Scenario: Highlight active section
- **WHEN** a user scrolls through the article
- **THEN** the TOC SHALL highlight the currently visible section

---

### Requirement: Reading Progress Indicator
The system SHALL display a reading progress indicator for blog posts.

#### Scenario: Progress bar visibility
- **WHEN** a user is reading a blog post
- **THEN** a progress bar SHALL appear at the top of the page

#### Scenario: Progress bar updates
- **WHEN** the user scrolls down the page
- **THEN** the progress bar SHALL reflect the percentage of content scrolled

---

### Requirement: Social Sharing Buttons
The system SHALL provide social sharing buttons on blog posts.

#### Scenario: Share to Facebook
- **WHEN** a user clicks the Facebook share button
- **THEN** the system SHALL open a Facebook share dialog with the post URL

#### Scenario: Share to Twitter
- **WHEN** a user clicks the Twitter share button
- **THEN** the system SHALL open a Twitter compose dialog with the post title and URL

#### Scenario: Share to LINE
- **WHEN** a user clicks the LINE share button
- **THEN** the system SHALL open LINE's share mechanism with the post URL

#### Scenario: Copy link
- **WHEN** a user clicks the copy link button
- **THEN** the post URL SHALL be copied to the clipboard with confirmation feedback

### Requirement: Code Syntax Highlighting
The system SHALL provide syntax highlighting for code blocks in blog posts.

#### Scenario: Display highlighted code
- **WHEN** a blog post contains a fenced code block with a language identifier
- **THEN** the code SHALL be rendered with syntax highlighting

#### Scenario: Copy code button
- **WHEN** a user hovers over a code block
- **THEN** a copy button SHALL appear

#### Scenario: Copy code
- **WHEN** a user clicks the copy button
- **THEN** the code content SHALL be copied to clipboard with feedback

---

### Requirement: Dark Mode
The system SHALL support dark mode for the frontend with readable contrast for text and interactive elements across primary pages and shared components.

#### Scenario: System preference detection
- **WHEN** a user visits with system dark mode enabled
- **THEN** the site SHALL automatically use dark theme

#### Scenario: Manual toggle
- **WHEN** a user clicks the theme toggle
- **THEN** the site SHALL switch between light and dark themes

#### Scenario: Preference persistence
- **WHEN** a user selects a theme preference
- **THEN** the preference SHALL be saved for future visits

#### Scenario: Readable contrast on dark surfaces
- **WHEN** the site is in dark mode
- **THEN** primary text, secondary text, and key UI surfaces SHALL maintain readable contrast on navigation, hero, and card components

### Requirement: Theme Toggle Integration
The system SHALL integrate the theme toggle into the navigation bar.

#### Scenario: Toggle visible in navbar
- **WHEN** a user views any page
- **THEN** a theme toggle button SHALL be visible in the navigation bar

#### Scenario: Theme toggle works
- **WHEN** a user clicks the theme toggle
- **THEN** the theme SHALL cycle through light/dark/system modes

---

### Requirement: SEO Metadata Integration
The system SHALL use custom SEO fields for page metadata when available.

#### Scenario: Use custom SEO title
- **WHEN** a post has seoTitle set
- **THEN** the page title SHALL use seoTitle instead of title

#### Scenario: Use custom SEO description
- **WHEN** a post has seoDescription set
- **THEN** the meta description SHALL use seoDescription instead of excerpt

#### Scenario: Use custom OG image
- **WHEN** a post has ogImage set
- **THEN** the Open Graph image SHALL use ogImage instead of coverImage

#### Scenario: Fallback to defaults
- **WHEN** SEO fields are empty
- **THEN** the system SHALL use title, excerpt, and coverImage as defaults

### Requirement: PostCard Responsive Layout
The system SHALL provide responsive PostCard layouts that adapt to different screen sizes and content types.

#### Scenario: Horizontal layout on desktop
- **WHEN** PostCard is displayed with horizontal layout on desktop (>768px)
- **THEN** the grid ratio SHALL be 0.8:1 (image:text) to prioritize text content

#### Scenario: Vertical layout on mobile
- **WHEN** PostCard is displayed on mobile (<768px)
- **THEN** the layout SHALL stack vertically with image on top

#### Scenario: Image aspect ratio for horizontal layout
- **WHEN** PostCard uses horizontal layout
- **THEN** the image container SHALL use aspect-square to accommodate social-style cover images

#### Scenario: Image aspect ratio for vertical layout
- **WHEN** PostCard uses vertical layout
- **THEN** the image container SHALL use aspect-4/3 for balanced visual weight

---

### Requirement: PostCard Content Truncation
The system SHALL truncate long content in PostCards to maintain consistent card heights.

#### Scenario: Excerpt truncation
- **WHEN** a post excerpt exceeds 2 lines
- **THEN** the excerpt SHALL be truncated with ellipsis (line-clamp-2)

#### Scenario: Tags limit
- **WHEN** a post has more than 3 tags
- **THEN** only the first 3 tags SHALL be displayed

---

### Requirement: PostCard Read More Indicator
The system SHALL provide visual feedback to indicate cards are clickable.

#### Scenario: Hover reveals read more
- **WHEN** a user hovers over a PostCard
- **THEN** a "繼續閱讀" label with arrow icon SHALL appear

#### Scenario: Card lift on hover
- **WHEN** a user hovers over a PostCard
- **THEN** the card SHALL lift slightly (translate-y) with enhanced shadow

---

### Requirement: Footer Social Links
The system SHALL display social media links in the footer when configured in site settings.

#### Scenario: Social links display
- **GIVEN** one or more social platforms are enabled in site settings (showFacebook, showInstagram, showThreads, showLine)
- **AND** the corresponding URL is provided
- **WHEN** the footer is rendered
- **THEN** the enabled social platform icons SHALL be displayed as clickable buttons

#### Scenario: No social links configured
- **GIVEN** no social platforms are enabled or no URLs are provided
- **WHEN** the footer is rendered
- **THEN** the social links section SHALL NOT be displayed

#### Scenario: Social link hover effect
- **WHEN** a user hovers over a social link button
- **THEN** the button SHALL transition to filled brand color with white icon

### Requirement: Public Page Incremental Static Regeneration

Public-facing content pages SHALL use Incremental Static Regeneration
(ISR) instead of fully dynamic rendering, so that repeat requests within
the revalidation window are served from cache instead of re-querying the
database on every request.

#### Scenario: Home, blog list, post detail, category and tag pages are cached
- **GIVEN** a visitor requests the home page, blog list, a post detail
  page, a category page, or a tag page
- **WHEN** the page has already been rendered within its revalidation
  window
- **THEN** the system SHALL serve the cached render instead of
  re-executing the page's data-fetching logic against the database

#### Scenario: Content becomes visible again after the revalidation window
- **GIVEN** a cached public page has passed its revalidation window
- **WHEN** a new request arrives
- **THEN** the system SHALL regenerate the page in the background (or on
  next request) and SHALL reflect content changes made since the last
  render within a bounded, documented time window

#### Scenario: Draft preview does not block caching of published content
- **GIVEN** the post detail page supports session-based draft preview
- **WHEN** a request does not carry an active draft-preview context (e.g.
  no draft mode / preview cookie)
- **THEN** the system SHALL NOT perform a session lookup that would force
  the page out of the cached/ISR rendering path
- **AND** a request that does carry an active draft-preview context SHALL
  still be able to view the current draft content

#### Scenario: Search remains fully dynamic
- **GIVEN** the search page renders results based on a query string
- **WHEN** a visitor performs a search
- **THEN** the system SHALL continue to render this page dynamically per
  request, as its output is inherently query-dependent and not
  cacheable via ISR

### Requirement: Bundle Optimization

The frontend application SHALL optimize bundle size through proper import patterns.

#### Scenario: Lucide React Icons Import Optimization
- **WHEN** components import icons from lucide-react
- **THEN** Next.js optimizePackageImports SHALL automatically transform barrel imports to direct imports
- **AND** development server boot time SHALL be reduced

#### Scenario: Third-Party Library Lazy Loading
- **WHEN** the application loads analytics providers (GA, GTM, Facebook Pixel)
- **THEN** these scripts SHALL be loaded after hydration using dynamic imports with `ssr: false`
- **AND** the initial bundle size SHALL not include these libraries

---

### Requirement: Request Deduplication

The application SHALL use React.cache() to deduplicate data fetching within a single request.

#### Scenario: Session Data Deduplication
- **WHEN** multiple components call getSession() within a single request
- **THEN** the session SHALL only be fetched once from the database
- **AND** subsequent calls SHALL return the cached result

#### Scenario: Site Settings Deduplication
- **WHEN** multiple components call siteSettingsUseCases.getDefault() within a single request
- **THEN** the settings SHALL only be queried once
- **AND** subsequent calls SHALL return the cached result

---

### Requirement: Streaming Rendering

The application SHALL use Suspense boundaries strategically to enable streaming rendering where appropriate.

#### Scenario: Page Layout with Data Loading
- **WHEN** a page has data-dependent sections
- **THEN** static layout elements SHALL render immediately
- **AND** data-dependent sections SHALL stream in with loading states

#### Scenario: Heavy Components Lazy Loading
- **WHEN** heavy components (e.g., TiptapEditor) are used in admin pages
- **THEN** these components SHALL be dynamically imported
- **AND** a loading skeleton SHALL be displayed during load

### Requirement: Site-Wide Styled Not-Found State
系統 SHALL 提供統一且符合站點視覺風格的找不到頁面（404），取代框架預設的無樣式畫面。前台動態路由（文章/分類/標籤）觸發的 `notFound()` SHALL 回傳 HTTP `404` 狀態碼，不得因套用會觸發串流（streaming）的 route-group／根層 `loading.tsx` 而使狀態碼降級為 `200`。

> 實作註記：Next.js 15 App Router 中，任一祖先層級的 `loading.tsx` 會為其下動態路由建立 Suspense streaming 邊界，於送出 loading shell 時即提交 HTTP `200`，使其後的 `notFound()` 無法再改寫狀態碼。因此前台不提供 route-group／根層載入骨架（前台頁面以 ISR 快取、載入骨架效益低），以維持草稿/不存在內容之 `404` 契約（見 `update-frontend-ui-cohesion`／`fix-perf-caching` 之草稿不外洩不變式）。載入骨架僅於後台提供（見 `admin-ux-rbac` 之 Admin Loading State）。

#### Scenario: Styled not-found page for missing content
- **WHEN** 使用者造訪不存在的文章、分類或標籤頁面（觸發 `notFound()`）
- **THEN** 系統顯示符合站點視覺風格的 404 頁面，而非框架預設的無樣式畫面

#### Scenario: notFound() on frontend dynamic routes preserves 404 status
- **WHEN** 匿名使用者直接請求不存在或未授權（草稿）的文章/分類/標籤路由，觸發 `notFound()`
- **THEN** HTTP 回應狀態碼為 `404`（而非因載入骨架串流而降級為 `200`），且已發布內容仍正常回傳 `200`

