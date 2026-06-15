/**
 * Flying Tigers TBS - Data Definitions
 * 飞虎队战棋游戏 - 数据定义
 */

// Terrain types: name, moveCost, defenseBonus, evasionBonus, color
const TERRAIN = {
  sky:    { name: '晴空', move: 1, def: 0,  eva: 0,  color: '#87CEEB', symbol: '' },
  cloud:  { name: '云层', move: 2, def: 5,  eva: 15, color: '#E0E0E0', symbol: '☁' },
  storm:  { name: '雷暴', move: 3, def: 0,  eva: 25, color: '#708090', symbol: '⚡' },
  mountain:{ name: '山脉', move: 3, def: 15, eva: -5, color: '#8B4513', symbol: '▲' },
  valley: { name: '河谷', move: 2, def: 10, eva: 5,  color: '#98FB98', symbol: '≈' },
  base:   { name: '机场', move: 1, def: 10, eva: 0,  color: '#D2B48C', symbol: '✈' },
};

// Weapon types
const WEAPONS = {
  mg30:   { name: '.30机枪',   type: 'machinegun', power: 25, range: 1, ammo: 99, hit: 80, crit: 5,  desc: 'P-40同轴机枪' },
  mg50:   { name: '.50重机枪', type: 'machinegun', power: 35, range: 1, ammo: 99, hit: 75, crit: 8,  desc: '勃朗宁M2航空机枪' },
  hispano:{ name: '20mm机炮',  type: 'cannon',     power: 55, range: 1, ammo: 60, hit: 70, crit: 12, desc: '西斯帕诺机炮' },
  rocket: { name: '火箭弹',    type: 'rocket',     power: 70, range: 1, ammo: 6,  hit: 65, crit: 15, desc: '对地/对空火箭' },
  bomb:   { name: '航空炸弹',  type: 'bomb',       power: 90, range: 1, ammo: 2,  hit: 60, crit: 10, desc: '对地重型炸弹' },
};

// Aircraft frames
const AIRCRAFT = {
  p40b: {
    id: 'p40b', name: 'P-40B 战鹰', hp: 80, maxHp: 80, move: 5, eva: 10,
    armor: 12, engine: 10, weapons: ['mg30', 'mg30'],
    upgrades: { armor: 0, engine: 0, weapon: 0 },
    desc: '飞虎队主力战机，俯冲速度快，火力凶猛。'
  },
  p40e: {
    id: 'p40e', name: 'P-40E 战鹰', hp: 95, maxHp: 95, move: 6, eva: 12,
    armor: 15, engine: 12, weapons: ['mg50', 'mg50', 'hispano'],
    upgrades: { armor: 0, engine: 0, weapon: 0 },
    desc: '改进型战鹰，配备6挺.50机枪。'
  },
};

// Enemy aircraft
const ENEMY_AIRCRAFT = {
  ki27: {
    id: 'ki27', name: '九七式战斗机', hp: 55, maxHp: 55, move: 6, eva: 20,
    armor: 6, engine: 8, weapons: ['mg30'],
    desc: '日军早期轻型战斗机，机动灵活但脆弱。'
  },
  ki43: {
    id: 'ki43', name: '一式战斗机 隼', hp: 70, maxHp: 70, move: 6, eva: 18,
    armor: 8, engine: 10, weapons: ['mg30', 'mg30'],
    desc: '日军主力战斗机，机动性优秀。'
  },
  zero: {
    id: 'zero', name: '零式舰战', hp: 75, maxHp: 75, move: 7, eva: 22,
    armor: 7, engine: 12, weapons: ['mg30', 'hispano'],
    desc: '太平洋战场著名战斗机，机动性极强。'
  },
  ki21: {
    id: 'ki21', name: '九七式重爆', hp: 120, maxHp: 120, move: 4, eva: 0,
    armor: 10, engine: 6, weapons: ['mg30'],
    desc: '日军重型轰炸机，威胁地面目标。'
  },
  ki48: {
    id: 'ki48', name: '九九式双发轻爆', hp: 90, maxHp: 90, move: 5, eva: 5,
    armor: 8, engine: 8, weapons: ['mg30'],
    desc: '日军轻型轰炸机，速度较快。'
  },
};

