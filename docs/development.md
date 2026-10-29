# 開發指南

## 檔案結構

成品是單一 HTML 檔。為了方便編輯，原始碼拆成 `parts/` 底下的片段，由 `build.sh` 依檔名順序串起來：

```
parts/
  00-head.html        <title>、基本樣式、載入畫面、品牌卡
  05-ui.html          工具列、卡片、側欄、HUD 的樣式與 HTML
  06-walk.html        城市日誌、協作線圖例的樣式與 HTML
  07-finish.html      說明視窗、手機版樣式
  08-script-open.html importmap 與 <script type="module"> 開頭
  10-data.js          DATA：所有示範內容
  20-core.js          常數、工具函式、渲染器、相機、飛行
  25-env.js           天空、光線、水面、日夜 keyframes
  30-islands.js       程序貼圖、六角島、橋、路網與 Dijkstra、島名標籤
  40-kit.js           零件庫：所有靜態物件走 InstancedMesh
  45-models.js        15 種細項模型與島內配置
  47-furniture.js     路燈、盆栽、長椅、島上大樹、夜晚光池
  48-world.js         盆地地形、背景樹、遠山、雲、海上小島與帆船
  50-ui.js            選取、高亮、卡片、側欄、HUD、標籤避讓
  60-walkers.js       小人、協作線、badge、城市日誌
  70-finish.js        手機 bottom sheet、說明、reduced-motion、語言切換
  90-main.js          啟動流程、render loop、錯誤畫面
```

`build.sh` 產出三個檔案，都不進版控：

- `index.html`：發布成 claude.ai artifact 用。平台會自動包上 `<!doctype>` 與 charset，所以檔案從 `<title>` 開始。
- `preview.html`：補上 doctype 與 charset，給本機瀏覽器預覽。
- `dist/index.html`：內容同 `preview.html`，部署到 Cloudflare 用。

## 本機預覽

```sh
sh build.sh
python3 -m http.server 8765
```

打開 http://localhost:8765/preview.html 。不要直接用 `file://` 開：ES Modules 和 importmap 需要透過 http 載入。

改完程式碼後，可以先用 Node 檢查語法，再進瀏覽器：

```sh
sed -n '/<script type="module">/,/<\/script>/p' index.html | sed '1d;$d' > /tmp/check.mjs
node --check /tmp/check.mjs
```

## 換內容：DATA 格式

程式完全由 `parts/10-data.js` 裡的 `DATA` 驅動，換內容通常只需要改這個檔案。

### 城市

```js
city: { name: '示範市', en: 'Demo City', subtitle: '政策島', subtitleEn: 'Policy Islands' }
```

注意：`DATA.city` 目前沒有被程式讀取。品牌卡、載入畫面和 `<title>` 上的城市名稱直接寫在 `parts/00-head.html` 裡，換城市名稱時要改那個檔案。

### 島（政策主題）

```js
{ id: 'traffic', no: '01', name: '交通', en: 'Transit', q: 0, r: 0,
  ground: 'stripe', tree: 'round', band: '#db6a41',
  summary: '…', summaryEn: '…', items: [ … ] }
```

- `q`、`r`：六角格的 axial 座標。島和島要彼此相鄰（axial 距離為 1），橋才會自動接上。
- `ground`：地面花紋，可用 `brick`、`speckle`、`stripe`。
- `tree`：島上大樹的樹種，可用 `cone`、`cherry`、`fruit`、`palm`、`willow`、`round`。
- `band`：島緣圖案帶的顏色，也用在清單和卡片上。

### 細項

```js
{ id: 'tr1', name: '幹線公車重整', en: 'Trunk bus redesign', model: 'busstop', phase: '2-3',
  desc: '把繞路的公車線拉直，尖峰十分鐘一班。',
  facts: ['12 條幹線改為 10 分鐘一班', '平均通勤縮短 9 分鐘', '新增 48 座候車亭'] }
```

- 每座島的第一個細項是主建物，放在島的後方中央，尺寸最大。
- `model`：模型種類，可用 `house`、`hall`、`booth`、`classroom`、`clinic`、`busstop`、`bikes`、`court`、`farm`、`river`、`stage`、`book`、`coin`、`clock`、`globe`。寫錯時會退回 `house`。
- `phase`：時程，可用 `1`、`2-3`、`4`。
- `facts`：卡片上的大數字磚會從每條事實抓第一個數字和緊接的單位，最多 3 個。事實要以數字開頭或含數字才會顯示成大數字。
- 一座島放 3 到 8 個細項，都能用 0.62 的格子排下。超過 8 個時，格子會自動縮小，最小到 0.46。

### 協作線

