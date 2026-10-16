// 2026-10-16 從 beta/app.js 拿掉的輪迴程式（原樣，一段一段接起來，不能直接跑）

// ===== 輪迴 =====
// 玩家自己選什麼時候輪迴：清空錢、商店升級、檯面；保留圖鑑、成就、裝飾品和輪迴點買的東西。
// 輪迴點照「這一輪累計賺的錢」換，像經驗值表：第 n 點要累計賺到 REBIRTH_BASE × n^REBIRTH_POW 枚（越後面越難）。
// 數值是 Claude 先隨意設定的（2026-10-05），之後看手感調。
const REBIRTH_BASE = 1000;  // 第 1 點 1000 枚（2026-10-05 納可：不要放太高）
// 2026-10-05 納可：中後段買不到東西的時候，就是該輪迴的時候，點數曲線調低一點（1.5 → 1.25），那時候輪迴比較划算
const REBIRTH_POW = 1.25;
function rebirthNeed(n) {
  const x = REBIRTH_BASE * Math.pow(n, REBIRTH_POW);
  return x < 10000 ? Math.round(x / 100) * 100 : Math.round(x / 1000) * 1000;
}
// 輪迴點商店：costs 是每一級要幾點。每一級都一樣 1 點，不會越來越貴（納可：輪迴點每一點都很珍貴）
// 以後要卡進度，用「這一層全部升到多少級才開第二層」來卡（納可定）
// 每一級的效果不一定一樣，所以畫面上只寫「升級後」那一級的效果（納可定）。eff(lv) 是第 lv 級的效果
const PERK_MULT = 0.1;       // 收入加成每級 +10%（2026-10-05 納可定）。2026-10-06 納可：改成複利，每級乘 1.1（3 級是 1.1³ ≈ 多拿 33%）
const PERK_MONEY = [0, 100, 300, 600, 1000, 1500]; // 初始資金每一級總共多幾枚（納可定）
const PERK_OFF = 0.1;        // 商店打折每級 -10%，複利（每級乘 0.9，2026-10-06 納可）
const perkMult = (lv) => Math.pow(1 + PERK_MULT, lv);
const perkOff = (lv) => Math.pow(1 - PERK_OFF, lv);
const PERKS = {
  mult: { name: '收入加成', costs: [1, 1, 1, 1, 1], eff: (lv) => `推下來的幣、娃娃、轉盤都多拿 ${Math.round((perkMult(lv) - 1) * 100)}%` },
  startMoney: { name: '初始資金', costs: [1, 1, 1, 1, 1], eff: (lv) => `輪迴後一開始手上多 ${PERK_MONEY[lv]} 枚` },
  headStart: { name: '起跑', costs: [1, 1, 1], eff: (lv) => `輪迴後「媽媽十元」「投幣速度」「推板加速」直接從 Lv ${lv} 開始` },
  discount: { name: '商店打折', costs: [1, 1, 1, 1], eff: (lv) => `商店升級便宜 ${Math.round((1 - perkOff(lv)) * 100)}%` },
  dollCap: { name: '娃娃上限', costs: [1, 1], eff: (lv) => `檯面上同時最多 ${MAX_DOLLS + lv} 隻娃娃` },
  // 小寶物的種類 2026-10-16 搬到一般商店的「珠寶」（納可定）；上限還留在這裡
  gemCap: { name: '寶物上限', costs: [1, 1, 1], eff: (lv) => `檯面上同時最多 ${MAX_TREASURES + lv} 個小寶物` },
};
const PERK_KEYS = Object.keys(PERKS);
// shopping：按了兩次輪迴、正在輪迴點商店裡（點數已經拿到，還沒按「重生」）；gained 是這次拿到幾點
const rebirth = { points: 0, count: 0, shopping: false, gained: 0, perks: Object.fromEntries(PERK_KEYS.map((k) => [k, 0])) };
const perkLv = (k) => rebirth.perks[k];

// ----------
// 舊的 upPrice（有輪迴點的商店打折）
function upPrice(key, lv = upgrades[key]) {
  const p = UPGRADES[key].prices[lv];
  const off = perkOff(perkLv('discount'));
  return off < 1 ? niceMoney(p * off) : p;
}

