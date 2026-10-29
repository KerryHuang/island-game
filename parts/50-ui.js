
// ================= 介面：選取、高亮、卡片、側欄、HUD =================
const $ = (id) => document.getElementById(id);
const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩';
const PHASES = [['1', '第 1 年', 'Year 1'], ['2-3', '2–3 年', 'Years 2–3'], ['4', '第 4 年', 'Year 4']];
const EVIDENCE = { official: ['正式政策', 'Official'], thematic: ['主題相關', 'Thematic'], pending: ['規劃中', 'Pending'] };
const CARGO = { book: ['書', 'books'], meal: ['餐盒', 'meal boxes'], sapling: ['樹苗', 'saplings'], medkit: ['藥箱', 'medkits'], laptop: ['筆電', 'laptops'], ticket: ['票券', 'tickets'], ball: ['球', 'balls'], letter: ['公文', 'letters'] };
const flowName = (f) => tr(f.label, f.en);
const isleName = (i) => tr(i.data.name, i.data.en);
const itemName = (r) => tr(r.data.name, r.data.en);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtTime = (m) => { const h = Math.floor(m / 60), mm = Math.floor(m % 60 / 10) * 10; return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); };
const isDesktop = () => innerWidth > 800;

S.sel = null; S.period = null; S.show = { names: false, carry: true, flows: false, log: false };
S.pickers = [];

// ---------- 高亮：選取往 coral 混 22%，時段亮起往 yellow 混 22% ----------
let _hc, CORAL, YELLOW;
function applyHighlights() {
  const lit = new Set(S.period ? S.period.lit : []);
  const selItem = S.sel && S.sel.type === 'item' ? S.sel.rec : null;
  const touched = new Set();
  kit.ownerParts.forEach((parts, rec) => {
    const mix = rec === selItem ? CORAL : lit.has(rec.data.id) ? YELLOW : null;
    parts.forEach(({ mesh, i, base }) => {
      mesh.setColorAt(i, mix ? _hc.copy(base).lerp(mix, .22) : base); touched.add(mesh);
    });
  });
  touched.forEach((m) => { m.instanceColor.needsUpdate = true; });
  S.islands.forEach((isl) => {
    const on = S.sel && S.sel.island === isl;
    isl.labelEl.classList.toggle('sel', !!on);
    isl.labelEl.classList.toggle('dim', !!S.sel && !!S.sel.island && !on);
  });
  markDirty();
}

function currentPeriod(min) {
  let p = DATA.dayCycle[0];
  DATA.dayCycle.forEach((d) => { if (d.start <= min) p = d; });
  return p;
}

// ---------- 飛行 ----------
function flyToObject(target, offset) {
  const off = new THREE.Vector3(...offset);
  const t = target.clone();
  if (isDesktop() && S.cardOpen) {
    const right = new THREE.Vector3(off.z, 0, -off.x).normalize();
    // 卡片在左側：目標往右偏，物件落在畫面右半；近距離時依鏡頭距離等比縮小偏移
    t.addScaledVector(right, -1.5 * Math.min(1, off.length() / 8.6));
  } else if (!isDesktop() && S.cardOpen) {
    // 手機：bottom sheet 蓋住下方，鏡頭再拉遠，目標往鏡頭方向移，物件落在畫面上半
    off.multiplyScalar(1.3);
    t.addScaledVector(new THREE.Vector3(off.x, 0, off.z).normalize(), off.length() * .14);
  }
  setBird(false, true);
  flyTo(t, t.clone().add(off));
}

