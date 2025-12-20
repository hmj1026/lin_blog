# posts Specification (Delta)

## ADDED Requirements
### Requirement: Post List Loads Summary Only
The system SHALL load summary fields for post lists and SHALL NOT fetch full `Post.content` for list views.

#### Scenario: List views do not load full content
- **GIVEN** an admin or visitor views a post list (e.g. blog list, admin list, related posts)
- **WHEN** the system queries posts for the list
- **THEN** it SHALL fetch only summary fields (title, excerpt, metadata, relations as needed)
- **AND** it SHALL NOT fetch `Post.content`

#### Scenario: Post detail loads full content
- **GIVEN** a visitor opens a post detail page
- **WHEN** the system queries the post by slug/id
- **THEN** it SHALL include `Post.content` for rendering

