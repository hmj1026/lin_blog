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
The system SHALL support dark mode for the frontend.

#### Scenario: System preference detection
- **WHEN** a user visits with system dark mode enabled
- **THEN** the site SHALL automatically use dark theme

#### Scenario: Manual toggle
- **WHEN** a user clicks the theme toggle
- **THEN** the site SHALL switch between light and dark themes

#### Scenario: Preference persistence
- **WHEN** a user selects a theme preference
- **THEN** the preference SHALL be saved for future visits

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

