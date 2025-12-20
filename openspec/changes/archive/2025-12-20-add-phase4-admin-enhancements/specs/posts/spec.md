## ADDED Requirements

### Requirement: SEO Custom Fields
The system SHALL allow customizing SEO metadata for each post.

#### Scenario: Set custom meta title
- **WHEN** an admin sets a custom SEO title for a post
- **THEN** the page SHALL use the custom title in the HTML title tag

#### Scenario: Set custom meta description
- **WHEN** an admin sets a custom SEO description
- **THEN** the page SHALL use the custom description in the meta description tag

#### Scenario: Set custom OG image
- **WHEN** an admin sets a custom OG image
- **THEN** social share previews SHALL display the custom image

#### Scenario: Fallback to defaults
- **WHEN** SEO fields are not set
- **THEN** the system SHALL use the post title and excerpt as defaults

---

### Requirement: Batch Operations
The system SHALL support batch operations on posts.

#### Scenario: Select multiple posts
- **WHEN** an admin checks multiple posts in the list
- **THEN** batch action buttons SHALL become available

#### Scenario: Batch publish
- **WHEN** an admin selects posts and clicks "Publish"
- **THEN** all selected DRAFT posts SHALL change to PUBLISHED

#### Scenario: Batch delete
- **WHEN** an admin selects posts and clicks "Delete"
- **THEN** all selected posts SHALL be soft-deleted
