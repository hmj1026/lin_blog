## ADDED Requirements

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
