## ADDED Requirements

### Requirement: Media Library List
The system SHALL provide a centralized view of all uploaded media.

#### Scenario: View all uploads
- **WHEN** an admin visits the media library
- **THEN** all uploaded files SHALL be displayed with thumbnails

#### Scenario: Filter by type
- **WHEN** an admin filters by file type
- **THEN** only matching files SHALL be displayed

#### Scenario: Search by name
- **WHEN** an admin searches by filename
- **THEN** matching files SHALL be displayed

---

### Requirement: Media Deletion
The system SHALL allow deleting uploaded files.

#### Scenario: Delete file
- **WHEN** an admin deletes a file
- **THEN** the file SHALL be removed from storage and database

#### Scenario: Confirm deletion
- **WHEN** an admin clicks delete
- **THEN** a confirmation dialog SHALL appear