// ---------- 選取：四種都走同一流程 ----------
function select(sel) {
  S.sel = sel;
  applyHighlights();
  if (typeof showFlowsFor === 'function') showFlowsFor(sel);
  updatePins();
  openCard(sel);
  // 島的 offset 比規格 (2.75, 5.3, 6.2) 放大 1.35 倍，整座島和周邊都入鏡
  if (sel.type === 'island') flyToObject(new THREE.Vector3(sel.island.cx, TOP, sel.island.cz), [3.7, 7.15, 8.4]);
  else if (sel.type === 'item') flyToObject(sel.rec.frame.origin.clone().setY(TOP + .3), [1.6, 2.5, 3.2]);
  else if (sel.type === 'walker') flyToObject(sel.walker.pos.clone(), [1.6, 2.5, 3.2]);
  else if (sel.type === 'flow') {
    const a = S.islandById[sel.flow.from], b = S.islandById[sel.flow.to];
    const mid = new THREE.Vector3((a.cx + b.cx) / 2, TOP, (a.cz + b.cz) / 2);
    const d = Math.hypot(a.cx - b.cx, a.cz - b.cz);
    flyToObject(mid, [2.75 * (1 + d / 8), 5.3 * (1 + d / 8), 6.2 * (1 + d / 8)]);
  }
}
const selectIsland = (isl) => select({ type: 'island', island: isl });
const selectItem = (rec) => select({ type: 'item', rec, island: rec.island });
const selectWalker = (w) => select({ type: 'walker', walker: w, flow: w.flow });
const selectFlow = (f) => select({ type: 'flow', flow: f });

function clearSelection() {
  S.sel = null; closeCard(); applyHighlights(); updatePins();
  if (typeof showFlowsFor === 'function') showFlowsFor(null);
}

// ---------- 卡片 ----------
function openCard(sel) {
  const body = $('cardBody');
  if (sel.type === 'island') body.innerHTML = islandCard(sel.island);
  else if (sel.type === 'item') body.innerHTML = itemCard(sel.rec);
  else body.innerHTML = flowCard(sel.flow, sel.walker);
  $('card').hidden = false; S.cardOpen = true;
  body.scrollTop = 0;
  if (sel.type === 'item') { const c = body.querySelector('canvas.thumb'); if (c) drawThumb(sel.rec, c); }
  bindCardLinks(body);
  if (typeof onCardOpen === 'function') onCardOpen();
}
function closeCard() { $('card').hidden = true; S.cardOpen = false; if (typeof onCardClose === 'function') onCardClose(); }

function flowsOf(isl) { return DATA.flows.filter((f) => f.from === isl.data.id || f.to === isl.data.id); }
function islandCard(isl) {
  const d = isl.data, lit = new Set(S.period ? S.period.lit : []);
  return `<div class="head"><div class="disc" style="background:${d.band}">${d.no}</div>
      <div><div class="eyebrow">${tr('政策主題', 'POLICY TOPIC')} · ${d.items.length} ${tr('項', 'ITEMS')}</div><h2>${esc(isleName(isl))}</h2></div></div>
    <p>${esc(tr(d.summary, d.summaryEn))}</p>
    <div class="eyebrow">${tr('細項', 'ITEMS')}</div>
    <div class="list">${isl.items.map((r) => `<button class="row${lit.has(r.data.id) ? ' lit' : ''}" type="button" data-item="${r.data.id}"><span class="n">${CIRCLED[r.num - 1]}</span>${esc(itemName(r))}<small>${phaseLabel(r.data.phase)}</small></button>`).join('')}</div>
    ${flowsOf(isl).length ? `<div class="eyebrow">${tr('協作', 'COLLABORATIONS')}</div>
    <div class="chips">${flowsOf(isl).map((f) => `<button class="chip" type="button" data-flow="${f.id}">${esc(flowName(f))}</button>`).join('')}</div>` : ''}`;
}
const phaseLabel = (p) => { const x = PHASES.find((q) => q[0] === p); return x ? tr(x[1], x[2]) : p; };

