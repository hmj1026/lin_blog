# posts Specification

## Purpose
TBD - created by archiving change add-post-version-history. Update Purpose after archive.
## Requirements
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

### Requirement: Scheduled Post Publishing
The system SHALL support scheduling posts for future publication.

#### Scenario: Schedule a post for future
- **WHEN** an admin sets publishedAt to a future date and status to SCHEDULED
- **THEN** the post SHALL remain unpublished until the scheduled time

#### Scenario: Auto-publish scheduled posts
- **WHEN** the current time reaches or exceeds a scheduled post's publishedAt
- **THEN** the system SHALL automatically change the status to PUBLISHED

#### Scenario: View scheduled posts in admin
- **WHEN** an admin views the post list
- **THEN** scheduled posts SHALL be displayed with a visual indicator

### Requirement: Post Status
The PostStatus enum SHALL include the following values:
- DRAFT - Work in progress, not visible to public
- PUBLISHED - Live and visible to public
- SCHEDULED - Pending automatic publication at publishedAt time

#### Scenario: Status transitions
- **WHEN** a post status changes from DRAFT to SCHEDULED
- **THEN** the system SHALL validate that publishedAt is a future date

#### Scenario: Cancel scheduled publication
- **WHEN** an admin changes status from SCHEDULED to DRAFT
- **THEN** the post SHALL no longer be auto-published

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

### Requirement: SEO Custom Fields
The system SHALL allow customizing SEO metadata for each post.

#### Scenario: Set custom meta title
- **WHEN** an admin sets a custom SEO title for a post
- **THEN** the page SHALL use the custom title in the HTML title tag

#### Scenario: Set custom meta description
- **WHEN** an admin sets a custom SEO description
- **THEN** the page SHALL use the custom description in the meta description tag

#### Scenario: Set custom OG image
- **WHEN** an admin sets a custom OG image
- **THEN** social share previews SHALL display the custom image

#### Scenario: Fallback to defaults
- **WHEN** SEO fields are not set
- **THEN** the system SHALL use the post title and excerpt as defaults

---

### Requirement: Batch Operations
The system SHALL support batch operations on posts.

#### Scenario: Select multiple posts
- **WHEN** an admin checks multiple posts in the list
- **THEN** batch action buttons SHALL become available

#### Scenario: Batch publish
- **WHEN** an admin selects posts and clicks "Publish"
- **THEN** all selected DRAFT posts SHALL change to PUBLISHED

#### Scenario: Batch delete
- **WHEN** an admin selects posts and clicks "Delete"
- **THEN** all selected posts SHALL be soft-deleted

### Requirement: Batch Post Operations
The system SHALL support batch operations on multiple posts.

#### Scenario: Select multiple posts
- **WHEN** an admin checks multiple posts in the list
- **THEN** a batch action toolbar SHALL appear

#### Scenario: Batch publish
- **WHEN** an admin selects posts and clicks batch publish
- **THEN** all selected DRAFT posts SHALL change to PUBLISHED

#### Scenario: Batch set to draft
- **WHEN** an admin selects posts and clicks batch set to draft
- **THEN** all selected PUBLISHED posts SHALL change to DRAFT

#### Scenario: Batch delete
- **WHEN** an admin selects posts and confirms deletion
- **THEN** all selected posts SHALL be soft-deleted

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

### Requirement: Post By-ID Read Authorization
系統 SHALL 對 `GET /api/posts/[id]` 依文章狀態進行授權檢查：僅 `status = PUBLISHED` 的文章可被任何呼叫者讀取；`DRAFT` 或 `SCHEDULED` 狀態的文章僅允許具備 `posts:read`（或等同後台讀取）權限的已登入使用者讀取，其餘一律視為不存在。

#### Scenario: Anonymous user cannot read a draft post by ID
- **GIVEN** 一篇文章狀態為 `DRAFT`
- **WHEN** 未登入的使用者以該文章 ID 呼叫 `GET /api/posts/[id]`
- **THEN** 系統回傳 404，且不揭露該文章存在

#### Scenario: Anonymous user cannot read a scheduled post by ID
- **GIVEN** 一篇文章狀態為 `SCHEDULED`
- **WHEN** 未登入的使用者以該文章 ID 呼叫 `GET /api/posts/[id]`
- **THEN** 系統回傳 404，且不揭露該文章存在

#### Scenario: Authenticated user without posts:read permission cannot read a draft post
- **GIVEN** 使用者已登入但不具備 `posts:read` 權限
- **WHEN** 該使用者以某 `DRAFT` 文章 ID 呼叫 `GET /api/posts/[id]`
- **THEN** 系統回傳 404

#### Scenario: Authenticated user with posts:read permission can read a draft post
- **GIVEN** 使用者已登入且具備 `posts:read` 權限
- **WHEN** 該使用者以某 `DRAFT` 文章 ID 呼叫 `GET /api/posts/[id]`
- **THEN** 系統回傳該文章內容

#### Scenario: Anyone can read a published post by ID
- **GIVEN** 一篇文章狀態為 `PUBLISHED`
- **WHEN** 任何呼叫者（含未登入）以該文章 ID 呼叫 `GET /api/posts/[id]`
- **THEN** 系統回傳該文章內容

### Requirement: Post By-ID Response Excludes Author Credentials
系統 SHALL 確保 `GET /api/posts/[id]` 的成功回應資料經過白名單映射，不得包含作者的憑證或機敏個資欄位（包含但不限於 `password`、密碼雜湊）。

#### Scenario: Response omits author password hash
- **WHEN** 任何呼叫者成功取得 `GET /api/posts/[id]` 的回應
- **THEN** 回應內容中不存在 `author.password` 或任何形式的密碼雜湊欄位

#### Scenario: Response does not leak raw domain object
- **WHEN** `GET /api/posts/[id]` 回傳成功回應
- **THEN** 回應資料 SHALL 為經過白名單 DTO 映射後的結果，而非未過濾的 domain/Prisma 物件序列化

### Requirement: Bounded Post List Queries

Post list queries (admin listing and public listing) SHALL enforce an
upper bound on the number of records fetched per query, and SHALL NOT
perform unbounded full-table reads.

#### Scenario: Admin post list is bounded
- **GIVEN** an admin requests the post list (`listForAdmin`)
- **WHEN** the system queries the database
- **THEN** it SHALL apply a maximum page size (`take`) to the query
- **AND** it SHALL NOT fetch the entire `Post` table in a single query

#### Scenario: Public post list is bounded
- **GIVEN** a visitor or the frontend requests published posts
  (`listPublished`)
- **WHEN** the system queries the database
- **THEN** it SHALL apply a maximum page size (`take`) to the query
- **AND** it SHALL NOT fetch the entire published `Post` set in a single
  query