// ----------
  let html = '<div class="bookTabs">'
    + `<button type="button" class="bookTab${shopTab === 'up' ? ' on' : ''}" data-shoptab="up">升級</button>`
    + `<button type="button" class="bookTab${shopTab === 'rebirth' ? ' on' : ''}" data-shoptab="rebirth">輪迴${rebirthPending() ? `（+${rebirthPending()}）` : ''}</button></div>`;
  if (shopTab === 'rebirth') {
    shopListEl.innerHTML = html + rebirthHtml();
    return;
  }

// ----------
// 現在輪迴可以拿到幾點
function rebirthPending() {
  let n = 0;
  while (rebirthNeed(n + 1) <= won) n++;
  return n;
}
function rebirthHtml() {
  if (rebirth.shopping) return rebirthShopHtml();
  const n = rebirthPending();
  const need = rebirthNeed(n + 1);
  let html = `<div class="rebirthBox">
    <div>這一輪累計賺了 <b>${Math.floor(won)}</b> 枚</div>
    <div>現在輪迴可以拿到 <b>${n}</b> 點輪迴點（再賺 ${need - Math.floor(won)} 枚多 1 點）</div>
    <div class="bookNote">輪迴會清空：手上的錢、商店升級、檯面上的東西。<br>會保留：圖鑑、成就、裝飾品、輪迴點和輪迴點買的東西。<br>輪迴點要在輪迴的時候才能用。</div>
    <button type="button" id="rebirthGo" ${n ? '' : 'disabled'}>${rebirthArmed ? `確定？再按一次就輪迴（+${n} 點）` : n ? `輪迴（+${n} 點）` : `累計賺到 ${rebirthNeed(1)} 枚才能輪迴`}</button>
  </div>
  <div class="rebirthHead">輪迴點：<b>${rebirth.points}</b> 點${rebirth.count ? `　已經輪迴 ${rebirth.count} 次` : ''}</div>`;
  // 平常只看得到現在的等級和效果，不能買
  let inner = '';
  for (const k of PERK_KEYS) {
    const p = PERKS[k];
    const lv = perkLv(k);
    const max = p.costs.length;
    inner += buyRowHtml({
      name: p.name, lv: lv >= max ? `Lv ${lv}（滿級）` : `Lv ${lv} / ${max}`,
      desc: lv ? `現在：${p.eff(lv)}` : `還沒買。Lv 1：${p.eff(1)}`,
      btn: '',
    });
  }
  html += groupHtml('rebirth.perks', '輪迴點商店（輪迴時才能買）', `${PERK_KEYS.length} 項`, inner);
  return html;
}
// 輪迴中的商店：只剩這個面板，買完按「重生」
const REBIRTH_LINES = ['改機被老闆發現了，快溜！', '玩太多被媽媽發現了，塊陶啊！'];
let rebirthLine = REBIRTH_LINES[0];
function rebirthShopHtml() {
  let html = `<div class="rebirthBox">
    <div class="rebirthLine">${rebirthLine}</div>
    <div>這次拿到 <b>${rebirth.gained}</b> 點輪迴點，手上共 <b>${rebirth.points}</b> 點</div>
    <div class="bookNote">想買什麼就買，不買也可以。按「重生」就重新開始。</div>
  </div>`;
  let inner = '';
  for (const k of PERK_KEYS) {
    const p = PERKS[k];
    const lv = perkLv(k);
    const max = p.costs.length;
    const cost = p.costs[lv];
    inner += buyRowHtml({
      name: p.name, lv: lv >= max ? `Lv ${lv}（滿級）` : `Lv ${lv} / ${max}`,
      desc: lv >= max ? `已滿級：${p.eff(lv)}` : `升級後：${p.eff(lv + 1)}`,
      price: lv < max ? `${cost} 點` : '', canPay: rebirth.points >= cost,
      btn: lv >= max ? '<button type="button" disabled>滿級</button>'
        : `<button type="button" data-perk="${k}" ${rebirth.points < cost ? 'disabled' : ''}>升級</button>`,
    });
  }
  html += `<div class="perkList">${inner}</div>`;
  html += '<button type="button" id="rebornGo">重生</button>';
  return html;
}
// 按兩次輪迴：拿到點數，機台收起來，只剩輪迴點商店
function enterRebirthShop() {
  const n = rebirthPending();
  if (!n || rebirth.shopping) return;
  rebirth.points += n;
  rebirth.count++;
  rebirth.gained = n;
  rebirth.shopping = true;
  won = 0; // 點數已經拿了，避免重新整理後又算一次
  rebirthLine = REBIRTH_LINES[Math.floor(Math.random() * REBIRTH_LINES.length)];
  setAuto(false);
  pointerDown = false;
  showRebirthShop();
  saveGame();
}
function showRebirthShop() {
  for (const id of ['ach', 'book', 'settings', 'wheel', 'viewer']) document.getElementById(id).classList.remove('show');
  document.body.classList.add('rebirthing');
  shopTab = 'rebirth';
  rebirthArmed = 0;
  renderShop();
  shopEl.classList.add('show');
  shopListEl.scrollTop = 0;
  shopEl.scrollTop = 0;
}
function buyPerk(k) {
  if (!rebirth.shopping) return;
  const lv = perkLv(k);
  const cost = PERKS[k].costs[lv];
  if (cost === undefined || rebirth.points < cost) return;
  rebirth.points -= cost;
  rebirth.perks[k]++;
  beep(660, 0.08, 0.06, 'triangle', 'shop');
  setTimeout(() => beep(1320, 0.12, 0.06, 'triangle', 'shop'), 80);
  renderShop();
  saveGame();
}
// 重新開始：清空檯面、錢、升級。還沒進輪迴點商店就先拿點數（測試會直接叫這個）
function doRebirth() {
  if (!rebirth.shopping) {
    const n = rebirthPending();
    if (!n) return;
    rebirth.points += n;
    rebirth.count++;
    rebirth.gained = n;
  }
  const n = rebirth.gained;
  rebirth.shopping = false;
  // 清空檯面、錢、升級，照開新遊戲的樣子重新鋪幣
  while (coins.length) removeCoin(coins.length - 1);
  while (dolls.length) removeDoll(dolls.length - 1);
  dollQueue.length = 0;
  while (props.length) removeProp(props.length - 1);
  while (treasures.length) removeTreasure(treasures.length - 1);
  for (const k of UPGRADE_KEYS) upgrades[k] = 0;
  for (const k of ['refill', 'dropRate', 'speed']) upgrades[k] = Math.min(perkLv('headStart'), UPGRADES[k].prices.length);
  wallet = START_WALLET + PERK_MONEY[perkLv('startMoney')];
  won = 0;
  lost = 0;
  earnCarry = 0;
  rainQueue = 0;
  refillTimer = 0;
  windTime = quakeTime = reachExtra = 0;
  reachQueued = false;
  itemQueue.length = 0;
  itemGap = 0;
  shakeTime = shakeCd = 0;
  rainCd = 0;
  summonCd = 0;
  feverGauge = 0;
  if (feverTime > 0) { feverTime = 0; endFever(); }
  prefill();
  buildGuards();
  setAuto(false);
  rebirthArmed = 0;
  shopTab = 'up';
  document.body.classList.remove('rebirthing');
  shopEl.classList.remove('show');
  renderShop();
  saveGame();
  return n;
}

