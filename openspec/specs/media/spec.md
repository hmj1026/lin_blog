# media Specification

## Purpose
定義媒體庫功能的需求，包括媒體檔案列表瀏覽、刪除，以及可設定的上傳儲存後端（storage backend）。
## Requirements
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

### Requirement: Configurable Upload Storage Backend
The system SHALL support switching the upload storage backend via environment configuration, without changing the upload/read API contracts.

#### Scenario: Use local storage in development
- **GIVEN** `STORAGE_PROVIDER=local`
- **WHEN** an admin uploads an image
- **THEN** the file SHALL be persisted to local disk storage
- **AND** the image SHALL be readable via `/api/files/<id>`

#### Scenario: Use S3-compatible storage in production
- **GIVEN** `STORAGE_PROVIDER` is `s3` or `r2`
- **WHEN** an admin uploads an image
- **THEN** the file SHALL be persisted to the configured bucket
- **AND** the image SHALL be readable via `/api/files/<id>`

#### Scenario: Use Google Cloud Storage in production
- **GIVEN** `STORAGE_PROVIDER=gcs`
- **WHEN** an admin uploads an image
- **THEN** the file SHALL be persisted to the configured GCS bucket
- **AND** the image SHALL be readable via `/api/files/<id>`

