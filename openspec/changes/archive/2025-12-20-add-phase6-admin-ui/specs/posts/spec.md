## ADDED Requirements

### Requirement: Post List Multi-select
The system SHALL support selecting multiple posts in the admin post list.

#### Scenario: Select individual post
- **WHEN** an admin clicks a post checkbox
- **THEN** the post SHALL be selected/deselected

#### Scenario: Select all posts
- **WHEN** an admin clicks the header checkbox
- **THEN** all posts on the current page SHALL be selected/deselected

#### Scenario: Show batch toolbar
- **WHEN** at least one post is selected
- **THEN** a batch action toolbar SHALL appear

---

### Requirement: Batch Action Toolbar
The system SHALL display a toolbar when posts are selected.

#### Scenario: Show selected count
- **WHEN** posts are selected
- **THEN** the toolbar SHALL show how many posts are selected

#### Scenario: Batch publish action
- **WHEN** an admin clicks publish in the toolbar
- **THEN** selected draft posts SHALL be published

#### Scenario: Batch delete action
- **WHEN** an admin clicks delete and confirms
- **THEN** selected posts SHALL be soft-deleted

---

### Requirement: Admin Post Search
The system SHALL provide search in the admin post list.

#### Scenario: Search by title
- **WHEN** an admin types in the search box
- **THEN** the list SHALL filter posts by title

#### Scenario: Clear search
- **WHEN** an admin clears the search box
- **THEN** all posts SHALL be displayed
