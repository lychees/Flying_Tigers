/**
 * Flying Tigers TBS - Game Engine
 * 飞虎队战棋游戏 - 游戏引擎
 */

'use strict';

// ==================== Game State ====================
const TILE_SIZE = 40;
const game = {
  state: 'title',
  canvas: null,
  ctx: null,
  width: 0,
  height: 0,
  missionIndex: 0,
  funds: 1500,
  pilots: [],
  aircraftStock: {}, // keyed by pilot id -> aircraft data
  currentMission: null,
  map: [],
  units: [],
  turn: 'player',
  turnCount: 1,
  selectedUnit: null,
  hoveredCell: null,
  moveRange: [],
  attackRange: [],
  tempPath: [],
  messageLog: [],
  storyLines: [],
  storyIndex: 0,
  prepTab: 'hangar',
  selectedPilotId: null,
  animating: false,
  lastClickTime: 0,
};

// ==================== Utility Functions ====================
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function manhattan(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
function dist(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
function rnd(n) { return Math.floor(Math.random() * n); }
function chance(p) { return Math.random() * 100 < p; }

function addMessage(msg) {
  game.messageLog.unshift(msg);
  if (game.messageLog.length > 50) game.messageLog.pop();
  renderMessages();
}

function clonePilot(p) {
  const np = JSON.parse(JSON.stringify(p));
  np.hitBonus = 0; np.critBonus = 0; np.evaBonus = 0; np.defBonus = 0;
  // Apply skills
  for (const sid of np.skills) {
    if (SKILLS[sid]) SKILLS[sid].effect(np);
  }
  return np;
}

function getAircraft(pilot) {
  return game.aircraftStock[pilot.id] || AIRCRAFT[pilot.aircraft];
}

// ==================== Initialization ====================
function init() {
  game.canvas = document.getElementById('gameCanvas');
  game.ctx = game.canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // UI event bindings
  document.getElementById('btn-start').addEventListener('click', startGame);
  document.getElementById('btn-continue').addEventListener('click', loadGame);
  document.getElementById('btn-story-next').addEventListener('click', advanceStory);
  document.getElementById('btn-prep-start').addEventListener('click', startCurrentMission);
  document.getElementById('btn-prep-hangar').addEventListener('click', () => switchPrepTab('hangar'));
  document.getElementById('btn-prep-pilots').addEventListener('click', () => switchPrepTab('pilots'));
  document.getElementById('btn-prep-briefing').addEventListener('click', () => switchPrepTab('briefing'));
  document.getElementById('btn-end-turn').addEventListener('click', endPlayerTurn);
  document.getElementById('btn-menu').addEventListener('click', openMenu);
  document.getElementById('btn-restart').addEventListener('click', startGame);
  document.getElementById('btn-back-title').addEventListener('click', showTitle);
  document.getElementById('btn-save').addEventListener('click', saveGame);
  document.getElementById('btn-load').addEventListener('click', loadGame);
  document.getElementById('btn-close-menu').addEventListener('click', closeMenu);
  document.getElementById('btn-victory-next').addEventListener('click', onVictoryNext);
  document.getElementById('btn-defeat-retry').addEventListener('click', restartMission);
  document.getElementById('btn-defeat-prep').addEventListener('click', showPrepScreen);

  game.canvas.addEventListener('mousemove', handleMouseMove);
  game.canvas.addEventListener('click', handleClick);
  game.canvas.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('keydown', handleKey);

  game.pilots = createPilots();
  initAircraftStock();
  showTitle();
  requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
  game.width = window.innerWidth;
  game.height = window.innerHeight;
  game.canvas.width = game.width;
  game.canvas.height = game.height;
}

function initAircraftStock() {
  game.aircraftStock = {};
  for (const p of game.pilots) {
    game.aircraftStock[p.id] = clone(AIRCRAFT[p.aircraft]);
  }
}

// ==================== Screen Management ====================
function hideAllScreens() {
  const screens = ['title-screen','story-screen','prep-screen','mission-ui','menu-overlay','victory-screen','defeat-screen'];
  for (const id of screens) document.getElementById(id).classList.add('hidden');
}

function showTitle() {
  hideAllScreens();
  game.state = 'title';
  document.getElementById('title-screen').classList.remove('hidden');
}

function startGame() {
  game.missionIndex = 0;
  game.funds = 1500;
  game.pilots = createPilots();
  initAircraftStock();
  startStory(MISSIONS[0].intro);
}

function startStory(lines) {
  hideAllScreens();
  game.state = 'story';
  game.storyLines = lines;
  game.storyIndex = 0;
  document.getElementById('story-screen').classList.remove('hidden');
  updateStoryText();
}

function updateStoryText() {
  const el = document.getElementById('story-text');
  el.innerHTML = game.storyLines.map((l,i) =>
    `<p class="${i === game.storyIndex ? 'active' : (i < game.storyIndex ? 'seen' : 'future')}">${l}</p>`
  ).join('');
  const active = el.querySelector('.active');
  if (active) active.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const btn = document.getElementById('btn-story-next');
  btn.textContent = game.storyIndex >= game.storyLines.length - 1 ? '进入整备' : '下一段';
}

function advanceStory() {
  game.storyIndex++;
  if (game.storyIndex >= game.storyLines.length) {
    showPrepScreen();
  } else {
    updateStoryText();
  }
}

function showPrepScreen() {
  hideAllScreens();
  game.state = 'prep';
  document.getElementById('prep-screen').classList.remove('hidden');
  updatePrepResources();
  switchPrepTab(game.prepTab || 'hangar');
}

function updatePrepResources() {
  document.getElementById('prep-funds').textContent = game.funds;
  document.getElementById('prep-mission').textContent = MISSIONS[game.missionIndex].name;
  document.getElementById('prep-location').textContent = MISSIONS[game.missionIndex].location;
}

function switchPrepTab(tab) {
  game.prepTab = tab;
  document.querySelectorAll('.prep-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-prep-' + tab).classList.add('active');
  if (tab === 'hangar') renderHangar();
  else if (tab === 'pilots') renderPilots();
  else if (tab === 'briefing') renderBriefing();
}

// ==================== Hangar ====================
function renderHangar() {
  const container = document.getElementById('prep-content');
  let html = '<div class="hangar">';
  html += '<h3>格纳库 / Hangar</h3><p>选择飞行员与座机进行升级、维修与装备调整。</p>';
  html += '<div class="pilot-select">';
  for (const p of game.pilots) {
    const ac = getAircraft(p);
    const cls = p.id === game.selectedPilotId ? 'selected' : '';
    html += `<div class="pilot-card ${cls}" data-id="${p.id}">`;
    html += `<strong>${p.name} "${p.callsign}"</strong><br>`;
    html += `Lv.${p.lv} ${PILOT_CLASSES[p.cls].name}<br>`;
    html += `座机: ${ac.name}<br>`;
    html += `HP: ${p.hp}/${p.maxHp}`;
    html += '</div>';
  }
  html += '</div>';

  if (game.selectedPilotId) {
    const p = game.pilots.find(x => x.id === game.selectedPilotId);
    const ac = getAircraft(p);
    html += '<div class="hangar-detail">';
    html += `<h4>${p.name} - ${ac.name}</h4>`;
    html += `<p>${ac.desc}</p>`;
    html += `<div class="stats"><span>HP</span> ${p.maxHp} <span>攻击</span> ${p.attack} <span>防御</span> ${p.defense} <span>技巧</span> ${p.skill}</div>`;
    html += `<div class="stats"><span>机动</span> ${ac.move} <span>装甲</span> ${ac.armor} <span>引擎</span> ${ac.engine} <span>回避</span> ${ac.eva}</div>`;
    html += '<div class="upgrades">';
    html += upgradeRow(p, ac, 'armor', '装甲强化', '提升飞机防御与最大HP');
    html += upgradeRow(p, ac, 'engine', '引擎改造', '提升移动力与回避');
    html += upgradeRow(p, ac, 'weapon', '武器改良', '提升攻击力');
    html += '</div>';
    const repairNeed = p.maxHp - p.hp;
    const repairCost = repairNeed * REPAIR_COST;
    html += `<div class="repair"><button id="btn-repair" ${repairNeed<=0 || game.funds<repairCost?'disabled':''}>维修 (${repairCost}$)</button> 需要维修: ${repairNeed} HP</div>`;
    html += '</div>';
  }
  html += '</div>';
  container.innerHTML = html;

  container.querySelectorAll('.pilot-card').forEach(c => {
    c.addEventListener('click', () => { game.selectedPilotId = c.dataset.id; renderHangar(); });
  });
  const repairBtn = document.getElementById('btn-repair');
  if (repairBtn) repairBtn.addEventListener('click', repairSelectedPilot);
  bindUpgradeButtons(p => renderHangar());
}

function upgradeRow(p, ac, key, label, desc) {
  const lv = ac.upgrades[key];
  const max = UPGRADE_COSTS[key].length;
  const cost = lv < max ? UPGRADE_COSTS[key][lv] : null;
  const disabled = cost === null || game.funds < cost;
  return `
    <div class="upgrade-row">
      <span>${label}</span>
      <span class="lv">Lv.${lv}/${max}</span>
      <span class="desc">${desc}</span>
      <button class="btn-upgrade" data-key="${key}" ${disabled?'disabled':''}>${cost!==null?cost+'$':'MAX'}</button>
    </div>`;
}

function bindUpgradeButtons(callback) {
  document.querySelectorAll('.btn-upgrade').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = game.pilots.find(x => x.id === game.selectedPilotId);
      const ac = getAircraft(p);
      const key = btn.dataset.key;
      const lv = ac.upgrades[key];
      const cost = UPGRADE_COSTS[key][lv];
      if (cost && game.funds >= cost) {
        game.funds -= cost;
        ac.upgrades[key]++;
        applyUpgrade(p, ac, key);
        addMessage(`${p.name} 升级了 ${key === 'armor' ? '装甲' : key === 'engine' ? '引擎' : '武器'}`);
        updatePrepResources();
        callback();
      }
    });
  });
}