// 從事實抓出最多 3 個大數字
function bigNumbers(facts) {
  const out = [];
  facts.forEach((f) => {
    const m = f.match(/([\d][\d,.]*)\s*(萬|%|公里|km\/h|分鐘|元|個|座|處|人|戶|天|小時|班|輛|噸|條|棵|盞|倍|間|所|位|點|家|秒|名|份|組|期|團|種|Mbps|件|項|年|個月)?/);
    if (m && out.length < 3) out.push({ n: m[1] + (m[2] === '萬' || m[2] === '%' ? m[2] : ''), unit: m[2] && m[2] !== '萬' && m[2] !== '%' ? m[2] : '', text: f });
  });
  return out;
}
function itemCard(r) {
  const d = r.data, isl = r.island, lit = S.period && S.period.lit.includes(d.id);
  return `<div class="eyebrow">${isl.data.no} ${esc(isleName(isl))} · ${CIRCLED[r.num - 1]}${lit ? ` · ${tr('此時段亮起', 'ACTIVE NOW')}` : ''}</div>
    <h2>${esc(itemName(r))}</h2>
    <canvas class="thumb" width="320" height="320" style="width:160px;height:160px" aria-hidden="true"></canvas>
    <p>${esc(d.desc)}</p>
    <div class="tiles">${bigNumbers(d.facts).map((b) => `<div class="tile"><span class="num">${esc(b.n)}<span style="font-size:14px;font-style:normal;margin-left:2px">${esc(b.unit)}</span></span><small>${esc(b.text)}</small></div>`).join('')}</div>
    <div class="eyebrow">${tr('重點', 'KEY FACTS')}</div>
    <ul class="facts">${d.facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
    <div class="eyebrow">${tr('時程', 'TIMELINE')}</div>
    <div class="timeline">${PHASES.map((p) => `<div class="${p[0] === d.phase ? 'on' : ''}">${tr(p[1], p[2])}</div>`).join('')}</div>
    <div class="chips"><button class="chip cream" type="button" data-island="${isl.data.id}">${tr('回到', 'Back to')} ${esc(isleName(isl))}</button></div>`;
}
function flowCard(f, w) {
  const a = S.islandById[f.from], b = S.islandById[f.to], ev = EVIDENCE[f.evidence], cg = CARGO[f.cargo];
  return `<div class="eyebrow">${w ? tr('搬運中的市民', 'CITIZEN ON THE MOVE') : tr('協作線', 'COLLABORATION')}</div>
    <h2>${esc(flowName(f))}</h2>
    <div class="flowline"><button class="chip" type="button" data-island="${a.data.id}">${a.data.no} ${esc(isleName(a))}</button><span aria-hidden="true">→</span><button class="chip" type="button" data-island="${b.data.id}">${b.data.no} ${esc(isleName(b))}</button></div>
    <div class="tiles">
      <div class="tile"><small>${tr('證據等級', 'Evidence')}</small><span><span class="ev ${f.evidence}">${tr(ev[0], ev[1])}</span></span></div>
      <div class="tile"><small>${tr('搬運物', 'Cargo')}</small><b>${tr(cg[0], cg[1])}</b></div>
      <div class="tile"><small>${tr('路上人數', 'Walkers')}</small><span class="num">${f.count}</span></div>
    </div>
    <p>${tr(`市民從「${a.data.name}」把${cg[0]}送到「${b.data.name}」，交接後再走回去。`, `Citizens carry ${cg[1]} from ${a.data.en} to ${b.data.en}, hand them over, then walk back.`)}</p>`;
}
function bindCardLinks(root) {
  root.querySelectorAll('[data-item]').forEach((el) => el.addEventListener('click', () => selectItem(S.itemById[el.dataset.item])));
  root.querySelectorAll('[data-island]').forEach((el) => el.addEventListener('click', () => selectIsland(S.islandById[el.dataset.island])));
  root.querySelectorAll('[data-flow]').forEach((el) => el.addEventListener('click', () => selectFlow(DATA.flows.find((f) => f.id === el.dataset.flow))));
}