```js
{ id: 'f1', from: 'edu', to: 'culture', cargo: 'book', role: 'student',
  evidence: 'official', label: '圖書館支援課後陪讀', en: 'Libraries support tutoring', count: 8 }
```

- `from`、`to`：島的 `id`。路線會從兩座島前側的步道出發，用 Dijkstra 沿路網和橋算出來。
- `cargo`：搬運物，決定小人手上方塊的顏色和頭上的圖示。可用 `book`、`meal`、`sapling`、`medkit`、`laptop`、`ticket`、`ball`、`letter`。
- `role`：走路的角色，決定配件。可用 `civil`、`researcher`、`elder`、`student`、`parent`、`commuter`、`farmer`、`worker`、`tourist`。`commuter` 會騎腳踏車，速度比較快。
- `evidence`：`official` 是實線，`thematic` 是虛線，`pending` 是點線。
- `count`：小人數量，會限制在 4 到 14 之間。

### 一天的時段

```js
{ start: 450, name: '上學通勤', en: 'Morning rush', lit: ['tr1', 'tr2', 'tr4', 'ed1'] }
```

- `start`：從 0 點起算的分鐘數。
- `lit`：這個時段要亮起黃色的細項 `id`。

## 加一種新模型

在 `parts/45-models.js` 的 `MODELS` 裡加一個函式。模型在單位空間設計：底面 ±0.5、高 0 到 1.5，正面朝 +z。

```js
fountain(L) {
  L('rbox', [0, .03, 0], [.96, .06, .96], '#e8ddcc');           // 底座
  L('cylinder', [0, .1, 0], [.7, .1, .7], PAL.stone);          // 水池
  L('cylinder', [0, .14, 0], [.6, .02, .6], PAL.pastel[1]);    // 水面
  L('glowsphere', [0, .4, 0], .12, PAL.cream);                 // 夜晚會發光
},
```

`L(幾何, 位置, 縮放, 顏色, 旋轉)` 會把零件推進零件庫。幾何可用 `box`、`rbox`、`cylinder`、`cone`、`sphere`、`ico`、`dome`、`torus`、`prism`、`hip`（四坡屋頂），以及夜晚會發光的 `glowbox`、`glowsphere`。所有零件最後依幾何合併成 InstancedMesh，不會增加 draw call。

加完後，在 `DATA` 裡把細項的 `model` 設成新名稱即可。

## 部署

### Cloudflare（公開網站）

設定在 `wrangler.jsonc`，把 `dist/` 當靜態檔案發布到 Cloudflare Workers：

```sh
sh build.sh && npx -y wrangler@4.155.0 deploy
```

網址：https://island-game.kh-lab.workers.dev

新版 wrangler 已把 Cloudflare Pages 併進 Workers，`wrangler pages project create` 在沒有設定檔時會失敗，所以這裡直接用 Workers 靜態網站。

### claude.ai artifact（私人分享）

`index.html` 也發布成了 claude.ai artifact，預設是私人的，要從頁面的 Share 選單分享。artifact 是另一份副本，要在 Claude Code 裡重新發布才會更新，不會跟著 Cloudflare 一起更新。

artifact 的網址只會把 `#名稱` 這種 hash 傳進頁面，query string 傳不進去，所以語言切換用 `#en`，不用 `?lang=en`。

## 設計上的取捨

- **固定種子**：`mulberry32(20261029)` 供應所有隨機，包含 SimplexNoise。調整建模或配置程式時，只要呼叫 `rand()` 的次數變了，後面所有隨機結果都會跟著變，整座城市的細節會換一個樣子。
- **只在需要時渲染**：平常小人和水面一直在動，每一幀都會畫，按「暫停」只會停住時鐘。開啟 reduced-motion 時，畫面只在有互動時才重畫。
- **只有太陽投影**：背景樹、小人都不投影。小人腳下是一張半透明圓形假影子。
- **LOD**：盆栽、灌木、串燈、長椅在鏡頭距離 26 以上時隱藏。
- **標籤避讓**：每次渲染後檢查島名標籤是否和介面面板或其他標籤重疊。重疊時先只留號碼，還是重疊就隱藏，並留 8px 緩衝避免閃爍。

跟原始規格不同的地方，以及驗證過哪些項目，都記在 [`NOTES.md`](../NOTES.md)。

## 已知限制

- 英文版的細項說明與重點事實還是中文。
- `DATA.city` 沒有接上程式，城市名稱要改 `00-head.html`。
- 沒有自動化測試。目前的驗證方式是語法檢查加上瀏覽器實測。
- 只在 Chrome 測過，Safari 和 Firefox 都還沒測。