function applyUpgrade(p, ac, key) {
  if (key === 'armor') {
    ac.armor += 3;
    const hpInc = 10;
    ac.maxHp += hpInc;
    p.maxHp += hpInc;
    p.hp += hpInc;
  } else if (key === 'engine') {
    ac.engine += 2;
    ac.eva += 2;
    if (ac.upgrades.engine % 2 === 0) ac.move += 1;
  } else if (key === 'weapon') {
    p.attack += 3;
  }
}

function repairSelectedPilot() {
  const p = game.pilots.find(x => x.id === game.selectedPilotId);
  if (!p) return;
  const need = p.maxHp - p.hp;
  const cost = need * REPAIR_COST;
  if (need > 0 && game.funds >= cost) {
    game.funds -= cost;
    p.hp = p.maxHp;
    addMessage(`${p.name} 座机维修完成`);
    updatePrepResources();
    renderHangar();
  }
}

// ==================== Pilots Roster ====================
function renderPilots() {
  const container = document.getElementById('prep-content');
  let html = '<div class="pilots"><h3>驾驶员名册 / Pilots</h3>';
  for (const p of game.pilots) {
    const pc = PILOT_CLASSES[p.cls];
    html += `<div class="pilot-detail-card">`;
    html += `<h4>${p.name} "${p.callsign}" <small>Lv.${p.lv} ${pc.name}</small></h4>`;
    html += `<p>${p.bio}</p>`;
    html += `<div class="stats">`;
    html += `<span>HP</span> ${p.hp}/${p.maxHp} `;
    html += `<span>攻击</span> ${p.attack} `;
    html += `<span>防御</span> ${p.defense} `;
    html += `<span>技巧</span> ${p.skill} `;
    html += `<span>士气</span> ${p.morale}`;
    html += `</div>`;
    html += `<div>技能: ${p.skills.map(s => SKILLS[s].name).join(', ') || '无'}</div>`;
    html += `<div class="xp-bar"><div style="width:${(p.xp/p.nextXp*100).toFixed(1)}%"></div></div>`;
    html += `<small>XP: ${p.xp}/${p.nextXp} | 成长: 攻击${pc.growth.attack.toFixed(1)} 技巧${pc.growth.skill.toFixed(1)} 防御${pc.growth.defense.toFixed(1)}</small>`;
    html += `</div>`;
  }
  html += '</div>';
  container.innerHTML = html;
}

