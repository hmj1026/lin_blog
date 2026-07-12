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
The blog detail page SHALL render the hero/media, title, author/date metadata, rich content body, inline media, and related/next-read sections consistent with the site design. When the post has `allowRawHtml = true`, the content body SHALL instead render inside an isolated `<iframe sandbox="allow-scripts" srcDoc>` that preserves the post's own embedded CSS, unaffected by and not leaking into the site's global styles. The raw HTML content stage SHALL use a near-viewport-width layout with a 16px maximum gutter on each side and no fixed 280px article sidebar; hero, metadata, sharing, tags, and related content SHALL retain the standard `section-shell` layout before or after the raw content.

#### Scenario: Post body displays rich content
- **WHEN** opening a normal post detail
- **THEN** the hero/media, metadata, headings, paragraphs, lists, quotes, images, and CTA/sidebar elements render per the existing site layout

#### Scenario: Related content surfaces
- **WHEN** reaching the end of a post
- **THEN** related or recommended posts appear as designed

#### Scenario: Raw HTML post renders in an isolated iframe
- **GIVEN** a post with `allowRawHtml = true` containing custom `<style>` rules
- **WHEN** opening that post's detail page
- **THEN** the content body renders inside an isolated iframe showing the post's own styling
- **AND** it is unaffected by the site's global `.wysiwyg` styles
- **AND** hero, metadata, sharing, tags, and related sections render outside the iframe

#### Scenario: Raw HTML desktop content uses near-viewport width
- **GIVEN** the layout viewport is 1903px wide and the post has `allowRawHtml = true`
- **WHEN** the raw content stage is rendered
- **THEN** its parent content frame SHALL have a computed width of at least 1871px
- **AND** each outer gutter SHALL be no greater than 16px
- **AND** no fixed article sidebar SHALL reduce the iframe width

#### Scenario: Author HTML controls the inner canvas
- **GIVEN** a raw post contains responsive `auto-fit/minmax()` grids and its own inline spacing
- **WHEN** the iframe srcdoc renders
- **THEN** the system SHALL NOT add an inner content max-width or horizontal body padding
- **AND** the author grid SHALL calculate against the iframe's full available width

#### Scenario: Site utilities follow wide raw content
- **GIVEN** a raw HTML post also has sharing controls, tags, or follow-up discovery modules
- **WHEN** the post detail is rendered
- **THEN** those modules SHALL appear after the wide iframe content rather than reserving a fixed column beside it

### Requirement: Forms and Engagement
The site SHALL include newsletter subscription and contact/community forms as shown in Figma with
accessible validation, submitting, confirmation, and recoverable error states. The newsletter form
SHALL require name, valid email, and a completed Google reCAPTCHA v2 checkbox; it SHALL submit to a
server-verified, rate-limited API and only report success after the server returns the generic
persisted-or-already-subscribed result. The interface SHALL NOT reveal whether an email was already
subscribed. Every input SHALL have a visible, programmatically associated label; focus SHALL move to
the first invalid field or error summary after failure, and submitting/success/error/rate-limit
states SHALL be announced through `aria-live`. Contact/community form behavior remains unchanged.

#### Scenario: Newsletter subscription succeeds
- **GIVEN** a visitor enters a valid name and email and completes the reCAPTCHA v2 checkbox
- **WHEN** the server accepts the subscription or the normalized email was already subscribed
- **THEN** the form displays the same accessible generic success confirmation and prevents an
  accidental duplicate submission while the request is pending

#### Scenario: Newsletter fields and CAPTCHA are validated
- **GIVEN** the name or email is invalid, or the reCAPTCHA checkbox is incomplete
- **WHEN** the visitor attempts to submit the newsletter form
- **THEN** the form displays field-level or CAPTCHA guidance, moves focus appropriately, and does
  not display a false success state

#### Scenario: Newsletter service failure is recoverable
- **GIVEN** CAPTCHA configuration is missing, verification is unavailable, the request is rate
  limited, or the server rejects the request
- **WHEN** the newsletter submission completes
- **THEN** the form displays an accessible, non-sensitive retry or wait message and preserves the
  user's non-secret input where safe, resets an expired or failed CAPTCHA token, and provides a
  keyboard-accessible way to load or complete the checkbox again

#### Scenario: Newsletter status is announced without replacing labels
- **WHEN** the newsletter request enters submitting, success, validation-error, provider-error, or
  rate-limited state
- **THEN** visible labels remain associated with their inputs, the status is announced via
  `aria-live`, and keyboard focus moves only when needed to recover from an error

#### Scenario: Contact/community form behaves
- **WHEN** submitting the contact/community form,
- **THEN** fields, validation, and feedback follow the Figma interaction patterns.

### Requirement: Responsiveness and Accessibility
The UI SHALL be responsive across common breakpoints and include accessible semantics, focus states, and keyboard navigation aligned with the design. Raw HTML content SHALL keep its outer iframe within the layout viewport at tablet and mobile widths even when author HTML has intrinsic fixed-width content.

#### Scenario: Responsive breakpoints hold fidelity
- **WHEN** resizing between desktop, tablet, and mobile widths
- **THEN** content reflows without overlap and matches the intended layout for each breakpoint

#### Scenario: Raw HTML frame does not overflow the outer page on mobile
- **GIVEN** a raw HTML article contains a wide image, grid, or fixed-width element
- **WHEN** viewing the article at mobile width
- **THEN** the iframe outer frame SHALL remain within the layout viewport
- **AND** the outer page SHALL NOT gain a horizontal scrollbar

#### Scenario: Interactive elements are accessible
- **WHEN** using keyboard navigation or screen readers
- **THEN** interactive elements including links, buttons, form controls, mode selectors, media controls, and optional TOC controls SHALL expose accessible labels and focus outlines consistent with the design

