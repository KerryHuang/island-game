# 每日議題更新：例行任務指示

這份是 `/schedule` 雲端例行任務每天執行時讀的指示。要改例行任務的行為，就改這個檔案並走 PR。

## 你的工作

你在 `KerryHuang/island-game` 的 checkout 裡。依時事更新 `data/issues.json`，開一個 PR 給 Kerry 審。**你不能合併 PR，也不能推 main。**

## 步驟

1. 取得台北今天的日期：`node -e "import('./scripts/validate.mjs').then(m=>console.log(m.taipeiToday()))"`。下面的 `TODAY` 都指這個日期。
2. 完整讀 `docs/update-guide.md`，嚴格照它的規則寫。重點如下：
   - 中立。
   - 不寫真實人名與政黨名。
   - 數字要出自來源，寫成「報導指出…」。
   - 沒把握就不改。
3. 讀 `data/issues.json`。
4. 依守則裡「每座島收哪類新聞」，用 WebSearch 找台灣近 7 天的新聞，接著決定改動：
   - **新增**：新出現且有不同立場的議題，`id` 用 `<島縮寫>-<YYYY-MM>-<slug>`。
   - **更新**：既有議題有新報導，就更新 `status`、`heat`、`views`、`sources`。
   - **降溫**：近 7 天沒有新報導的議題，heat 減 1，最低到 0。
   - **移除**：heat 已經是 0 的議題。但每座島移除後不能少於 3 則。
   - 每次最多改 8 則。heat 3 全城最多 6 則。每座島 3 到 8 則。
   - 有改動的議題，`updated` 設為 `TODAY`。沒改的不要動。
5. 每個新加的來源都要做兩項檢查，兩項都通過才收：
   - 用 WebFetch 讀過內文。
   - `curl -s -o /dev/null -w '%{http_code}' -L -A 'Mozilla/5.0' --max-time 20 URL` 回 200。
6. 驗證：`node scripts/validate.mjs`、`node --test tests/`、`sh build.sh` 都要通過。失敗就修，最多修兩輪。
7. 收尾。依情況擇一：
   - **沒有值得改的**：不建分支、不開 PR，最後回報「今天沒有更新」。
   - **驗證通過**：
     1. 建分支 `issues/TODAY`。
     2. **只 commit `data/issues.json`**，commit 訊息「議題更新 TODAY」，結尾加一行 `Co-Authored-By: Claude <noreply@anthropic.com>`。
     3. push 這個分支。
     4. 開 PR 到 main，標題「議題更新 TODAY」，內文用守則裡的「PR 內文格式」。
     5. 如果開不了 PR，就在最後回報裡附上 `https://github.com/KerryHuang/island-game/compare/main...issues/TODAY`。
   - **修兩輪還是失敗**：不開 PR。開一個 GitHub issue，標題「議題更新失敗 TODAY」，內文貼錯誤訊息。開不了 issue 就在最後回報裡寫明。

## 不能做的事

- 不改 `data/issues.json` 以外的任何檔案。
- 不推 main，不合併，不刪分支。
- 不放沒有讀過內文的來源，也不寫來源裡沒有的事。

## 最後回報

用繁體中文，列出：
- 新增、更新、降溫、移除各幾則，各是哪幾則。
- PR 或 compare 連結。
- 哪些候選議題沒收，為什麼。