function renderBriefing() {
  const m = MISSIONS[game.missionIndex];
  const objText = {
    defeat_all: '击落所有敌机',
    protect: '保护目标直到回合结束或消灭所有敌机',
    defeat_bombers: '击落所有轰炸机',
    destroy_targets: '摧毁所有地面目标',
  };
  const container = document.getElementById('prep-content');
  container.innerHTML = `
    <div class="briefing">
      <h3>任务简报 / Briefing</h3>
      <h4>${m.name}</h4>
      <p><strong>地点:</strong> ${m.location}</p>
      <p><strong>目标:</strong> ${objText[m.objective]}</p>
      <p><strong>回合限制:</strong> ${m.turns}</p>
      <p><strong>出击上限:</strong> ${m.allowedUnits} 机</p>
      <p><strong>报酬:</strong> ${m.reward.funds}$ / 全体经验 ${m.reward.xp}</p>
      <p>${m.intro.join('</p><p>')}</p>
    </div>`;
}

// ==================== Mission Start ====================
function startCurrentMission() {
  const m = MISSIONS[game.missionIndex];
  game.currentMission = clone(m);
  generateMap(m.mapWidth, m.mapHeight, m.terrainSeed);
  game.units = [];
  game.turn = 'player';
  game.turnCount = 1;
  game.selectedUnit = null;
  game.moveRange = [];
  game.attackRange = [];
  game.messageLog = [];

  // Spawn player units up to allowed
  const selected = game.pilots.slice(0, m.allowedUnits);
  for (let i = 0; i < selected.length && i < m.playerSpawns.length; i++) {
    const pilot = clonePilot(selected[i]);
    const spawn = m.playerSpawns[i];
    game.units.push(createPlayerUnit(pilot, spawn.x, spawn.y));
  }

  // Spawn enemies
  for (const e of m.enemies) {
    game.units.push(createEnemyUnit(e.type, e.x, e.y, e.lv));
  }

  // Spawn protect target if needed
  if (m.objective === 'protect' && m.protectTarget) {
    game.protectTarget = { ...m.protectTarget, side: 'neutral', x: m.protectTarget.x, y: m.protectTarget.y };
  } else {
    game.protectTarget = null;
  }

  // Spawn ground targets if needed
  if (m.objective === 'destroy_targets' && m.targets) {
    game.destroyTargets = m.targets.map(t => ({ ...t, side: 'neutral', x: t.x, y: t.y }));
  } else {
    game.destroyTargets = [];
  }

  hideAllScreens();
  game.state = 'mission';
  document.getElementById('mission-ui').classList.remove('hidden');
  addMessage(`任务开始: ${m.name}`);
  addMessage(`目标: ${getObjectiveText(m.objective)}`);
  updateMissionUI();
}

function getObjectiveText(obj) {
  return { defeat_all: '全灭敌机', protect: '保护目标', defeat_bombers: '击落轰炸机', destroy_targets: '摧毁地面目标' }[obj];
}

function restartMission() {
  hideAllScreens();
  startCurrentMission();
}

// ==================== Map Generation ====================
function generateMap(w, h, seed) {
  game.map = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      let type = 'sky';
      if (seed === 'training') {
        if (y === 0 || y === h-1 || x === 0 || x === w-1) type = 'mountain';
        if ((x+y)%5 === 0) type = 'cloud';
      } else if (seed === 'kunming') {
        if (x < 3) type = 'base';
        else if ((x*x + y*y) % 11 === 0) type = 'cloud';
        else if (x > w-3) type = 'mountain';
      } else if (seed === 'rangoon') {
        if (x < 4 && y > 3 && y < 8) type = 'base';
        else if ((x+y)%6 === 0) type = 'cloud';
        else if (y < 2 || y > h-3) type = 'valley';
      } else if (seed === 'magwe') {
        if (x < 5 && y > 4 && y < 9) type = 'base';
        else if ((x*y)%7 === 0) type = 'cloud';
        else if (x > w-4) type = 'mountain';
      } else if (seed === 'salween') {
        if (x > 5 && x < 9 && y%3 !== 0) type = 'valley';
        if (x > 10 && (x+y)%5 === 0) type = 'mountain';
        if ((x+y)%7 === 0) type = 'cloud';
      } else if (seed === 'hengyang') {
        if (x < 4 && y > 4 && y < 10) type = 'base';
        else if ((x+y)%4 === 0) type = 'cloud';
        else if (y === 0 || y === h-1) type = 'mountain';
      }
      row.push({ x, y, type, ...TERRAIN[type] });
    }
    game.map.push(row);
  }
}

function getCell(x, y) {
  if (y < 0 || y >= game.map.length) return null;
  if (x < 0 || x >= game.map[0].length) return null;
  return game.map[y][x];
}

function getUnitAt(x, y) {
  return game.units.find(u => u.x === x && u.y === y && u.hp > 0);
}

function getGroundTargetAt(x, y) {
  if (game.currentMission.objective === 'destroy_targets') {
    const t = game.destroyTargets.find(t => t.x === x && t.y === y && t.hp > 0);
    if (t) return t;
  }
  if (game.currentMission.objective === 'protect' && game.protectTarget) {
    if (game.protectTarget.x === x && game.protectTarget.y === y && game.protectTarget.hp > 0) {
      return game.protectTarget;
    }
  }
  return null;
}

function isTargetEnemy(target) {
  if (!target) return false;
  if (target.side === 'neutral') return true; // ground/protect targets are mission targets
  return target.side !== 'player';
}

