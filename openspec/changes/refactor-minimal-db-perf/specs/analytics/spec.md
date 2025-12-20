# analytics Specification (Delta)

## ADDED Requirements
### Requirement: One-year Analytics Range Remains Queryable
The system SHALL support querying view events over up to one year without requiring pre-aggregated tables.

#### Scenario: 1-year range queries use indexed time filters
- **GIVEN** an admin selects a range up to one year
- **WHEN** the system counts or groups view events since a start date
- **THEN** the underlying storage SHALL provide an index supporting `deletedAt` + `viewedAt` filtering

