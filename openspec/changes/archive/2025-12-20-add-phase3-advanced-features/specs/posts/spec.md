## ADDED Requirements

### Requirement: Scheduled Post Publishing
The system SHALL support scheduling posts for future publication.

#### Scenario: Schedule a post for future
- **WHEN** an admin sets publishedAt to a future date and status to SCHEDULED
- **THEN** the post SHALL remain unpublished until the scheduled time

#### Scenario: Auto-publish scheduled posts
- **WHEN** the current time reaches or exceeds a scheduled post's publishedAt
- **THEN** the system SHALL automatically change the status to PUBLISHED

#### Scenario: View scheduled posts in admin
- **WHEN** an admin views the post list
- **THEN** scheduled posts SHALL be displayed with a visual indicator

### Requirement: Post Status
The PostStatus enum SHALL include the following values:
- DRAFT - Work in progress, not visible to public
- PUBLISHED - Live and visible to public
- SCHEDULED - Pending automatic publication at publishedAt time

#### Scenario: Status transitions
- **WHEN** a post status changes from DRAFT to SCHEDULED
- **THEN** the system SHALL validate that publishedAt is a future date

#### Scenario: Cancel scheduled publication
- **WHEN** an admin changes status from SCHEDULED to DRAFT
- **THEN** the post SHALL no longer be auto-published