// ==================== Unit Creation ====================
function createPlayerUnit(pilot, x, y) {
  const ac = getAircraft(pilot);
  const weapons = ac.weapons.map(wid => ({ ...WEAPONS[wid], currentAmmo: WEAPONS[wid].ammo }));
  return {
    id: 'u_' + Math.random().toString(36).substr(2, 8),
    side: 'player',
    pilot,
    aircraft: ac,
    x, y,
    moved: false,
    acted: false,
    hp: pilot.hp,
    maxHp: pilot.maxHp,
    attack: pilot.attack,
    defense: pilot.defense + ac.armor + (pilot.defBonus || 0),
    skill: pilot.skill,
    evasion: ac.eva + pilot.skill / 4 + (pilot.evaBonus || 0),
    move: ac.move,
    weapons,
    facing: 1,
    exp: 0,
  };
}

function createEnemyUnit(typeId, x, y, lv) {
  const base = ENEMY_AIRCRAFT[typeId];
  const ac = clone(base);
  const scale = 1 + (lv - 1) * 0.15;
  ac.maxHp = Math.floor(ac.maxHp * scale);
  ac.hp = ac.maxHp;
  ac.armor = Math.floor(ac.armor * scale);
  ac.engine = Math.floor(ac.engine * scale);
  const attack = Math.floor((ac.engine + ac.armor) * scale);
  const skill = Math.floor((ac.eva + ac.engine) * scale);
  const weapons = ac.weapons.map(wid => ({ ...WEAPONS[wid], currentAmmo: WEAPONS[wid].ammo }));
  return {
    id: 'e_' + Math.random().toString(36).substr(2, 8),
    side: 'enemy',
    pilot: { name: ac.name, callsign: '日军', cls: 'rookie', lv, skills: [] },
    aircraft: ac,
    x, y,
    moved: false,
    acted: false,
    hp: ac.hp,
    maxHp: ac.maxHp,
    attack,
    defense: ac.armor,
    skill,
    evasion: ac.eva + skill / 5,
    move: ac.move,
    weapons,
    facing: -1,
    exp: lv * 20 + 10,
  };
}

// ==================== Pathfinding / Range ====================
function computeMoveRange(unit) {
  const range = [];
  const visited = new Map();
  const start = { x: unit.x, y: unit.y, cost: 0 };
  const queue = [start];
  visited.set(key(start.x, start.y), 0);

  while (queue.length) {
    const cur = queue.shift();
    if (cur.cost > 0) range.push(cur);
    if (cur.cost >= unit.move) continue;
    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx, ny = cur.y + dy;
      const cell = getCell(nx, ny);
      if (!cell) continue;
      const moveCost = cell.move;
      if (moveCost > 2) continue; // impassable-ish
      const newCost = cur.cost + moveCost;
      if (newCost > unit.move) continue;
      const occupant = getUnitAt(nx, ny);
      if (occupant && occupant.side === unit.side && occupant !== unit) {
        // friendly pass-through allowed only if not ending there
        if (!visited.has(key(nx, ny)) || visited.get(key(nx, ny)) > newCost) {
          visited.set(key(nx, ny), newCost);
          queue.push({ x: nx, y: ny, cost: newCost });
        }
        continue;
      }
      if (occupant) continue; // enemy blocks movement
      if (!visited.has(key(nx, ny)) || visited.get(key(nx, ny)) > newCost) {
        visited.set(key(nx, ny), newCost);
        queue.push({ x: nx, y: ny, cost: newCost });
      }
    }
  }
  return range;
}

function computeAttackRange(unit, fromX, fromY, weaponIndex = 0) {
  const weapon = unit.weapons[weaponIndex] || unit.weapons[0];
  if (!weapon) return [];
  const range = weapon.range;
  const cells = [];
  for (let dy = -range; dy <= range; dy++) {
    for (let dx = -range; dx <= range; dx++) {
      if (Math.abs(dx) + Math.abs(dy) > range || (dx === 0 && dy === 0)) continue;
      const nx = fromX + dx, ny = fromY + dy;
      const cell = getCell(nx, ny);
      if (cell) cells.push({ x: nx, y: ny });
    }
  }
  return cells;
}

function key(x, y) { return `${x},${y}`; }

function getMovePath(unit, tx, ty) {
  // BFS to find shortest path
  const visited = new Map();
  visited.set(key(unit.x, unit.y), null);
  const queue = [{ x: unit.x, y: unit.y }];
  while (queue.length) {
    const cur = queue.shift();
    if (cur.x === tx && cur.y === ty) {
      const path = [];
      let node = key(cur.x, cur.y);
      while (visited.get(node)) {
        path.unshift(visited.get(node));
        node = key(visited.get(node).x, visited.get(node).y);
      }
      return path;
    }
    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx, ny = cur.y + dy;
      const cell = getCell(nx, ny);
      if (!cell || cell.move > 2) continue;
      if (getUnitAt(nx, ny) && !(nx === tx && ny === ty)) continue;
      if (visited.has(key(nx, ny))) continue;
      visited.set(key(nx, ny), cur);
      queue.push({ x: nx, y: ny });
    }
  }
  return [];
}

// ==================== Combat ====================
function canAttackTarget(attacker, target) {
  if (target.hp <= 0) return false;
  if (target.side === attacker.side) return false;
  const dist = Math.abs(attacker.x - target.x) + Math.abs(attacker.y - target.y);
  const weapon = attacker.weapons[0];
  return weapon && dist <= weapon.range && weapon.currentAmmo > 0;
}

