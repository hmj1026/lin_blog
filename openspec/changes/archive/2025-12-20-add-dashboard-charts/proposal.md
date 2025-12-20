## Why

Dashboard 圖表提供視覺化的數據洞察：
- 瀏覽趨勢線
- 熱門文章排名
- 來源/裝置分佈

## What Changes

### 後台功能
- **趨勢圖表**：過去 7/30 天瀏覽趨勢
- **熱門文章**：瀏覽量排名
- **來源分佈**：裝置類型餅圖

## Impact

- **Affected specs**: analytics
- **Affected code**:
  - `app/(admin)/admin/` - Dashboard 重構
  - `components/admin/charts/` - 圖表元件