// 轉生動畫（納可定）：蓋上一層「轉生中……」，天使史萊姆跳幾下、轉一圈；
// 蓋滿的時候偷偷換好新檯面，動畫結束再淡出，看到的就是輪迴後的新檯面
const rebornEl = document.getElementById('reborn');
let rebornView = null;
let rebornBusy = false;
const REBORN_TIME = 4.2;     // 整段動畫幾秒
function rebirthWithAnim() {
  if (rebornBusy || (!rebirth.shopping && !rebirthPending())) return;
  rebornBusy = true;
  shopEl.classList.remove('show');
  setAuto(false);
  pointerDown = false;
  if (!rebornView) {
    rebornView = makeMiniView(document.getElementById('rebornCanvas'), false);
    rebornView.cam.position.set(0, 1.3, 3.9);
    rebornView.cam.lookAt(0, 0.62, 0);
  }
  if (rebornView.mesh) rebornView.sc.remove(rebornView.mesh);
  rebornView.mesh = makeSlimeMesh(SPARE_SKINS.angel, 1, quality !== 'low');
  rebornView.sc.add(rebornView.mesh);
  rebornEl.classList.remove('out');
  rebornEl.classList.add('show');
  [523, 659, 784, 1047, 1319].forEach((f, k) => setTimeout(() => beep(f, 0.22, 0.06, 'triangle', 'shop'), 300 + k * 140));
  let got = 0;
  let swapped = false;
  const t0 = performance.now();
  const loop = (now) => {
    const t = window.__rebornT ?? (now - t0) / 1000; // __rebornT：測試用，讓動畫停在某一秒拍照
    // 蓋滿了（淡入 0.5 秒）才換檯面
    if (!swapped && t > 0.6) { swapped = true; got = doRebirth(); }
    animateAngel(rebornView.mesh, t);
    miniRender(rebornView, rebornView.mesh.rotation.y, now);
    if (t < REBORN_TIME) { requestAnimationFrame(loop); return; }
    rebornEl.classList.add('out');
    setTimeout(() => { rebornEl.classList.remove('show', 'out'); rebornBusy = false; }, 600);
    bump(walletEl);
    toast(`轉生完成！拿到 ${got} 點輪迴點`);
    [784, 1047, 1319].forEach((f, k) => setTimeout(() => beep(f, 0.18, 0.06, 'triangle', 'shop'), k * 90));
  };
  requestAnimationFrame(loop);
}
// 天使：前 2.4 秒跳三下（落地時壓扁一點），之後往上飄、轉一整圈，再落回來
function animateAngel(m, t) {
  let y = 0;
  let sq = 1;
  let yaw = 0;
  if (t < 2.4) {
    const k = (t % 0.8) / 0.8;               // 每一下 0.8 秒
    y = Math.sin(k * Math.PI) * 0.38;
    const land = Math.max(0, 1 - Math.min(k, 1 - k) / 0.12); // 剛落地、剛起跳的那一下壓扁
    sq = 1 - land * 0.18;
    yaw = Math.sin(t * 2.4) * 0.35;          // 跳的時候左右晃一點
  } else {
    const k = Math.min(1, (t - 2.4) / 1.5);
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    y = Math.sin(k * Math.PI) * 0.3;
    yaw = e * Math.PI * 2;
  }
  m.position.y = y;
  m.scale.set(1 + (1 - sq) * 0.6, sq, 1 + (1 - sq) * 0.6);
  m.rotation.y = yaw;
}


