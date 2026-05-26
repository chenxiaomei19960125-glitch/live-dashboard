/**
 * 直播数据看板 - 模拟数据
 * 数据范围：2026-03-01 ~ 至今
 *
 * ⏰ 自动更新机制：
 *   - 每天北京时间 15:00 自动切换为新一天的数据版本
 *   - 0:00~14:59 显示的是「昨天 15:00 生成的版本」（保证一天内任何时段打开都有数据）
 *   - 同一版本日期内，无论刷新多少次、谁打开，数据完全一致（基于日期种子伪随机）
 *
 * 字段说明（liveSessions 单场）：
 *   brand / date / title / duration / startTime / endTime / viewers / likes
 *   conversionRate / perCapitaValue / gpm / trafficPerMin / danmuCount / danmuPeople
 *   interactRate / estSales / estGmv / salesPerMin / avgPrice / skuCount / gmvPerMin
 *   category3 / priceBand
 */

// ========== 三级类目 ==========
const CATEGORY_BAGS = [
  { name: '女士单肩包',  sales: 12800, heat: 92 },
  { name: '女士手提包',  sales: 11500, heat: 88 },
  { name: '女士斜挎包',  sales: 9700,  heat: 85 },
  { name: '托特包',      sales: 9100,  heat: 81 },
  { name: '双肩书包',    sales: 8200,  heat: 76 },
  { name: '链条包',      sales: 7600,  heat: 79 },
  { name: '男士商务包',  sales: 6300,  heat: 71 },
  { name: '钱包卡包',    sales: 5800,  heat: 68 },
  { name: '行李箱',      sales: 5200,  heat: 64 },
  { name: '腰包胸包',    sales: 4100,  heat: 58 }
];

const CATEGORY_SHOES = [
  { name: '女士高跟鞋',  sales: 13200, heat: 94 },
  { name: '女士单鞋',    sales: 11800, heat: 89 },
  { name: '女士运动鞋',  sales: 10500, heat: 87 },
  { name: '男士运动鞋',  sales: 9800,  heat: 84 },
  { name: '女士靴子',    sales: 9300,  heat: 82 },
  { name: '男士休闲鞋',  sales: 8700,  heat: 78 },
  { name: '男士皮鞋',    sales: 7400,  heat: 73 },
  { name: '凉鞋拖鞋',    sales: 6900,  heat: 70 },
  { name: '童鞋',        sales: 5300,  heat: 65 },
  { name: '老人鞋',      sales: 4600,  heat: 61 }
];

// ========== 全赛道大众品牌池 ==========
const BAG_BRANDS_FULL = [
  '稻草人', '小CK', '诗丹凯萨', '迪桑娜', '高田纺织',
  '老人头', '天逸', '名格', '卡拉羊', '梦特娇',
  '啄木鸟', '法兰诗顿', '威戈', '新秀丽', '美旅',
  '爱华仕', '七匹狼', '梅森马吉拉', '茉蒂菲莉', '红谷',
  '金利来', '宾度', 'Lacoste', '思加图', '万里马',
  '热风', '安踏包袋', '探路者包袋', '北面包袋', '李宁包袋'
];
const SHOE_BRANDS_FULL = [
  '红蜻蜓', '百丽', '奥康', '骆驼', '足力健',
  '木林森', '老北京布鞋', '富贵鸟', '回力', '大东',
  '森达', '千百度', '康奈', '意尔康', '思加图',
  '哈森', '天美意', '七匹狼男鞋', '安踏', '李宁',
  '特步', '361度', '鸿星尔克', '匹克', '乔丹',
  '斯凯奇', '探路者', '北面', '其乐', '回力老爹鞋'
];

// 单场 GMV 基准（万元）按排名递减
function buildGmvBase(n, top, bottom) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    const ratio = i / (n - 1);
    arr.push(Math.round(top - (top - bottom) * ratio));
  }
  return arr.map(x => x * 10000);
}
const BAG_GMV_BASE  = buildGmvBase(BAG_BRANDS_FULL.length,  320, 35);
const SHOE_GMV_BASE = buildGmvBase(SHOE_BRANDS_FULL.length, 620, 60);

// ========== 工具函数 ==========
function pad(n) { return String(n).padStart(2, '0'); }
function fmtDate(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }

// 获取「数据版本日期」：北京时间 ≥15:00 取今天；否则取昨天
function getDataVersionDate() {
  const now = new Date();
  // 转到北京时间（UTC+8）
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const bj  = new Date(utc + 8 * 3600 * 1000);
  if (bj.getHours() < 15) {
    bj.setDate(bj.getDate() - 1);
  }
  return fmtDate(bj);
}

// 获取「下次刷新时间」（北京时间下一个 15:00）
function getNextRefreshTime() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const bj  = new Date(utc + 8 * 3600 * 1000);
  const next = new Date(bj);
  if (bj.getHours() >= 15) {
    next.setDate(next.getDate() + 1);
  }
  next.setHours(15, 0, 0, 0);
  return next; // 北京时间的"墙上时间"对象（在显示时直接读 hours/date）
}