function attackUnit(attacker, target, weaponIndex = 0) {
  const weapon = attacker.weapons[weaponIndex];
  if (!weapon || weapon.currentAmmo <= 0) return;
  if (attacker.acted) return;

  weapon.currentAmmo--;
  attacker.acted = true;

  const dist = Math.abs(attacker.x - target.x) + Math.abs(attacker.y - target.y);
  if (dist > weapon.range) return;

  // Hit calculation
  const terrain = getCell(target.x, target.y);
  const hitBase = weapon.hit + attacker.skill * 0.5 - target.evasion - (terrain ? terrain.eva : 0);
  const hit = clamp(hitBase + (attacker.pilot.hitBonus || 0), 10, 99);
  const crit = weapon.crit + (attacker.pilot.critBonus || 0) + (attacker.skill - target.skill) * 0.2;

  if (!chance(hit)) {
    addMessage(`${attacker.pilot.name} 攻击 ${target.pilot.name} 未命中!`);
    return;
  }

  // Damage
  let dmg = weapon.power + attacker.attack - target.defense;
  if (chance(crit)) {
    dmg = Math.floor(dmg * 1.5);
    addMessage(`暴击! ${attacker.pilot.name} 对 ${target.pilot.name} 造成 ${dmg} 伤害!`);
  } else {
    dmg = Math.floor(dmg * (0.9 + Math.random() * 0.2));
    addMessage(`${attacker.pilot.name} 攻击 ${target.pilot.name} 造成 ${dmg} 伤害`);
  }
  if (dmg < 1) dmg = 1;
  target.hp -= dmg;

  if (target.hp <= 0) {
    target.hp = 0;
    addMessage(`${target.pilot.name} 被击落!`);
    if (attacker.side === 'player') {
      attacker.pilot.xp += target.exp || 20;
      addMessage(`${attacker.pilot.name} 获得 ${target.exp || 20} 经验值`);
      checkLevelUp(attacker.pilot);
    }
  }
  updateMissionUI();
  checkMissionEnd();
}

function attackGroundTarget(attacker, target) {
  const weapon = attacker.weapons[0];
  if (!weapon || weapon.currentAmmo <= 0 || attacker.acted) return;
  attacker.acted = true;
  weapon.currentAmmo--;

  const hit = clamp(weapon.hit + attacker.skill * 0.5 + (attacker.pilot.hitBonus || 0), 30, 99);
  if (!chance(hit)) {
    addMessage(`${attacker.pilot.name} 轰炸 ${target.name} 未命中!`);
    updateMissionUI();
    return;
  }

  let dmg = weapon.power + attacker.attack * 1.5;
  if (weapon.type === 'bomb' || weapon.type === 'rocket') dmg *= 1.5;
  dmg = Math.floor(dmg * (0.9 + Math.random() * 0.2));
  if (dmg < 1) dmg = 1;
  target.hp -= dmg;
  addMessage(`${attacker.pilot.name} 轰炸 ${target.name} 造成 ${dmg} 伤害`);

  if (target.hp <= 0) {
    target.hp = 0;
    addMessage(`${target.name} 被摧毁!`);
    attacker.pilot.xp += 40;
    checkLevelUp(attacker.pilot);
  }
  updateMissionUI();
  checkMissionEnd();
}

function checkLevelUp(pilot) {
  while (pilot.xp >= pilot.nextXp) {
    pilot.xp -= pilot.nextXp;
    pilot.lv++;
    pilot.nextXp = Math.floor(pilot.nextXp * 1.3);
    const g = PILOT_CLASSES[pilot.cls].growth;
    pilot.maxHp += Math.floor(5 * g.hp);
    pilot.hp += Math.floor(5 * g.hp);
    pilot.attack += Math.floor(2 * g.attack);
    pilot.defense += Math.floor(2 * g.defense);
    pilot.skill += Math.floor(2 * g.skill);
    addMessage(`${pilot.name} 升级到 Lv.${pilot.lv}!`);
    // Learn skill at certain levels
    if (pilot.lv === 3 && !pilot.skills.includes('marksmanship')) {
      pilot.skills.push('marksmanship');
      addMessage(`${pilot.name} 习得 神射手!`);
    }
    if (pilot.lv === 5 && !pilot.skills.includes('bullseye')) {
      pilot.skills.push('bullseye');
      addMessage(`${pilot.name} 习得 致命一击!`);
    }
  }
}

// ==================== Turn Management ====================
function endPlayerTurn() {
  if (game.turn !== 'player') return;
  game.turn = 'enemy';
  game.selectedUnit = null;
  game.moveRange = [];
  game.attackRange = [];
  addMessage('--- 敌方回合 ---');
  setTimeout(enemyTurn, 500);
}

function resetTurnFlags(side) {
  for (const u of game.units) {
    if (u.side === side && u.hp > 0) {
      u.moved = false;
      u.acted = false;
    }
  }
}

function enemyTurn() {
  resetTurnFlags('enemy');
  const enemies = game.units.filter(u => u.side === 'enemy' && u.hp > 0);
  let index = 0;
  function step() {
    if (game.state !== 'mission') return;
    if (index >= enemies.length) {
      game.turn = 'player';
      game.turnCount++;
      resetTurnFlags('player');
      addMessage(`--- 第 ${game.turnCount} 回合 / 玩家回合 ---`);
      updateMissionUI();
      checkMissionEnd();
      return;
    }
    const u = enemies[index++];
    runEnemyAI(u);
    updateMissionUI();
    render();
    setTimeout(step, 400);
  }
  step();
}

function runEnemyAI(unit) {
  // Find nearest player unit or target
  const targets = game.units.filter(u => u.side === 'player' && u.hp > 0);
  if (targets.length === 0) return;

  // Prioritize protect target if protect mission
  if (game.currentMission.objective === 'protect' && game.protectTarget) {
    const t = game.protectTarget;
    const d = dist(unit, t);
    if (d <= 1) {
      // Attack target
      game.protectTarget.hp -= Math.max(1, unit.attack - 10);
      addMessage(`${unit.pilot.name} 攻击 ${t.name}! 设施受损!`);
      if (game.protectTarget.hp <= 0) game.protectTarget.hp = 0;
      unit.acted = true;
      checkMissionEnd();
      return;
    }
    moveToward(unit, t.x, t.y);
    if (!unit.acted && dist(unit, t) <= 1) {
      game.protectTarget.hp -= Math.max(1, unit.attack - 10);
      addMessage(`${unit.pilot.name} 攻击 ${t.name}! 设施受损!`);
      if (game.protectTarget.hp <= 0) game.protectTarget.hp = 0;
      unit.acted = true;
      checkMissionEnd();
    }
    return;
  }

  // Standard: attack nearest player
  targets.sort((a, b) => dist(unit, a) - dist(unit, b));
  const target = targets[0];
  const distNow = dist(unit, target);

  if (distNow <= 1) {
    attackUnit(unit, target, 0);
    return;
  }

  // Move toward target
  moveToward(unit, target.x, target.y);

  // Attack if now in range
  if (!unit.acted && dist(unit, target) <= 1) {
    attackUnit(unit, target, 0);
  }
}

