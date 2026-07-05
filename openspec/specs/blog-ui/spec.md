# blog-ui Specification

## Purpose
定義部落格前台網站以 Next.js 建置的基礎需求，包括頁面骨架與設計還原度、導覽與頁首、首頁內容、文章列表與詳情頁體驗，以及表單互動、響應式與無障礙支援。
## Requirements
### Requirement: Next.js App Scaffold
The blog frontend SHALL use the latest LTS version of Next.js with the App Router and TypeScript, include a shared layout, and configure global styles and fonts that match the Figma design tokens.

#### Scenario: App Router and shared layout are present
- **WHEN** the project is generated,
- **THEN** it uses Next.js LTS with the App Router, a root layout, global styles, and configured web fonts aligned to the Figma file.

#### Scenario: Page routes reflect Figma screens
- **WHEN** navigating the site,
- **THEN** routes exist for every screen in the Figma file (landing/home, blog listing, blog post detail, category/tag filtered views, and any community/contact/newsletter screens).

### Requirement: Design Fidelity
The UI SHALL visually match the provided Figma design (Client-First Template 12 - Blog & Community) including typography, color palette, spacing, imagery, and component shapes.

#### Scenario: Desktop layout matches Figma
- **WHEN** viewing on desktop widths,
- **THEN** typography, spacing, imagery, and component arrangements match the Figma frames for desktop.

#### Scenario: Mobile layout matches Figma
- **WHEN** viewing on tablet and mobile widths,
- **THEN** the layout, typography scales, and stacking order match the Figma frames for smaller breakpoints.

### Requirement: Navigation and Header
The site SHALL provide a global navigation bar with logo/branding, primary links, call-to-action elements, and an optional signed-in account control, styled per design tokens with responsive behavior that avoids crowding.

#### Scenario: Desktop navigation mirrors Figma
- **WHEN** viewing on desktop,
- **THEN** the navbar shows logo, nav links, and CTA(s) in the order and styling from the design system with hover/focus states.

#### Scenario: Mobile navigation collapses
- **WHEN** viewing on mobile,
- **THEN** the navigation collapses into the mobile pattern shown in the design system (e.g., menu toggle/drawer) while preserving links and CTA access.

#### Scenario: Signed-in admin state stays cohesive
- **WHEN** an admin user is signed in on desktop,
- **THEN** the navbar SHALL present account information and actions as a compact control that preserves readable spacing for links and CTA buttons.

### Requirement: Landing Page Content
The landing/home page SHALL render all hero, featured content, category highlights, and community/CTA sections depicted in the Figma file with correct copy structure and imagery placement.

#### Scenario: Hero and featured sections render
- **WHEN** loading the landing page,
- **THEN** the hero, featured posts, category highlights, and CTA/community blocks render in the sequence and layout shown in Figma.

### Requirement: Blog Listing Experience
The blog listing SHALL display posts in the card/list style from Figma, including cover imagery, titles, excerpts, authors, dates, categories/tags, and pagination or load-more controls as designed.

#### Scenario: Posts render with metadata
- **WHEN** visiting the blog listing,
- **THEN** each post shows its image, title, excerpt, author, date, and category/tag chips using the Figma card styling.

#### Scenario: Pagination or continuation matches design
- **WHEN** posts span multiple pages,
- **THEN** navigation (pagination or load more) follows the Figma style and allows moving between sets.

### Requirement: Post Detail Experience
The blog detail page SHALL render the hero/media, title, author/date metadata, rich content body,
inline media, and related/next-read sections consistent with Figma. When the post has
`allowRawHtml = true`, the content body SHALL instead render inside an isolated `<iframe
sandbox="allow-scripts" srcDoc>` that preserves the post's own embedded CSS, unaffected by and not
leaking into the site's global styles; all other page sections (hero, metadata, related posts)
render unchanged.

#### Scenario: Post body displays rich content
- **WHEN** opening a post detail,
- **THEN** the hero/media, metadata, headings, paragraphs, lists, quotes, images, and CTA/sidebar
  elements render per the Figma layout.

#### Scenario: Related content surfaces
- **WHEN** reaching the end of a post,
- **THEN** related or recommended posts appear as designed in the Figma detail page.

#### Scenario: Raw HTML post renders in an isolated iframe
- **GIVEN** a post with `allowRawHtml = true` containing custom `<style>` rules
- **WHEN** opening that post's detail page
- **THEN** the content body renders inside an isolated iframe showing the post's own styling,
  unaffected by the site's global `.wysiwyg` styles, while hero/metadata/related sections render
  as normal

### Requirement: Forms and Engagement
The site SHALL include newsletter subscription and contact/community forms as shown in Figma with validation states and confirmation UI.

#### Scenario: Newsletter form works
- **WHEN** entering a valid email in the newsletter form,
- **THEN** the submission control and success/error states match the Figma styling.

#### Scenario: Contact/community form behaves
- **WHEN** submitting the contact/community form,
- **THEN** fields, validation, and feedback follow the Figma interaction patterns.

### Requirement: Responsiveness and Accessibility
The UI SHALL be responsive across common breakpoints and include accessible semantics, focus states, and keyboard navigation aligned with the Figma states.

#### Scenario: Responsive breakpoints hold fidelity
- **WHEN** resizing between desktop, tablet, and mobile widths,
- **THEN** content reflows without overlap and matches the Figma layouts for each breakpoint.

#### Scenario: Interactive elements are accessible
- **WHEN** using keyboard navigation or screen readers,
- **THEN** interactive elements (links, buttons, form controls) expose accessible labels and focus outlines consistent with design.

