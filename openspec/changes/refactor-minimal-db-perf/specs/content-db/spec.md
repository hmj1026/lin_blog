# content-db Specification (Delta)

## ADDED Requirements
### Requirement: Indexes for Common Time-Range Queries
The system SHALL provide database indexes for common time-range queries on event tables.

#### Scenario: View events query by time range
- **GIVEN** view events are stored in the database
- **WHEN** the system queries events filtered by time range (e.g. last 7/30/365 days)
- **THEN** an index optimized for the time filter SHALL exist