// ---------- 細項縮圖：160² 離屏渲染 ----------
const thumbCache = new Map();
let thumbRT, thumbCam;
function drawThumb(rec, canvas) {
  const W = 320;
  if (!thumbCache.has(rec)) {
    thumbRT = thumbRT || new THREE.WebGLRenderTarget(W, W, { colorSpace: THREE.SRGBColorSpace, samples: 4 });
    thumbCam = thumbCam || new THREE.PerspectiveCamera(30, 1, .1, 60);
    const o = rec.frame.origin, s = rec.frame.size;
    thumbCam.position.set(o.x + 1.5 * s, o.y + 1.9 * s, o.z + 2.6 * s);
    thumbCam.lookAt(o.x, o.y + .45 * s, o.z);
    const r = S.renderer, prevAlpha = r.getClearAlpha(), fog = S.scene.fog, sky = ENV.sky.visible;
    S.scene.fog = null; ENV.sky.visible = false;
    r.setRenderTarget(thumbRT); r.setClearColor(0x000000, 0); r.clear(); r.render(S.scene, thumbCam); r.setRenderTarget(null);
    r.setClearColor(0x000000, prevAlpha); S.scene.fog = fog; ENV.sky.visible = sky;
    const px = new Uint8Array(W * W * 4); r.readRenderTargetPixels(thumbRT, 0, 0, W, W, px);
    const img = new ImageData(W, W);
    for (let y = 0; y < W; y++) img.data.set(px.subarray((W - 1 - y) * W * 4, (W - y) * W * 4), y * W * 4);
    thumbCache.set(rec, img);
    markDirty();
  }
  canvas.getContext('2d').putImageData(thumbCache.get(rec), 0, 0);
}

// ---------- 側欄 ----------
let sideTab = 'topics';
function renderSide() {
  const q = $('search').value.trim().toLowerCase(), list = $('sideList');
  const hit = (s) => !q || (s || '').toLowerCase().includes(q);
  if (sideTab === 'topics') {
    const html = S.islands.map((isl) => {
      const d = isl.data, topicHit = hit(d.name) || hit(d.en) || hit(d.summary);
      const items = isl.items.filter((r) => topicHit || hit(r.data.name) || hit(r.data.en) || hit(r.data.desc));
      if (!items.length) return '';
      return `<details${q ? ' open' : ''}><summary><span class="dot" style="background:${d.band}"></span>${d.no} ${esc(isleName(isl))}<small>${isl.items.length}</small></summary>
        <div class="list"><button class="row" type="button" data-island="${d.id}"><span class="n">◎</span>${tr('看整座島', 'View island')}</button>
        ${items.map((r) => `<button class="row" type="button" data-item="${r.data.id}"><span class="n">${CIRCLED[r.num - 1]}</span>${esc(itemName(r))}</button>`).join('')}</div></details>`;
    }).join('');
    list.innerHTML = html || `<div class="empty">${tr('找不到符合的政策，換個關鍵字試試。', 'No matching policies. Try another keyword.')}</div>`;
  } else {
    const fl = DATA.flows.filter((f) => hit(f.label) || hit(f.en) || hit(S.islandById[f.from].data.name) || hit(S.islandById[f.to].data.name));
    list.innerHTML = fl.map((f) => `<button class="row" type="button" data-flow="${f.id}"><span class="ev ${f.evidence}">${tr(EVIDENCE[f.evidence][0], EVIDENCE[f.evidence][1])}</span>${esc(flowName(f))}</button>`).join('')
      || `<div class="empty">${tr('找不到符合的協作關係。', 'No matching collaborations.')}</div>`;
  }
  bindCardLinks(list);
}
function setSideOpen(open) {
  $('side').hidden = !open; $('bList').setAttribute('aria-pressed', String(open));
  if (typeof onSideToggle === 'function') onSideToggle(open);
}