function moveToward(unit, tx, ty) {
  const open = [];
  const visited = new Set();
  open.push({ x: unit.x, y: unit.y, path: [], cost: 0 });
  visited.add(key(unit.x, unit.y));
  let best = null;

  while (open.length) {
    const cur = open.shift();
    const d = dist(cur, { x: tx, y: ty });
    if (!best || d < dist(best, { x: tx, y: ty })) best = cur;
    if (cur.cost >= unit.move) continue;

    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx, ny = cur.y + dy;
      const cell = getCell(nx, ny);
      if (!cell || cell.move > 2) continue;
      const occupant = getUnitAt(nx, ny);
      if (occupant && occupant !== unit) continue;
      const k = key(nx, ny);
      if (visited.has(k)) continue;
      visited.add(k);
      open.push({ x: nx, y: ny, path: [...cur.path, { x: nx, y: ny }], cost: cur.cost + cell.move });
    }
  }

  if (best && best.path.length > 0) {
    // Move as far as possible along path
    let steps = 0;
    let cost = 0;
    for (const p of best.path) {
      const cell = getCell(p.x, p.y);
      cost += cell.move;
      if (cost > unit.move) break;
      steps++;
    }
    const dest = best.path[steps - 1];
    if (dest && !getUnitAt(dest.x, dest.y)) {
      unit.x = dest.x;
      unit.y = dest.y;
      unit.moved = true;
    }
  }
}

// ==================== Mission End ====================
function checkMissionEnd() {
  const m = game.currentMission;
  if (!m) return;
  const aliveEnemies = game.units.filter(u => u.side === 'enemy' && u.hp > 0);
  const alivePlayers = game.units.filter(u => u.side === 'player' && u.hp > 0);

  let victory = false;
  let defeat = false;

  if (alivePlayers.length === 0) defeat = true;

  if (m.objective === 'defeat_all') {
    if (aliveEnemies.length === 0) victory = true;
  } else if (m.objective === 'protect') {
    if (game.protectTarget && game.protectTarget.hp <= 0) defeat = true;
    else if (aliveEnemies.length === 0) victory = true;
    else if (game.turnCount >= m.turns && game.protectTarget.hp > 0) victory = true;
  } else if (m.objective === 'defeat_bombers') {
    const bombers = aliveEnemies.filter(u => u.aircraft.id === 'ki21' || u.aircraft.id === 'ki48');
    if (bombers.length === 0) victory = true;
  } else if (m.objective === 'destroy_targets') {
    const remain = game.destroyTargets.filter(t => t.hp > 0);
    if (remain.length === 0) victory = true;
  }

  if (defeat) {
    setTimeout(() => showDefeat(), 500);
    return true;
  }
  if (victory) {
    setTimeout(() => showVictory(), 500);
    return true;
  }

  // Turn limit check
  if (game.turnCount > m.turns && game.turn === 'player') {
    if (m.objective === 'protect' && game.protectTarget.hp > 0) {
      setTimeout(() => showVictory(), 500);
    } else {
      setTimeout(() => showDefeat(), 500);
    }
    return true;
  }
  return false;
}

function syncPilotsFromUnits() {
  for (const u of game.units) {
    if (u.side !== 'player' || u.hp <= 0) continue;
    const persistent = game.pilots.find(p => p.id === u.pilot.id);
    if (!persistent) continue;
    persistent.lv = u.pilot.lv;
    persistent.xp = u.pilot.xp;
    persistent.nextXp = u.pilot.nextXp;
    persistent.maxHp = u.pilot.maxHp;
    persistent.hp = Math.min(u.pilot.maxHp, u.hp + 20); // post-mission light repair
    persistent.attack = u.pilot.attack;
    persistent.defense = u.pilot.defense;
    persistent.skill = u.pilot.skill;
    persistent.skills = [...u.pilot.skills];
  }
}

function showVictory() {
  hideAllScreens();
  game.state = 'victory';
  syncPilotsFromUnits();
  const m = MISSIONS[game.missionIndex];
  game.funds += m.reward.funds;
  for (const p of game.pilots) {
    p.xp += m.reward.xp;
    checkLevelUp(p);
  }
  const isFinal = game.missionIndex >= MISSIONS.length - 1;
  document.getElementById('victory-title').textContent = isFinal ? '战役胜利!' : '任务完成!';
  document.getElementById('victory-reward').textContent = isFinal
    ? '你完成了飞虎队的传奇战役!'
    : `获得 ${m.reward.funds}$ 资金，全体飞行员 +${m.reward.xp} 经验`;
  document.getElementById('btn-victory-next').textContent = isFinal ? '返回标题' : '下一关';
  document.getElementById('victory-screen').classList.remove('hidden');
}

function onVictoryNext() {
  if (game.missionIndex >= MISSIONS.length - 1) {
    showTitle();
    return;
  }
  game.missionIndex++;
  // Heal all pilots slightly between missions
  for (const p of game.pilots) {
    p.hp = Math.min(p.maxHp, p.hp + 20);
  }
  startStory(MISSIONS[game.missionIndex].intro);
}

function showDefeat() {
  hideAllScreens();
  game.state = 'defeat';
  document.getElementById('defeat-screen').classList.remove('hidden');
}

