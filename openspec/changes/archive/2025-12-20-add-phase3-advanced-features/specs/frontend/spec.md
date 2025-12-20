## ADDED Requirements

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