// ----------
  const t = e.target.closest('button[data-shoptab]');
  if (t) { shopTab = t.dataset.shoptab; rebirthArmed = 0; renderShop(); }
  const pk = e.target.closest('button[data-perk]');
  if (pk) buyPerk(pk.dataset.perk);
  if (e.target.closest('#rebornGo')) { rebirthWithAnim(); return; }
  if (e.target.closest('#rebirthGo')) {
    if (rebirthArmed) { clearTimeout(rebirthArmed); rebirthArmed = 0; enterRebirthShop(); return; }
    rebirthArmed = setTimeout(() => { rebirthArmed = 0; if (shopTab === 'rebirth') renderShop(); }, 3000);
    renderShop();
  }

// ----------
  rebirth.points = Math.max(0, Math.floor(Number(d.rebirth?.points) || 0));
  rebirth.count = Math.max(0, Math.floor(Number(d.rebirth?.count) || 0));
  rebirth.shopping = !!d.rebirth?.shopping;
  rebirth.gained = Math.max(0, Math.floor(Number(d.rebirth?.gained) || 0));
  for (const k of PERK_KEYS) rebirth.perks[k] = Math.min(PERKS[k].costs.length, Math.max(0, Math.floor(Number(d.rebirth?.perks?.[k]) || 0)));
  // 輪迴點商店的「小寶物」搬到一般商店（2026-10-16）：買過的點數退回
  rebirth.points += Math.max(0, Math.floor(Number(d.rebirth?.perks?.gems) || 0));

// ----------
  if (rebirth.shopping) acc = 0; // 輪迴點商店開著的時候機台停著

// ----------
  { id: 'rebirth', when: () => rebirthPending() >= 1, text: '可以輪迴了！看看「商店」的「輪迴」分頁', dur: 12 },
