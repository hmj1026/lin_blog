## ADDED Requirements

### Requirement: Export Posts
The system SHALL allow exporting posts to portable formats.

#### Scenario: Export to JSON
- **WHEN** an admin selects export to JSON
- **THEN** selected posts SHALL be downloaded as a JSON file

#### Scenario: Export to Markdown
- **WHEN** an admin selects export to Markdown
- **THEN** selected posts SHALL be downloaded as a ZIP of Markdown files

#### Scenario: Export all
- **WHEN** an admin selects export all
- **THEN** all posts SHALL be included in the export

---

### Requirement: Import Posts
The system SHALL allow importing posts from files.

#### Scenario: Import from JSON
- **WHEN** an admin uploads a JSON file
- **THEN** posts SHALL be created from the file content

#### Scenario: Import from Markdown
- **WHEN** an admin uploads Markdown files
- **THEN** posts SHALL be created with title from frontmatter

#### Scenario: Import preview
- **WHEN** an admin uploads a file
- **THEN** a preview of posts to be imported SHALL be shown

#### Scenario: Duplicate handling
- **WHEN** a post with the same slug exists
- **THEN** the system SHALL offer skip/overwrite options
