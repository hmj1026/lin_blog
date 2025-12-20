## ADDED Requirements

### Requirement: Post Version Storage
The system SHALL automatically save a version when a post is updated.

#### Scenario: Auto-save version on update
- **WHEN** a post content or title is updated
- **THEN** the previous version SHALL be saved to PostVersion table

#### Scenario: Version metadata
- **WHEN** a version is saved
- **THEN** it SHALL include title, content, excerpt, createdAt, and editor info

---

### Requirement: Version History List
The system SHALL display a list of versions for each post.

#### Scenario: View version history
- **WHEN** an admin views a post's version history
- **THEN** the system SHALL display all saved versions sorted by date

#### Scenario: Version preview
- **WHEN** an admin clicks on a version
- **THEN** the system SHALL display the version content

---

### Requirement: Version Restore
The system SHALL allow restoring a post to a previous version.

#### Scenario: Restore to version
- **WHEN** an admin selects restore on a version
- **THEN** the post content SHALL be replaced with the version content

#### Scenario: Restore creates new version
- **WHEN** a post is restored
- **THEN** the current content SHALL be saved as a new version before restore