// Pilot classes
const PILOT_CLASSES = {
  ace:      { name: '王牌',  growth: { hp: 1.2, skill: 1.4, attack: 1.3, defense: 1.0 }, bonus: '暴击率+10%' },
  veteran:  { name: '老兵',  growth: { hp: 1.3, skill: 1.1, attack: 1.2, defense: 1.2 }, bonus: '全属性均衡' },
  tactician:{ name: '参谋',  growth: { hp: 1.0, skill: 1.2, attack: 1.0, defense: 1.3 }, bonus: '防御+15%' },
  rookie:   { name: '新兵',  growth: { hp: 1.0, skill: 1.0, attack: 1.0, defense: 1.0 }, bonus: '成长空间' },
};

// Skills
const SKILLS = {
  marksmanship: { name: '神射手', desc: '命中率+15%', effect: (p) => p.hitBonus += 15 },
  bullseye:     { name: '致命一击', desc: '暴击率+10%', effect: (p) => p.critBonus += 10 },
  evasion:      { name: '空中闪避', desc: '回避+15', effect: (p) => p.evaBonus += 15 },
  armor:        { name: '装甲强化', desc: '防御+5', effect: (p) => p.defBonus += 5 },
  leader:       { name: '队长号令', desc: '2格内友军命中+10', effect: (p) => {}, aura: true },
  rearm:        { name: '快速整备', desc: '弹药消耗-1(最低1)', effect: (p) => {} },
};

// Player pilots
function createPilots() {
  return [
    {
      id: 'p1', name: '陈纳德', callsign: '老长官', cls: 'tactician',
      lv: 5, xp: 0, nextXp: 100,
      hp: 90, maxHp: 90, attack: 22, defense: 18, skill: 20, morale: 100,
      skills: ['leader'], aircraft: 'p40e',
      bio: '飞虎队指挥官，以战术洞察力和坚定意志著称。'
    },
    {
      id: 'p2', name: '罗伯特·斯科特', callsign: '公爵', cls: 'ace',
      lv: 4, xp: 0, nextXp: 80,
      hp: 80, maxHp: 80, attack: 28, defense: 12, skill: 22, morale: 100,
      skills: ['marksmanship', 'bullseye'], aircraft: 'p40b',
      bio: '第一个在驼峰航线击落敌机的美国飞行员。'
    },
    {
      id: 'p3', name: '大卫·希尔', callsign: '德克斯', cls: 'ace',
      lv: 3, xp: 0, nextXp: 70,
      hp: 75, maxHp: 75, attack: 25, defense: 13, skill: 20, morale: 100,
      skills: ['evasion'], aircraft: 'p40b',
      bio: '擅长空中格斗，多次单机对抗多架敌机。'
    },
    {
      id: 'p4', name: '查理·邦德', callsign: '小鬼', cls: 'veteran',
      lv: 3, xp: 0, nextXp: 70,
      hp: 82, maxHp: 82, attack: 20, defense: 16, skill: 17, morale: 100,
      skills: ['armor'], aircraft: 'p40b',
      bio: '冷静沉着的攻击机飞行员，擅长对地支援。'
    },
    {
      id: 'p5', name: '杰克·纽柯克', callsign: '疤面', cls: 'veteran',
      lv: 2, xp: 0, nextXp: 60,
      hp: 78, maxHp: 78, attack: 21, defense: 14, skill: 18, morale: 100,
      skills: [], aircraft: 'p40b',
      bio: '勇敢善战，但行事风格较为冲动。'
    },
    {
      id: 'p6', name: '刘水泡', callsign: '泡子', cls: 'rookie',
      lv: 1, xp: 0, nextXp: 50,
      hp: 70, maxHp: 70, attack: 18, defense: 12, skill: 15, morale: 100,
      skills: [], aircraft: 'p40b',
      bio: '中国地勤出身的年轻飞行员，满腔热血。'
    },
  ];
}

// Missions based on Flying Tigers history
const MISSIONS = [
  {
    id: 'm1', name: '同古训练营', location: '缅甸 同古',
    intro: [
      '1941年秋，陈纳德率领美国志愿航空队抵达缅甸同古。',
      '飞行员们驾驶着涂有鲨鱼嘴的P-40战鹰，开始紧张训练。',
      '今天将进行模拟空战演练，熟悉战机的俯冲战术。'
    ],
    objective: 'defeat_all',
    turns: 15,
    reward: { xp: 100, funds: 500 },
    mapWidth: 12, mapHeight: 10,
    terrainSeed: 'training',
    enemies: [
      { type: 'ki27', x: 9, y: 2, lv: 1 },
      { type: 'ki27', x: 10, y: 4, lv: 1 },
      { type: 'ki27', x: 9, y: 7, lv: 1 },
    ],
    playerSpawns: [{x:1,y:2},{x:2,y:4},{x:1,y:7}],
    allowedUnits: 3,
  },
  {
    id: 'm2', name: '昆明上空', location: '中国 昆明',
    intro: [
      '1941年12月20日，日军轰炸机编队空袭昆明。',
      '飞虎队首次大规模实战，以少胜多。',
      '利用P-40的俯冲优势，从高空发动突袭！'
    ],
    objective: 'defeat_all',
    turns: 20,
    reward: { xp: 150, funds: 800 },
    mapWidth: 14, mapHeight: 12,
    terrainSeed: 'kunming',
    enemies: [
      { type: 'ki21', x: 12, y: 2, lv: 2 },
      { type: 'ki21', x: 13, y: 5, lv: 2 },
      { type: 'ki27', x: 11, y: 1, lv: 2 },
      { type: 'ki27', x: 11, y: 9, lv: 2 },
      { type: 'ki43', x: 10, y: 5, lv: 3 },
    ],
    playerSpawns: [{x:1,y:2},{x:2,y:5},{x:1,y:9},{x:3,y:7}],
    allowedUnits: 4,
  },
  {
    id: 'm3', name: '仰光保卫战', location: '缅甸 仰光',
    intro: [
      '1942年1月，日军空袭仰光，英军 RAF 苦战不支。',
      '飞虎队加入防御，与日军零式、一式战激烈交锋。',
      '保护机场和码头设施，击退来犯敌机。'
    ],
    objective: 'protect',
    protectTarget: { x: 1, y: 6, hp: 200, name: '仰光机场' },
    turns: 25,
    reward: { xp: 200, funds: 1000 },
    mapWidth: 16, mapHeight: 12,
    terrainSeed: 'rangoon',
    enemies: [
      { type: 'ki43', x: 14, y: 2, lv: 3 },
      { type: 'ki43', x: 15, y: 4, lv: 3 },
      { type: 'zero', x: 14, y: 6, lv: 4 },
      { type: 'ki48', x: 15, y: 8, lv: 3 },
      { type: 'ki48', x: 13, y: 10, lv: 3 },
      { type: 'ki27', x: 12, y: 1, lv: 2 },
      { type: 'ki27', x: 12, y: 11, lv: 2 },
    ],
    playerSpawns: [{x:2,y:2},{x:3,y:4},{x:2,y:6},{x:3,y:8},{x:2,y:10}],
    allowedUnits: 5,
  },
  {
    id: 'm4', name: '马圭空战', location: '缅甸 马圭',
    intro: [
      '1942年2月，日军空袭马圭机场，试图摧毁飞虎队基地。',
      '敌轰炸机群在战斗机护航下逼近。',
      '在机场被摧毁前击落所有轰炸机！'
    ],
    objective: 'defeat_bombers',
    turns: 22,
    reward: { xp: 220, funds: 1200 },
    mapWidth: 16, mapHeight: 14,
    terrainSeed: 'magwe',
    enemies: [
      { type: 'ki21', x: 14, y: 3, lv: 4 },
      { type: 'ki21', x: 15, y: 6, lv: 4 },
      { type: 'ki21', x: 14, y: 10, lv: 4 },
      { type: 'ki43', x: 12, y: 2, lv: 3 },
      { type: 'ki43', x: 12, y: 7, lv: 3 },
      { type: 'zero', x: 13, y: 11, lv: 4 },
    ],
    playerSpawns: [{x:2,y:3},{x:3,y:6},{x:2,y:9},{x:3,y:12},{x:4,y:7}],
    allowedUnits: 5,
  },
  {
    id: 'm5', name: '怒江大峡谷', location: '中国 滇缅公路',
    intro: [
      '1942年5月，日军沿滇缅公路突进，惠通桥危在旦夕。',
      '飞虎队奉命轰炸怒江峡谷中的日军车队与浮桥。',
      '这是改变战局的一战，务必摧毁所有地面目标！'
    ],
    objective: 'destroy_targets',
    targets: [
      { x: 13, y: 4, hp: 80, name: '浮桥' },
      { x: 14, y: 7, hp: 80, name: '补给车队' },
      { x: 13, y: 10, hp: 80, name: '炮兵阵地' },
    ],
    turns: 25,
    reward: { xp: 300, funds: 1500 },
    mapWidth: 16, mapHeight: 14,
    terrainSeed: 'salween',
    enemies: [
      { type: 'ki43', x: 10, y: 2, lv: 4 },
      { type: 'ki43', x: 11, y: 6, lv: 4 },
      { type: 'zero', x: 10, y: 10, lv: 5 },
      { type: 'zero', x: 12, y: 12, lv: 5 },
    ],
    playerSpawns: [{x:1,y:2},{x:2,y:5},{x:1,y:8},{x:2,y:11},{x:3,y:7},{x:3,y:9}],
    allowedUnits: 6,
  },
  {
    id: 'm6', name: '衡阳上空', location: '中国 衡阳',
    intro: [
      '1943年夏，日军发动大规模进攻，衡阳守军告急。',
      '飞虎队虽已改编为美国陆军第14航空队，但精神不灭。',
      '这是最后一战，为了中国天空的自由而战！'
    ],
    objective: 'defeat_all',
    turns: 30,
    reward: { xp: 400, funds: 2000 },
    mapWidth: 18, mapHeight: 14,
    terrainSeed: 'hengyang',
    enemies: [
      { type: 'zero', x: 15, y: 2, lv: 5 },
      { type: 'zero', x: 16, y: 5, lv: 5 },
      { type: 'zero', x: 15, y: 8, lv: 6 },
      { type: 'ki43', x: 14, y: 11, lv: 5 },
      { type: 'ki43', x: 16, y: 12, lv: 5 },
      { type: 'ki21', x: 17, y: 3, lv: 5 },
      { type: 'ki21', x: 17, y: 10, lv: 5 },
      { type: 'ki48', x: 13, y: 7, lv: 4 },
    ],
    playerSpawns: [{x:1,y:2},{x:2,y:4},{x:1,y:7},{x:2,y:10},{x:1,y:12},{x:3,y:6}],
    allowedUnits: 6,
  },
];

// Shop / upgrade costs
const UPGRADE_COSTS = {
  armor:  [300, 600, 1000, 1500, 2200],
  engine: [300, 600, 1000, 1500, 2200],
  weapon: [400, 800, 1300, 2000, 2800],
};

const REPAIR_COST = 5; // per HP

// Utility: deep clone
function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
