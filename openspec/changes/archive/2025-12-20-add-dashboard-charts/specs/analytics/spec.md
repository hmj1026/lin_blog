## ADDED Requirements

### Requirement: View Trend Chart
The system SHALL display a line chart of page views over time.

#### Scenario: 7-day trend
- **WHEN** an admin views the dashboard
- **THEN** a 7-day view trend line chart SHALL be displayed

#### Scenario: 30-day trend
- **WHEN** an admin selects 30-day range
- **THEN** the chart SHALL update to show 30-day data

---

### Requirement: Top Posts Ranking
The system SHALL display a ranked list of popular posts.

#### Scenario: View top posts
- **WHEN** an admin views the dashboard
- **THEN** top 10 posts by view count SHALL be displayed

---

### Requirement: Device Distribution
The system SHALL display device type distribution.

#### Scenario: View device stats
- **WHEN** an admin views the dashboard
- **THEN** a pie chart of device types SHALL be displayed
