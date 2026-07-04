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
The system SHALL support dark mode for the frontend with proper contrast for all UI elements.

#### Scenario: System preference detection
- **WHEN** a user visits with system dark mode enabled
- **THEN** the site SHALL automatically use dark theme

#### Scenario: Manual toggle
- **WHEN** a user clicks the theme toggle
- **THEN** the site SHALL switch between light and dark themes

#### Scenario: Preference persistence
- **WHEN** a user selects a theme preference
- **THEN** the preference SHALL be saved for future visits

#### Scenario: Navbar link contrast in dark mode
- **WHEN** the site is in dark mode
- **THEN** inactive navbar links SHALL have sufficient contrast (text-base-400) and hover to white

#### Scenario: Card shadow in dark mode
- **WHEN** the site is in dark mode
- **THEN** PostCard components SHALL have visible shadows (shadow-lg shadow-black/10)

---

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