// 字符串 hash
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}
// 基于 (品牌+日期+字段) 的稳定伪随机 [0,1)
function seededRand(brand, date, field) {
  const h = hashStr(brand + '|' + date + '|' + field + '|' + DATA_VERSION);
  // mulberry32
  let t = (h + 0x6D2B79F5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// 生成 2026-03-01 ~ 数据版本日 范围内的"每日"开播日期
function buildDailyDates(startStr, endStr) {
  const start = new Date(startStr + 'T00:00:00');
  const end   = new Date(endStr   + 'T00:00:00');
  const dates = [];
  const cur = new Date(start);
  while (cur <= end) {
    dates.push(fmtDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// 客单价区间分桶
function priceBandOf(price) {
  if (price < 100)  return '0-100';
  if (price < 200)  return '100-200';
  if (price < 300)  return '200-300';
  if (price < 500)  return '300-500';
  if (price < 800)  return '500-800';
  if (price < 1200) return '800-1200';
  return '1200+';
}

// 生成一条直播场次（全部用 seededRand，确保同一版本下数据稳定）
function makeSession(brand, gmv, date, title, category3) {
  const r = (f) => seededRand(brand, date, f);

  const viewers       = Math.round(gmv / (8 + r('viewers') * 6));
  const duration      = +(3 + r('duration') * 5).toFixed(1);
  const startHour     = 18 + Math.floor(r('startH') * 3);
  const startMin      = Math.floor(r('startM') * 60);
  const startTime     = `${date} ${pad(startHour)}:${pad(startMin)}`;
  const totalMinutes  = Math.round(duration * 60);
  const endMs         = new Date(`${date}T${pad(startHour)}:${pad(startMin)}:00`).getTime() + totalMinutes * 60000;
  const endD          = new Date(endMs);
  const endTime       = `${fmtDate(endD)} ${pad(endD.getHours())}:${pad(endD.getMinutes())}`;
  const likes         = Math.round(viewers * (3 + r('likes') * 4));
  const conversionRate= +(1.5 + r('conv') * 4).toFixed(2);
  const perCapitaValue= +(gmv / viewers).toFixed(2);
  const gpm           = Math.round(gmv / (duration * 60));
  const trafficPerMin = Math.round(viewers / (duration * 60));
  const danmuCount    = Math.round(viewers * (0.6 + r('danmu') * 0.4));
  const danmuPeople   = Math.round(danmuCount / (1.5 + r('danmuP')));
  const interactRate  = +((danmuPeople / viewers) * 100).toFixed(2);
  const estSales      = Math.round(gmv / (180 + r('sales') * 120));
  const salesPerMin   = Math.round(estSales / (duration * 60));
  const skuCount      = Math.round(20 + r('sku') * 60);
  const avgPrice      = Math.round(gmv / estSales);
  const gmvPerMin     = Math.round(gmv / (duration * 60));
  const priceBand     = priceBandOf(avgPrice);

  return {
    brand, date, title,
    duration, startTime, endTime,
    viewers, likes,
    conversionRate, perCapitaValue, gpm,
    trafficPerMin, danmuCount, danmuPeople, interactRate,
    estSales, estGmv: gmv, salesPerMin,
    avgPrice, skuCount, gmvPerMin,
    category3, priceBand
  };
}

function buildSessions(brands, baseGmvList, categories, endDateStr) {
  const dates = buildDailyDates('2026-03-01', endDateStr);
  const titlePool = [
    p => `${p}春季新品发布专场`,
    p => `${p}品牌团购日 全场低至3折`,
    p => `${p}超级品牌日 直播狂欢`,
    p => `${p}周年庆专场`,
    p => `${p}爆款返场福利夜`,
    p => `${p}新品首发抢先购`,
    p => `${p}百亿补贴专场`,
    p => `${p}限时秒杀直播间`
  ];
  const sessions = [];
  brands.forEach((brand, idx) => {
    const seed = hashStr(brand);
    dates.forEach((d, di) => {
      // 是否开播：基于 (品牌+日期) 稳定决定
      const openR = seededRand(brand, d, 'open');
      if (openR < 0.45) return;
      const baseGmv = baseGmvList[idx];
      // GMV 波动也基于种子（每天会浮动 ±30%，跨天会变）
      const gmv = Math.round(baseGmv * (0.7 + seededRand(brand, d, 'gmv') * 0.6));
      const cat = categories[(idx + di) % categories.length].name;
      sessions.push(makeSession(brand, gmv, d, titlePool[di % titlePool.length](brand), cat));
    });
  });
  return sessions;
}

// ========== 数据版本 ==========
const DATA_VERSION = getDataVersionDate();      // 当前数据版本日期（每天 15:00 切换）
const NEXT_REFRESH = getNextRefreshTime();      // 下次刷新时间（北京时间）

const MOCK_DATA = {
  updateTime: DATA_VERSION + ' 15:00',
  dataVersion: DATA_VERSION,
  nextRefresh: NEXT_REFRESH,
  dataRange: { start: '2026-03-01', end: DATA_VERSION },
  excludedBrands: ['古驰', '蔻驰', 'LV', '爱马仕', 'PRADA', 'Dior', 'Chanel', 'Burberry', 'MK', '路易卡迪'],
  bags: {
    categories: CATEGORY_BAGS,
    brands: BAG_BRANDS_FULL,
    sessions: buildSessions(BAG_BRANDS_FULL, BAG_GMV_BASE, CATEGORY_BAGS, DATA_VERSION)
  },
  shoes: {
    categories: CATEGORY_SHOES,
    brands: SHOE_BRANDS_FULL,
    sessions: buildSessions(SHOE_BRANDS_FULL, SHOE_GMV_BASE, CATEGORY_SHOES, DATA_VERSION)
  }
};

window.MOCK_DATA = MOCK_DATA;
