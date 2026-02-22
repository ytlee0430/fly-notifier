> ⚠️ **[已棄用]** 此檔案為專案初始草稿規格，已由 BMAD 規劃產出物取代。
> 請參閱 `_bmad-output/planning-artifacts/` 下的 PRD 和 Architecture 文件。
> 注意：此檔案第 6 節的 `axios`、`dotenv` 建議已被架構 ADR-07 排除，請勿採用。

1. 系統概述
本系統是一個自動化的機票價格監控工具，旨在定期抓取台北出發至日本多個目的地的機票含稅總價。當價格低於預設門檻時，透過 LINE Bot 發送 Flex Message 通知使用者。

2. 技術棧 (Tech Stack)
語言: Node.js (TypeScript)

執行環境: GitHub Actions (每小時排程執行)

外部 API: * Amadeus Self-Service API (主來源，含稅價精準)

Skyscanner/Duffel (備選擴充)

LINE Messaging API (通知推送)

開發工具: Gemini CLI (輔助 Code Generation)

3. 核心架構設計
採用 Provider Pattern，定義統一的機票資料介面，確保主邏輯與 API 供應商解耦。

3.1 資料模型 (Interface)

TypeScript
interface FlightOffer {
  source: string;        // API 來源 (如 Amadeus)
  origin: string;        // TPE
  destination: string;   // NRT, KIX...
  departureDate: string;
  returnDate: string;
  totalPriceTWD: number; // 已換算為台幣的含稅總價
  bookingUrl: string;    // 直接購票或查看連結
}
4. 功能需求 (Functional Requirements)
4.1 定時掃描 (Scheduler)

透過 GitHub Actions YAML 設定 cron: "0 * * * *" (每小時第 0 分執行)。

4.2 機票搜尋邏輯

參數化設定 (config.json):

destinations: ["NRT", "KIX", "FUK", "OKA", "CTS"]

passengers: { adults: 2, children: 1 }

maxBudget: 25000 (TWD)

多來源整合: 同時向已啟用的 Providers 發出請求。

小孩票處理: 必須在 API 請求中明確帶入 children 數量，確保回傳的是「家庭總價」。

4.3 通知機制

過濾器: 僅當 totalPriceTWD <= maxBudget 時觸發。

防止重複 (De-duplication): * 利用 GitHub Artifacts 或簡單的 Cache 紀錄 last_notified_price。

若相同日期組合的價格未下降超過 5%，則不重複發送 LINE。

4.4 LINE 通知格式

使用 LINE Flex Message。

欄位包含：航線、日期、人頭組成 (2大1小)、醒目的總價、購票按鈕。

5. 環境變數與安全 (Secrets)
必須在 GitHub Repo 的 Secrets 中配置：

AMADEUS_CLIENT_ID / AMADEUS_CLIENT_SECRET

LINE_CHANNEL_ACCESS_TOKEN

LINE_USER_ID (接收通知的對象)

6. Gemini CLI 開發指令建議 (Prompt Steps)
你可以直接複製以下指令給 Gemini CLI 開始開發：

初始化專案:

"幫我初始化一個 TypeScript 專案，包含 axios, dotenv 與 line-bot-sdk。並寫一個 config.ts 儲存目的地、人數與預算。"

實作 Amadeus Provider:

"請參考 Amadeus API 文件，寫一個 AmadeusProvider.ts。它需要能傳入起終點、日期與人數（含小孩），並回傳包含含稅總價的 FlightOffer 陣列。"

實作主邏輯與 LINE 通知:

"寫一個 index.ts 作為入口。它會調用 Provider 獲取機票，過濾低於預算的結果，並將結果轉換為 LINE Flex Message 發送。請加入防止一小時內重複通知相同低價的功能。"

建立 GitHub Action:

