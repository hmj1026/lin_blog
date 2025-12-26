# 專案架構文件

本文件說明 Lin Blog 專案的整體架構設計。

## 技術棧

| 類別 | 技術 |
|------|------|
| **框架** | Next.js 15 (App Router) |
| **語言** | TypeScript |
| **資料庫** | PostgreSQL + Prisma ORM |
| **認證** | NextAuth.js v4 |
| **編輯器** | TipTap (WYSIWYG) |
| **樣式** | Tailwind CSS |
| **測試** | Vitest + Playwright |

---

## C4 Context Diagram

系統與外部使用者/系統的互動關係：

```mermaid
C4Context
    title Lin Blog 系統上下文圖

    Person(visitor, "訪客", "瀏覽部落格文章")
    Person(admin, "管理員", "管理文章、媒體、使用者")
    
    System(linblog, "Lin Blog", "現代化部落格系統")
    
    System_Ext(postgres, "PostgreSQL", "資料儲存")
    System_Ext(storage, "Storage", "Local/S3/R2/GCS")
    
    Rel(visitor, linblog, "瀏覽文章", "HTTPS")
    Rel(admin, linblog, "管理內容", "HTTPS")
    Rel(linblog, postgres, "讀寫資料", "TCP")
    Rel(linblog, storage, "上傳/讀取媒體", "HTTPS")
```

---

## C4 Container Diagram

系統內部的主要容器：

```mermaid
C4Container
    title Lin Blog 容器圖

    Person(user, "使用者")
    
    Container_Boundary(web, "Next.js Application") {
        Container(frontend, "Frontend", "React/Next.js", "前台頁面渲染")
        Container(admin, "Admin Panel", "React/Next.js", "後台管理介面")
        Container(api, "API Routes", "Next.js API", "RESTful API 端點")
        Container(modules, "DDD Modules", "TypeScript", "業務邏輯層")
    }
    
    ContainerDb(db, "PostgreSQL", "Database", "資料持久層")
    Container_Ext(storage, "Storage", "File Storage", "媒體檔案儲存")
    
    Rel(user, frontend, "瀏覽", "HTTPS")
    Rel(user, admin, "管理", "HTTPS")
    Rel(frontend, api, "呼叫", "Internal")
    Rel(admin, api, "呼叫", "Internal")
    Rel(api, modules, "使用", "Function Call")
    Rel(modules, db, "查詢", "Prisma")
    Rel(modules, storage, "上傳", "Storage API")
```

---

## DDD 模組依賴圖

```mermaid
graph TB
    subgraph "Presentation Layer"
        A[App Router - Pages]
        B[API Routes]
    end
    
    subgraph "Application Layer"
        C[posts/use-cases]
        D[media/use-cases]
        E[analytics/use-cases]
        F[security-admin/use-cases]
        G[site-settings/use-cases]
    end
    
    subgraph "Domain Layer"
        H[posts/domain]
        I[media/domain]
        J[analytics/domain]
        K[shared/result]
    end
    
    subgraph "Infrastructure Layer"
        L[posts/infrastructure/prisma]
        M[media/infrastructure/prisma]
        N[media/infrastructure/storage]
        O[analytics/infrastructure/prisma]
    end
    
    A --> C
    A --> D
    B --> C
    B --> D
    B --> E
    B --> F
    B --> G
    
    C --> H
    C --> L
    D --> I
    D --> M
    D --> N
    E --> J
    E --> O
    
    C --> K
    D --> K
    
    L --> H
    M --> I
```

---

## 分層架構

專案採用 **Clean Architecture** 四層分層：

### 1. Domain Layer（領域層）
- 位置：`src/modules/*/domain/`
- 職責：核心業務邏輯、領域模型、業務規則
- 限制：**不得依賴任何外部框架**

### 2. Application Layer（應用層）
- 位置：`src/modules/*/application/`
- 職責：Use Cases、業務流程編排
- 依賴：Domain Layer

### 3. Infrastructure Layer（基礎設施層）
- 位置：`src/modules/*/infrastructure/`
- 職責：資料庫存取、外部服務整合
- 依賴：Application Layer（實作 Ports）

### 4. Presentation Layer（展現層）
- 位置：`src/app/`、`src/components/`
- 職責：UI 渲染、API 路由
- 限制：**不得直接存取資料庫**

---

## 架構規則強制執行

透過 ESLint 強制執行分層規則：

```
UI 元件 ───X──→ Prisma/DB    (禁止)
App Router ───X──→ Prisma/DB  (禁止)
Domain ───X──→ Next.js        (禁止)
```

詳見 [.eslintrc.json](file:///e:/projects/lin_blog/web/.eslintrc.json)