// ---------- HUD ----------
function updateClockUI() {
  $('clockTime').textContent = fmtTime(S.minute);
  $('clockPeriod').textContent = S.period ? tr(S.period.name, S.period.en) : '';
}
function setBird(on, silent) {
  if (S.bird === on) return;
  S.bird = on; $('tBird').setAttribute('aria-pressed', String(on));
  S.controls.minPolarAngle = on ? 0 : THREE.MathUtils.degToRad(25);
  if (on && !silent) { const t = S.center.clone(); flyTo(t, t.clone().add(new THREE.Vector3(.01, 42, 6))); }
  else if (!on && !silent) goOverview();
}
function toggle(id, key, fn) {
  $(id).addEventListener('click', () => {
    const on = $(id).getAttribute('aria-pressed') !== 'true';
    $(id).setAttribute('aria-pressed', String(on));
    if (key) S.show[key] = on;
    if (fn) fn(on);
    markDirty();
  });
}

// ---------- 選取 pin：①②③ 與 coral 細線 ----------
const pins = [];
let pinLines;
function updatePins() {
  pins.forEach((p) => S.scene.remove(p)); pins.length = 0;
  const isl = S.sel && S.sel.island;
  if (pinLines) pinLines.visible = false;
  if (!isl) { markDirty(); return; }
  const pts = [];
  isl.items.forEach((r) => {
    const el = document.createElement('div');
    el.className = 'pin'; el.textContent = CIRCLED[r.num - 1];
    el.title = itemName(r);
    el.addEventListener('click', (e) => { e.stopPropagation(); selectItem(r); });
    const o = new CSS2DObject(el), top = r.top, at = top.clone().add(new THREE.Vector3(0, .42, 0));
    o.position.copy(at); S.scene.add(o); pins.push(o);
    pts.push(top.x, top.y, top.z, at.x, at.y - .1, at.z);
  });
  if (!pinLines) {
    pinLines = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: PAL.coral, depthTest: false, transparent: true, opacity: .9 }));
    pinLines.renderOrder = 20; S.scene.add(pinLines);
  }
  pinLines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  pinLines.geometry.computeBoundingSphere();
  pinLines.visible = true; markDirty();
}

// ---------- 點擊：移動 ≤ 6px 才 raycast ----------
let ray, ndc;
let downAt = null;
function handlePick(e) {
  const rect = S.renderer.domElement.getBoundingClientRect();
  ndc.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
  ray.setFromCamera(ndc, S.camera);
  let best = null;
  S.pickers.forEach((pk) => {
    const objs = pk.objects().filter((o) => o.visible);
    const h = ray.intersectObjects(objs, false)[0];
    if (h && (!best || h.distance - (pk.bias || 0) < best.h.distance - (best.pk.bias || 0))) best = { h, pk };
  });
  if (best && best.pk.resolve(best.h)) return;
  if (S.sel) clearSelection();
}

function nearestIsland(p) {
  let b = null, bd = Infinity;
  S.islands.forEach((i) => { const d = Math.hypot(i.cx - p.x, i.cz - p.z); if (d < bd) { bd = d; b = i; } });
  return bd < R + .3 ? b : null;
}

// ---------- 標籤碰撞避讓（8px hysteresis） ----------
function overlap(a, b, pad) { return a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad; }
function avoidLabels() {
  const blockers = ['brand', 'tools', 'card', 'side', 'hud', 'log', 'legend'].map((id) => $(id)).filter((el) => el && !el.hidden).map((el) => el.getBoundingClientRect());
  const placed = [];
  const order = S.islands.slice().sort((a, b) => (a.labelEl.classList.contains('sel') ? -1 : 0) - (b.labelEl.classList.contains('sel') ? -1 : 0));
  order.forEach((isl) => {
    const el = isl.labelEl;
    if (el.style.display === 'none') return;
    const prev = el.classList.contains('gone') ? 2 : el.classList.contains('compact') ? 1 : 0;
    el.classList.remove('compact', 'gone');
    const test = (pad) => { const r = el.getBoundingClientRect(); return { r, bad: blockers.some((b) => overlap(r, b, pad)) || placed.some((b) => overlap(r, b, pad)) }; };
    let lvl = 0, t = test(prev > 0 ? 8 : 0);
    if (t.bad) { el.classList.add('compact'); lvl = 1; t = test(prev > 1 ? 8 : 0); if (t.bad) { el.classList.add('gone'); lvl = 2; } }
    if (lvl < 2) placed.push(el.getBoundingClientRect());
  });
}
let afterRender = () => { avoidLabels(); };

