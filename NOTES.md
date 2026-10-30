# 今日群島：進度

- 原始規格：使用者在對話中貼上的完整規格（10 節）。已拍板：語言切換用 `#en`（artifact 收不到 query string）。
- 原始碼在 `parts/`，依檔名順序串成 `index.html`（`sh build.sh`）。`preview.html` 補上 doctype 與 charset，給本機預覽用。
- Cloudflare（Workers 靜態網站，公開）：https://island-game.kh-lab.workers.dev
  更新方式：`sh build.sh && npx -y wrangler@4.155.0 deploy`（設定在 `wrangler.jsonc`，上傳 `dist/`）。
  新版 wrangler 的 `pages project create` 會轉給 Workers 處理然後失敗，所以改走 Workers 靜態網站。
- 本機預覽：`python3 -m http.server 8765`，然後開 http://localhost:8765/preview.html
- 五個階段都完成，已發布：https://claude.ai/artifact/CKSjFfcMJWoGTrkNvWhGwo
- 偏離規格的地方：細項飛行時的右偏量依鏡頭距離縮小；協作線的兩端固定在島前側的步道頂點（原本用最近節點時，相鄰島的路線只有一座橋那麼長）；資料的英文只翻名稱與摘要。
- 使用者要求的調整（2026-10-29）：選島的 offset 放大 1.35 倍；手機開卡片時鏡頭再拉遠 1.3 倍，目標往鏡頭方向移，物件落在 sheet 上方；背景樹減量、縮小、改用偏灰的綠，近處更稀疏；盆地山變矮、往外推。
- 已驗證（2026-10-29，Chrome DevTools）：reduced-motion 雙向即時切換（時鐘凍結與恢復、鏡頭瞬移、協作線變靜態虛線）；手機 390×844 觸控模擬下的拖曳把手（撐滿、回原高、關閉）；發布版（版本 3）讀回後，內容等於本機 index.html 加上平台的 skeleton。
- 未驗證：實機觸控；登入 claude.ai 後實際渲染出來的畫面（DevTools 的瀏覽器沒有登入）。