// ==================== Input Handling ====================
function getCellFromMouse(e) {
  const rect = game.canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  // Center map
  const mapW = game.map[0].length * TILE_SIZE;
  const mapH = game.map.length * TILE_SIZE;
  const offsetX = (game.width - mapW) / 2;
  const offsetY = (game.height - mapH) / 2;
  const x = Math.floor((mx - offsetX) / TILE_SIZE);
  const y = Math.floor((my - offsetY) / TILE_SIZE);
  return { x, y };
}

function handleMouseMove(e) {
  if (game.state !== 'mission') { game.hoveredCell = null; return; }
  const c = getCellFromMouse(e);
  if (getCell(c.x, c.y)) game.hoveredCell = c;
  else game.hoveredCell = null;
}

function handleClick(e) {
  if (game.state !== 'mission' || game.turn !== 'player' || game.animating) return;
  const c = getCellFromMouse(e);
  const cell = getCell(c.x, c.y);
  if (!cell) return;

  const clickedUnit = getUnitAt(c.x, c.y);
  const clickedGround = getGroundTargetAt(c.x, c.y);

  // If a unit is selected and we click an enemy in range -> attack
  if (game.selectedUnit && clickedUnit && clickedUnit.side !== 'player' && clickedUnit.hp > 0) {
    if (canAttackTarget(game.selectedUnit, clickedUnit)) {
      attackUnit(game.selectedUnit, clickedUnit, 0);
      clearSelection();
      return;
    }
  }

  // If a unit is selected and we click a ground target in range -> attack
  if (game.selectedUnit && clickedGround) {
    const distNow = dist(game.selectedUnit, clickedGround);
    const weapon = game.selectedUnit.weapons[0];
    if (weapon && distNow <= weapon.range && weapon.currentAmmo > 0 && !game.selectedUnit.acted) {
      attackGroundTarget(game.selectedUnit, clickedGround);
      clearSelection();
      return;
    }
  }

  // If a unit is selected and we click a valid move cell -> move
  if (game.selectedUnit && !game.selectedUnit.moved) {
    if (game.moveRange.some(r => r.x === c.x && r.y === c.y)) {
      movePlayerUnit(game.selectedUnit, c.x, c.y);
      return;
    }
  }

  // Click own unit to select
  if (clickedUnit && clickedUnit.side === 'player' && clickedUnit.hp > 0 && !clickedUnit.acted) {
    selectUnit(clickedUnit);
    return;
  }

  clearSelection();
}

function clearSelection() {
  game.selectedUnit = null;
  game.moveRange = [];
  game.attackRange = [];
}

function selectUnit(unit) {
  game.selectedUnit = unit;
  game.moveRange = unit.moved ? [] : computeMoveRange(unit);
  game.attackRange = computeAttackRange(unit, unit.x, unit.y);
  addMessage(`选中 ${unit.pilot.name}`);
}

function movePlayerUnit(unit, tx, ty) {
  const path = getMovePath(unit, tx, ty);
  if (path.length === 0) return;
  unit.x = tx;
  unit.y = ty;
  unit.moved = true;
  game.moveRange = [];
  game.attackRange = computeAttackRange(unit, tx, ty);
  addMessage(`${unit.pilot.name} 移动至 (${tx}, ${ty})`);
  updateMissionUI();
  render();
}

function handleKey(e) {
  if (game.state === 'mission' && e.key === 'Escape') {
    game.selectedUnit = null;
    game.moveRange = [];
    game.attackRange = [];
  }
  if (game.state === 'mission' && e.key === 'Enter' && game.turn === 'player') {
    endPlayerTurn();
  }
}

// ==================== Menu / Save / Load ====================
function openMenu() {
  if (game.state !== 'mission') return;
  document.getElementById('menu-overlay').classList.remove('hidden');
}
function closeMenu() {
  document.getElementById('menu-overlay').classList.add('hidden');
}
function saveGame() {
  const data = {
    missionIndex: game.missionIndex,
    funds: game.funds,
    pilots: game.pilots,
    aircraftStock: game.aircraftStock,
  };
  localStorage.setItem('flyingtigers_save', JSON.stringify(data));
  addMessage('游戏已保存');
  closeMenu();
}
function loadGame() {
  const raw = localStorage.getItem('flyingtigers_save');
  if (!raw) { addMessage('没有存档'); return; }
  const data = JSON.parse(raw);
  game.missionIndex = data.missionIndex || 0;
  game.funds = data.funds || 1500;
  game.pilots = data.pilots || createPilots();
  game.aircraftStock = data.aircraftStock || {};
  addMessage('存档已读取');
  showPrepScreen();
}

// ==================== Rendering ====================
function gameLoop() {
  if (game.state === 'mission') render();
  requestAnimationFrame(gameLoop);
}

function render() {
  const ctx = game.ctx;
  ctx.clearRect(0, 0, game.width, game.height);

  if (game.state !== 'mission') return;

  const mapW = game.map[0].length * TILE_SIZE;
  const mapH = game.map.length * TILE_SIZE;
  const offsetX = (game.width - mapW) / 2;
  const offsetY = (game.height - mapH) / 2;

  // Draw map
  for (const row of game.map) {
    for (const cell of row) {
      const x = offsetX + cell.x * TILE_SIZE;
      const y = offsetY + cell.y * TILE_SIZE;
      ctx.fillStyle = cell.color;
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
      if (cell.symbol) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(cell.symbol, x + TILE_SIZE/2, y + TILE_SIZE/2 + 5);
      }
    }
  }

  // Draw movement range
  ctx.fillStyle = 'rgba(100, 200, 255, 0.3)';
  for (const r of game.moveRange) {
    const x = offsetX + r.x * TILE_SIZE;
    const y = offsetY + r.y * TILE_SIZE;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  }

  // Draw attack range
  ctx.fillStyle = 'rgba(255, 80, 80, 0.25)';
  for (const r of game.attackRange) {
    const x = offsetX + r.x * TILE_SIZE;
    const y = offsetY + r.y * TILE_SIZE;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  }

  // Draw hovered cell
  if (game.hoveredCell) {
    const x = offsetX + game.hoveredCell.x * TILE_SIZE;
    const y = offsetY + game.hoveredCell.y * TILE_SIZE;
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    ctx.lineWidth = 1;
  }

  // Draw protect target / ground targets
  if (game.protectTarget) drawTarget(game.protectTarget, '#FFD700', offsetX, offsetY);
  for (const t of game.destroyTargets) drawTarget(t, '#FF4500', offsetX, offsetY);

  // Draw units
  for (const u of game.units) {
    if (u.hp <= 0) continue;
    drawUnit(u, offsetX, offsetY);
  }

  // Draw selection highlight
  if (game.selectedUnit) {
    const x = offsetX + game.selectedUnit.x * TILE_SIZE;
    const y = offsetY + game.selectedUnit.y * TILE_SIZE;
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    ctx.lineWidth = 1;
  }
}

