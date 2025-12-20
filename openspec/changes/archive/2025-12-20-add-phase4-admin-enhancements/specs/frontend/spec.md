## ADDED Requirements

### Requirement: Code Syntax Highlighting
The system SHALL provide syntax highlighting for code blocks in blog posts.

#### Scenario: Display highlighted code
- **WHEN** a blog post contains a fenced code block with a language identifier
- **THEN** the code SHALL be rendered with syntax highlighting

#### Scenario: Copy code button
- **WHEN** a user hovers over a code block
- **THEN** a copy button SHALL appear

#### Scenario: Copy code
- **WHEN** a user clicks the copy button
- **THEN** the code content SHALL be copied to clipboard with feedback

---

### Requirement: Dark Mode
The system SHALL support dark mode for the frontend.

#### Scenario: System preference detection
- **WHEN** a user visits with system dark mode enabled
- **THEN** the site SHALL automatically use dark theme

#### Scenario: Manual toggle
- **WHEN** a user clicks the theme toggle
- **THEN** the site SHALL switch between light and dark themes

#### Scenario: Preference persistence
- **WHEN** a user selects a theme preference
- **THEN** the preference SHALL be saved for future visits
