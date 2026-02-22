# Story 1.2: 航線設定模組

Status: in-progress

## Story

As a 使用者（Bruce）,
I want 在 config.ts 中配置監控航線的所有設定,
So that 系統知道要掃描哪些航線、什麼價格觸發通知、什麼時間範圍可接受。

## Acceptance Criteria

**Given** config.ts 已建立
**When** 匯入 AppConfig
**Then** 包含 passengers 設定（adults: 2, children: 1）
**And** 包含 5 條預設航線（TPE → NRT/KIX/FUK/OKA/CTS），每條有獨立 priceThreshold（TWD）
**And** 每條航線包含 dateRange（start/end ISO date string）
**And** 每條航線可選配 departureTimeRange 和 arrivalTimeRange（earliest/latest HH:mm）
**And** 每條航線包含 enabled 布林值控制啟停
**And** RouteConfig、AppConfig interface 定義在 config.ts 中並匯出
**And** 新增航線只需在 routes 陣列新增一筆 RouteConfig
**And** 移除航線只需刪除或設定 enabled: false
**And** 所有密鑰（API key、LINE token）不出現在 config.ts，透過環境變數讀取

## Tasks / Subtasks

- [x] Task 1: 定義 RouteConfig 和 AppConfig TypeScript interface (AC: interface 匯出)
  - [x] 1.1 定義 RouteConfig interface（含所有必要欄位）
  - [x] 1.2 定義 AppConfig interface
- [x] Task 2: 實作 config 資料並匯出 (AC: 5 條航線, passengers, 各欄位)
  - [x] 2.1 設定 passengers（adults: 2, children: 1）
  - [x] 2.2 建立 5 條預設航線（TPE→NRT/KIX/FUK/OKA/CTS）含獨立 priceThreshold
  - [x] 2.3 設定各航線 dateRange（start/end）
  - [x] 2.4 設定各航線選配的 departureTimeRange 和 arrivalTimeRange
  - [x] 2.5 設定各航線 enabled 布林值
- [x] Task 3: 加入本地開發 dotenv 支援 (AC: 密鑰不入碼)
  - [x] 3.1 在 src/index.ts 和 src/morning-report.ts 頂端加入 dotenv/config 匯入

## Dev Notes

### 設定說明
- `config.ts` 負責靜態航線設定，不讀取任何 secrets
- Secrets（AMADEUS_CLIENT_ID 等）由各模組直接讀取 `process.env.*`
- `dotenv` 在 entry points 最頂端 import，確保 process.env 在所有模組載入前已填充
- 本地開發需建立 `.env` 並填入實際 credentials

### 精確的 config.ts 規格（來自 architecture.md）

```typescript
interface RouteConfig {
  origin: string;
  destination: string;
  enabled: boolean;
  priceThreshold: number;        // TWD，家庭總價（2大1小）
  dateRange: { start: string; end: string };
  departureTimeRange?: { earliest: string; latest: string };
  arrivalTimeRange?: { earliest: string; latest: string };
}

interface AppConfig {
  passengers: { adults: number; children: number };
  routes: RouteConfig[];
}
```

### 航線閾值參考（TWD，2大1小含稅總價）
- TPE→NRT: 25000（東京，熱門，門檻較高）
- TPE→KIX: 22000（大阪，次熱門）
- TPE→FUK: 18000（福岡，近距離）
- TPE→OKA: 16000（沖繩，最近）
- TPE→CTS: 24000（札幌，北海道，門檻較高）

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Completion Notes List
- ✅ Task 1: RouteConfig + AppConfig interface 定義並匯出
- ✅ Task 2: 5 條航線完整設定，獨立 priceThreshold，dateRange 2026-04~06
- ✅ Task 3: dotenv/config 加入 index.ts 和 morning-report.ts 頂端

### File List
- `src/config.ts` (新建)
- `src/index.ts` (修改，加入 dotenv/config)
- `src/morning-report.ts` (修改，加入 dotenv/config)
- `tests/config.test.ts` (新建)

### Change Log
- 2026-02-20: 建立 config.ts（RouteConfig + AppConfig + 5 條航線設定）；加入 dotenv 本地開發支援