function drawTarget(t, color, ox, oy) {
  const ctx = game.ctx;
  const x = ox + t.x * TILE_SIZE;
  const y = oy + t.y * TILE_SIZE;
  ctx.fillStyle = color;
  ctx.fillRect(x + 5, y + 5, TILE_SIZE - 10, TILE_SIZE - 10);
  ctx.fillStyle = '#000';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(t.name, x + TILE_SIZE/2, y + TILE_SIZE/2 + 3);
}

function drawUnit(u, ox, oy) {
  const ctx = game.ctx;
  const x = ox + u.x * TILE_SIZE;
  const y = oy + u.y * TILE_SIZE;
  const cx = x + TILE_SIZE / 2;
  const cy = y + TILE_SIZE / 2;

  // Body
  ctx.save();
  ctx.translate(cx, cy);
  if (u.side === 'enemy') ctx.scale(-1, 1);

  ctx.fillStyle = u.side === 'player' ? '#4682B4' : '#B22222';
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Wings
  ctx.fillStyle = u.side === 'player' ? '#87CEFA' : '#CD5C5C';
  ctx.fillRect(-16, -4, 32, 8);

  // Tail
  ctx.fillStyle = u.side === 'player' ? '#FFD700' : '#8B0000';
  ctx.beginPath();
  ctx.moveTo(-12, -6);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-12, 6);
  ctx.fill();

  // Shark mouth for P-40
  if (u.aircraft && u.aircraft.id && u.aircraft.id.startsWith('p40')) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(4, -3, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4, 3, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(8, 0);
    ctx.lineTo(0, 2);
    ctx.stroke();
  }

  ctx.restore();

  // HP bar
  const hpPct = u.hp / u.maxHp;
  ctx.fillStyle = '#333';
  ctx.fillRect(x + 2, y + TILE_SIZE - 6, TILE_SIZE - 4, 4);
  ctx.fillStyle = hpPct > 0.5 ? '#0f0' : hpPct > 0.25 ? '#ff0' : '#f00';
  ctx.fillRect(x + 2, y + TILE_SIZE - 6, (TILE_SIZE - 4) * hpPct, 4);

  // Name
  ctx.fillStyle = '#000';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(u.pilot.name, cx, y - 4);

  // Status icons
  if (u.moved && u.acted) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText('✓', cx, cy + 3);
  }
}

// ==================== UI Updates ====================
function updateMissionUI() {
  const m = game.currentMission;
  document.getElementById('mission-name').textContent = m.name;
  document.getElementById('mission-turn').textContent = `${game.turnCount} / ${m.turns}`;
  document.getElementById('mission-funds').textContent = game.funds;

  const objText = {
    defeat_all: '全灭敌机',
    protect: '保护 ' + (game.protectTarget ? game.protectTarget.name : '目标'),
    defeat_bombers: '击落轰炸机',
    destroy_targets: '摧毁地面目标',
  };
  document.getElementById('mission-objective').textContent = objText[m.objective];

  // Side panel unit info
  const info = document.getElementById('unit-info');
  if (game.selectedUnit) {
    const u = game.selectedUnit;
    info.innerHTML = `
      <h4>${u.pilot.name} "${u.pilot.callsign}"</h4>
      <p>${u.aircraft.name} Lv.${u.pilot.lv}</p>
      <p>HP ${u.hp}/${u.maxHp} | 攻击 ${u.attack} | 防御 ${u.defense}</p>
      <p>技巧 ${u.skill} | 回避 ${Math.floor(u.evasion)} | 移动力 ${u.move}</p>
      <p>武器: ${u.weapons.map(w => `${w.name}(${w.currentAmmo})`).join(', ')}</p>
      <p>${u.moved ? '已移动' : '可移动'} / ${u.acted ? '已攻击' : '可攻击'}</p>
    `;
  } else if (game.hoveredCell) {
    const cell = getCell(game.hoveredCell.x, game.hoveredCell.y);
    const u = getUnitAt(game.hoveredCell.x, game.hoveredCell.y);
    const gt = getGroundTargetAt(game.hoveredCell.x, game.hoveredCell.y);
    if (u) {
      info.innerHTML = `
        <h4>${u.pilot.name}</h4>
        <p>${u.aircraft.name}</p>
        <p>HP ${u.hp}/${u.maxHp} | 攻击 ${u.attack} | 防御 ${u.defense}</p>
      `;
    } else if (gt) {
      info.innerHTML = `
        <h4>${gt.name}</h4>
        <p>目标 HP ${gt.hp}/${gt.maxHp || gt.hp}</p>
        <p>点击友军单位后攻击此处</p>
      `;
    } else if (cell) {
      info.innerHTML = `
        <h4>${cell.name}</h4>
        <p>移动消耗: ${cell.move}</p>
        <p>防御加成: ${cell.def}% | 回避加成: ${cell.eva}%</p>
      `;
    }
  } else {
    info.innerHTML = '<p>选择一个单位查看详情<br>点击蓝色友机移动/攻击<br>Enter结束回合，Esc取消选择</p>';
  }
}

function renderMessages() {
  const el = document.getElementById('message-log');
  if (!el) return;
  el.innerHTML = game.messageLog.slice(0, 6).map(m => `<div>${m}</div>`).join('');
}

// ==================== Start ====================
window.addEventListener('DOMContentLoaded', init);