// ---------- 建 UI ----------
function buildUI() {
  _hc = new THREE.Color(); CORAL = new THREE.Color(PAL.coral); YELLOW = new THREE.Color(PAL.yellow);
  ray = new THREE.Raycaster(); ndc = new THREE.Vector2();
  S.pickers.push({
    objects: () => kit.meshes,
    resolve: (h) => {
      const part = h.object.userData.parts[h.instanceId];
      if (part && part.owner) { selectItem(part.owner); return true; }
      const isl = nearestIsland(h.point); if (isl) { selectIsland(isl); return true; }
      return false;
    },
  });
  S.pickers.push({ objects: () => S.islands.flatMap((i) => i.pickables), resolve: (h) => { selectIsland(h.object.userData.island); return true; } });

  const cv = S.renderer.domElement;
  cv.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
  cv.addEventListener('pointerup', (e) => {
    if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) <= 6) handlePick(e);
    downAt = null;
  });

  $('cardClose').addEventListener('click', clearSelection);
  $('bOverview').addEventListener('click', () => { clearSelection(); setBird(false, true); goOverview(); });
  $('bList').addEventListener('click', () => setSideOpen($('side').hidden));
  $('search').addEventListener('input', renderSide);
  [['tabTopics', 'topics'], ['tabFlows', 'flows']].forEach(([id, t]) => $(id).addEventListener('click', () => {
    sideTab = t; $('tabTopics').setAttribute('aria-pressed', String(t === 'topics')); $('tabFlows').setAttribute('aria-pressed', String(t === 'flows')); renderSide();
  }));
  document.querySelectorAll('#hud [data-min]').forEach((b) => b.addEventListener('click', () => {
    S.minute = +b.dataset.min; applyTime(S.minute); onMinute(true);
  }));
  toggle('tNames', 'names'); toggle('tCarry', 'carry');
  toggle('tFlows', 'flows', () => { if (typeof showFlowsFor === 'function') showFlowsFor(S.sel); });
  toggle('tPause', null, (on) => { S.clockPaused = on; });
  $('tBird').addEventListener('click', () => setBird(!S.bird));
  toggle('tLog', 'log', (on) => { if (typeof setLogOpen === 'function') setLogOpen(on); });

  addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    if (e.key === 'Escape') { if (typeof closeHelp === 'function' && closeHelp()) return; clearSelection(); return; }
    const rot = { ArrowLeft: [-.08, 0], ArrowRight: [.08, 0], ArrowUp: [0, -.06], ArrowDown: [0, .06] }[e.key];
    if (!rot) return;
    e.preventDefault(); S.fly = null;
    const off = S.camera.position.clone().sub(S.controls.target), sp = new THREE.Spherical().setFromVector3(off);
    sp.theta += rot[0]; sp.phi = clamp(sp.phi + rot[1], S.controls.minPolarAngle, S.controls.maxPolarAngle);
    S.camera.position.copy(S.controls.target).add(new THREE.Vector3().setFromSpherical(sp));
    S.controls.update(); markDirty();
  });

  onMinute = (force) => {
    const p = currentPeriod(S.minute);
    if (p !== S.period || force === true) { S.period = p; applyHighlights(); if (S.sel && S.sel.type === 'island') openCard(S.sel); }
    updateClockUI();
  };
  setSideOpen(isDesktop());
  renderSide();
  onMinute(true);
}
