# V2.2.1 商用資安 / 防盜防駭 Checklist

## Secrets
- [x] Firebase Web config / VAPID 僅屬公開 client config。
- [x] Gemini key 僅由 Netlify Function 讀取。
- [x] Payhip product secret 僅由 Netlify Function 讀取。
- [x] Firebase Admin service account 僅由 Netlify env 讀取。
- [ ] 正式上架前檢查 Git 歷史是否曾提交真正 secret；若有，立即輪替。

## Auth / Entitlements
- [x] 正式授權依 Firebase UID。
- [x] `entitlements` 客戶端只讀自己的資料，禁止 client write。
- [x] owner UID 由 server env 判定，不以公開前端開關判定。
- [x] TEST_MODE 僅由 server env 開啟。
- [x] 特殊 Pro 事件 API 由 server 驗證 Push Pro entitlement。

## License
- [x] Payhip License 驗證在 server-side 執行。
- [x] License 正規化後以 SHA-256 hash 作綁定索引，不保存明碼 License。
- [x] 同一 License 不可綁定不同 UID。
- [x] 驗證商品 product key，防止其他 Payhip 商品 License 混用。
- [x] License redemption 有 UID/IP rate limit。

## Firestore
- [x] 使用者只可修改自己的 `users/{uid}`、settings、devices。
- [x] 付費 role/baseAccess/pushPlan/pushExpiresAt/themes 不可由 client 寫入。
- [x] licenseBindings、rate limits、notification receipts 預設禁止 client 讀寫。

## Push
- [x] Push token 綁 UID/deviceId。
- [x] Scheduled dispatcher 只處理有效 Pro entitlement。
- [x] 單一排程批次處理，而非每位使用者建立 scheduler。
- [x] notification receipt 防止同事件重複推播。
- [x] TEST_MODE 不自動發正式 Push。

## Data / Availability
- [x] GitHub 不參與 runtime data path。
- [x] 新聞共用 Netlify Blobs 快取並提供 stale fallback。
- [x] 經濟事件共用 Netlify Blobs 快取並提供 fallback。
- [x] 前端保留最近有效 local cache。

## HTTP / UI
- [x] 移除 Firebase DEBUG / API technical dump。
- [x] 加入 nosniff、Referrer-Policy、Permissions-Policy。
- [x] 對輸入做基本格式驗證，錯誤訊息不回傳 secret。
- [ ] 正式上線後再依實際 domain 收緊 CSP / CORS，不在 Preview 階段硬鎖第三方 Firebase CDN。

## 正式發布前人工檢查
- [ ] Firebase Google provider 正常。
- [ ] Firestore Rules 已部署。
- [ ] Netlify secrets 已設，GitHub 無 secrets。
- [ ] `TEST_MODE=false`。
- [ ] owner account 實測全解鎖。
- [ ] 未購買帳號無法讀 Pro event details。
- [ ] 假 License / 重複 License / 暴力嘗試均被拒絕。
- [ ] Push Pro 過期帳號不再發送。
- [ ] News 上游失敗時仍顯示最近有效資料。
- [ ] GitHub 暫時不可用時，已部署 App 仍可正常讀 runtime cache。
