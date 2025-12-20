## ADDED Requirements

### Requirement: Batch Post Operations
The system SHALL support batch operations on multiple posts.

#### Scenario: Select multiple posts
- **WHEN** an admin checks multiple posts in the list
- **THEN** a batch action toolbar SHALL appear

#### Scenario: Batch publish
- **WHEN** an admin selects posts and clicks batch publish
- **THEN** all selected DRAFT posts SHALL change to PUBLISHED

#### Scenario: Batch set to draft
- **WHEN** an admin selects posts and clicks batch set to draft
- **THEN** all selected PUBLISHED posts SHALL change to DRAFT

#### Scenario: Batch delete
- **WHEN** an admin selects posts and confirms deletion
- **THEN** all selected posts SHALL be soft-deleted


