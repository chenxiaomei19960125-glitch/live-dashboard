/* 直播数据看板 - 主逻辑（紫色玻璃风版本） */
(function () {
  'use strict';

  const state = {
    category: 'bags',
    startDate: null,
    endDate: null,
    sortKey: null,
    sortDir: 'desc',
    activeQuick: 'all'
  };

  const COLUMNS = [
    { key: 'brand',           title: '品牌名称',          fmt: v => v },
    { key: 'category3',       title: '三级类目',          fmt: v => v || '-' },
    { key: 'priceBand',       title: '客单价区间(¥)',     fmt: v => v || '-' },
    { key: 'title',           title: '直播标题',          fmt: v => v, w: 220 },
    { key: 'date',            title: '直播日期',          fmt: v => v },
    { key: 'duration',        title: '直播时长(h)',       fmt: v => v.toFixed(1) },
    { key: 'startTime',       title: '开播时间',          fmt: v => v },
    { key: 'endTime',         title: '下播时间',          fmt: v => v },
    { key: 'viewers',         title: '观看人数',          fmt: numFmt },
    { key: 'likes',           title: '点赞数',            fmt: numFmt },
    { key: 'conversionRate',  title: '转化率(%)',         fmt: v => v.toFixed(2) },
    { key: 'perCapitaValue',  title: '人均价值(¥)',       fmt: v => v.toFixed(2) },
    { key: 'gpm',             title: 'GPM',               fmt: numFmt },
    { key: 'trafficPerMin',   title: '分钟流量获取',      fmt: numFmt },
    { key: 'danmuCount',      title: '弹幕条数',          fmt: numFmt },
    { key: 'danmuPeople',     title: '弹幕人数',          fmt: numFmt },
    { key: 'interactRate',    title: '观众互动率(%)',     fmt: v => v.toFixed(2) },
    { key: 'estSales',        title: '预估销量',          fmt: numFmt },
    { key: 'estGmv',          title: '预估销售额(¥)',     fmt: v => '¥' + numFmt(v), strong: true },
    { key: 'salesPerMin',     title: '分钟销量产出',      fmt: numFmt },
    { key: 'avgPrice',        title: '笔单价(¥)',         fmt: numFmt },
    { key: 'skuCount',        title: '商品数',            fmt: numFmt },
    { key: 'gmvPerMin',       title: '分钟销售额产出(¥)', fmt: numFmt }
  ];

  function numFmt(n) {
    if (n == null) return '-';
    if (typeof n !== 'number') return n;
    if (n >= 100000000) return (n / 100000000).toFixed(2) + '亿';
    if (n >= 10000) return (n / 10000).toFixed(2) + '万';
    return Number(n).toLocaleString('zh-CN');
  }

  // ---------- 初始化 ----------
  document.getElementById('updateTime').textContent = MOCK_DATA.updateTime;
  document.getElementById('excludeList').textContent = MOCK_DATA.excludedBrands.slice(0, 5).join('、') + ' 等';

  function todayStr() {
    // 用数据版本日作为"今天"，保证选区和实际数据一致
    return MOCK_DATA.dataVersion;
  }
  function initDateRange() {
    state.startDate = MOCK_DATA.dataRange.start; // 2026-03-01
    state.endDate = todayStr();
    document.getElementById('startDate').value = state.startDate;
    document.getElementById('endDate').value = state.endDate;
  }

  // ---------- 自动刷新（北京时间每天 15:00 切版） ----------
  function setupAutoRefresh() {
    const next = MOCK_DATA.nextRefresh;
    const now  = new Date();
    // 把 next（北京时间墙上时间）转回本地时间戳进行倒计时
    const utcMs = Date.UTC(
      next.getFullYear(), next.getMonth(), next.getDate(),
      next.getHours(), next.getMinutes(), 0
    ) - 8 * 3600 * 1000;
    let delay = utcMs - now.getTime();
    if (delay < 0) delay = 60 * 1000; // 兜底
    // 显示倒计时徽标
    const badge = document.getElementById('nextRefreshBadge');
    if (badge) {
      const fmtNext = `${next.getMonth()+1}月${next.getDate()}日 15:00`;
      badge.textContent = `下次自动更新：${fmtNext}`;
    }
    setTimeout(() => {
      // 到点自动 reload，拿到新一天数据版本
      location.reload();
    }, delay + 5000); // 缓冲 5s 确保跨过 15:00
  }
  setupAutoRefresh();

  function bindEvents() {
    // Tab 切换（箱包/鞋靴）
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.category = btn.dataset.cat;
        render();
      });
    });
    // 应用
    document.getElementById('applyFilter').addEventListener('click', () => {
      state.startDate = document.getElementById('startDate').value;
      state.endDate = document.getElementById('endDate').value;
      // 自定义日期则取消快捷按钮高亮
      state.activeQuick = null;
      document.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('active'));
      render();
    });
    // 快速选择
    document.querySelectorAll('.quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const range = btn.dataset.range;
        state.activeQuick = range;
        const today = todayStr();
        if (range === 'all') {
          state.startDate = MOCK_DATA.dataRange.start;
          state.endDate = today;
        } else if (range === 'yesterday') {
          const y = new Date();
          y.setDate(y.getDate() - 1);
          const ystr = y.toISOString().slice(0, 10);
          state.startDate = ystr;
          state.endDate = ystr;
        } else {
          const days = parseInt(range);
          const end = new Date(today);
          const start = new Date(today);
          start.setDate(end.getDate() - days + 1);
          state.startDate = start.toISOString().slice(0, 10);
          state.endDate = today;
        }
        document.getElementById('startDate').value = state.startDate;
        document.getElementById('endDate').value = state.endDate;
        render();
      });
    });
  }

  // ---------- 数据筛选 ----------
  // 全赛道：时间范围内所有场次（剔除奢侈品）—— KPI 用
  function getAllSessions() {
    const data = MOCK_DATA[state.category];
    return data.sessions.filter(s =>
      s.date >= state.startDate &&
      s.date <= state.endDate &&
      !MOCK_DATA.excludedBrands.includes(s.brand) &&
      data.brands.includes(s.brand)
    );
  }
  // TOP10：每个品牌时间范围内"最新一场"，按 GMV 降序取前 10 —— 图表/表格用
  function getTop10LatestSessions() {
    const sessions = getAllSessions();
    const byBrand = new Map();
    sessions.forEach(s => {
      const prev = byBrand.get(s.brand);
      if (!prev || s.date > prev.date) byBrand.set(s.brand, s);
    });
    return [...byBrand.values()].sort((a, b) => b.estGmv - a.estGmv).slice(0, 10);
  }

  // ---------- KPI ----------
  function renderKpi(rows) {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.firstChild.nodeValue = v; };
    // 用 textContent 更稳妥：但需要保留 unit 子节点
    function setVal(id, v) {
      const el = document.getElementById(id);
      if (!el) return;
      const unit = el.querySelector('.kpi-unit');
      el.innerHTML = '';
      el.appendChild(document.createTextNode(v));
      if (unit) el.appendChild(unit);
    }
    if (!rows.length) {
      ['kpiSessions','kpiBrands','kpiDuration','kpiViewers','kpiSku',
       'kpiGmv','kpiConv','kpiPerCap','kpiGpm','kpiAvgPrice',
       'kpiLikes','kpiDanmu','kpiDanmuPpl','kpiInteract','kpiFlow']
        .forEach(id => setVal(id, '-'));
      return;
    }
    const sum = (k) => rows.reduce((s, r) => s + (r[k]||0), 0);
    const avg = (k) => sum(k) / rows.length;

    // 直播概览
    setVal('kpiSessions', rows.length);
    setVal('kpiBrands',   new Set(rows.map(r => r.brand)).size);
    setVal('kpiDuration', avg('duration').toFixed(1));
    setVal('kpiViewers',  numFmt(sum('viewers')));
    setVal('kpiSku',      numFmt(sum('skuCount')));
    // 销售
    setVal('kpiGmv',      '¥' + numFmt(sum('estGmv')));
    setVal('kpiConv',     avg('conversionRate').toFixed(2));
    setVal('kpiPerCap',   avg('perCapitaValue').toFixed(2));
    setVal('kpiGpm',      numFmt(Math.round(avg('gpm'))));
    setVal('kpiAvgPrice', numFmt(Math.round(avg('avgPrice'))));
    // 互动
    setVal('kpiLikes',    numFmt(sum('likes')));
    setVal('kpiDanmu',    numFmt(sum('danmuCount')));
    setVal('kpiDanmuPpl', numFmt(sum('danmuPeople')));
    setVal('kpiInteract', avg('interactRate').toFixed(2));
    setVal('kpiFlow',     numFmt(Math.round(avg('trafficPerMin'))));
  }

  // ---------- 图表 ----------
  let chartGmv, chartCategory;
  function getThemeColor() {
    return state.category === 'bags'
      ? { primary: '#6366f1', secondary: '#8b5cf6', accent: '#ec4899' }
      : { primary: '#06b6d4', secondary: '#14b8a6', accent: '#f59e0b' };
  }

  function renderGmvChart(rows) {
    if (!chartGmv) chartGmv = echarts.init(document.getElementById('chartGmv'));
    const sorted = [...rows].sort((a, b) => a.estGmv - b.estGmv);
    const c = getThemeColor();
    chartGmv.setOption({
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: p => `<b>${p[0].name}</b><br/>预估 GMV：¥${numFmt(p[0].value)}`,
        backgroundColor: 'rgba(26,26,46,0.95)',
        borderColor: 'transparent', textStyle: { color: '#fff' }
      },
      grid: { left: 90, right: 80, top: 16, bottom: 30 },
      xAxis: {
        type: 'value',
        axisLabel: { formatter: v => numFmt(v), color: '#94a3b8' },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.05)' } }
      },
      yAxis: {
        type: 'category',
        data: sorted.map(r => r.brand),
        axisLabel: { color: '#475569', fontWeight: 600 },
        axisLine: { show: false }, axisTick: { show: false }
      },
      series: [{
        type: 'bar',
        data: sorted.map(r => r.estGmv),
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: c.primary },
              { offset: 1, color: c.secondary }
            ]
          },
          borderRadius: [0, 8, 8, 0]
        },
        label: {
          show: true, position: 'right',
          formatter: p => '¥' + numFmt(p.value),
          color: '#475569', fontWeight: 600
        }
      }]
    });
  }

  function renderCategoryChart() {
    // 三级类目 TOP15 表格（按 当前选区内的 GMV 倒序）
    const wrap = document.getElementById('catTableWrap');
    if (!wrap) return;

    // 计算当前日期选区的天数（含首尾）
    const dayMs = 86400000;
    const sd = new Date(state.startDate);
    const ed = new Date(state.endDate);
    let days = Math.max(1, Math.round((ed - sd) / dayMs) + 1);

    // 基准数据 (CATEGORY_BAGS/SHOES 里的 gmv/sales) 设定为 30 天行业规模，
    // 这里按"实际选区天数 / 30"做线性缩放，让 1天/7天/30天/全量自然拉开
    const baseDays = 30;
    const scale = days / baseDays;

    // 给类目标题加日期范围说明 & 同步赛道名
    const labelEl = document.getElementById('catTabLabel');
    if (labelEl) {
      labelEl.textContent = (state.category === 'bags' ? '箱包' : '鞋靴')
        + ` · ${state.startDate} ~ ${state.endDate}（${days}天）`;
    }

    // 按当前选区缩放后的 gmv 排序
    const cats = MOCK_DATA[state.category].categories
      .map(o => {
        // 给每个类目按选区做轻微伪随机抖动（±8%），保持稳定但不机械
        const seed = hashStr(o.name + state.startDate + state.endDate);
        const jitter = 0.92 + (seed % 160) / 1000; // 0.92 ~ 1.08
        const gmv = Math.round(o.gmv * scale * jitter); // 单位：万元
        return { name: o.name, gmv };
      })
      .sort((a, b) => b.gmv - a.gmv)
      .slice(0, 15);
    const maxGmv = cats[0] ? cats[0].gmv : 1;

    const rows = cats.map((o, i) => {
      const rank = i + 1;
      const rankCls = rank === 1 ? 'cat-rank top1'
                    : rank === 2 ? 'cat-rank top2'
                    : rank === 3 ? 'cat-rank top3'
                    : 'cat-rank';
      const gmvStr = formatGmv(o.gmv);
      const barPct = Math.max(4, Math.round(o.gmv / maxGmv * 100));
      return `
        <tr>
          <td><span class="${rankCls}">${rank}</span></td>
          <td><span class="cat-name">${o.name}</span></td>
          <td class="cat-bar-cell">
            <span class="cat-gmv">¥${gmvStr}</span>
            <span class="cat-bar"><i style="width:${barPct}%"></i></span>
          </td>
        </tr>
      `;
    }).join('');

    wrap.innerHTML = `
      <table class="cat-table">
        <thead>
          <tr>
            <th style="width:48px;">#</th>
            <th style="width:140px;">三级类目</th>
            <th>GMV</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  // 字符串简易哈希（生成稳定伪随机数）
  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
  // GMV 数字格式化（万元 → 自动选择 万/亿）
  function formatGmv(wan) {
    if (wan >= 10000) return (wan / 10000).toFixed(2) + '亿';
    if (wan >= 1000)  return (wan / 1000).toFixed(2) + '千万';
    return wan.toLocaleString() + '万';
  }

  // ---------- 表格 ----------
  function renderTable(rows) {
    const head = document.getElementById('tableHead');
    head.innerHTML = COLUMNS.map(col => {
      const arrow = state.sortKey === col.key ? (state.sortDir === 'asc' ? ' ▲' : ' ▼') : '';
      const w = col.w ? `style="min-width:${col.w}px"` : '';
      return `<th data-key="${col.key}" ${w}>${col.title}${arrow}</th>`;
    }).join('');
    head.querySelectorAll('th').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.key;
        if (state.sortKey === key) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        else { state.sortKey = key; state.sortDir = 'desc'; }
        render();
      });
    });

    let sorted = rows;
    if (state.sortKey) {
      sorted = [...rows].sort((a, b) => {
        const va = a[state.sortKey], vb = b[state.sortKey];
        if (typeof va === 'number') return state.sortDir === 'asc' ? va - vb : vb - va;
        return state.sortDir === 'asc'
          ? String(va).localeCompare(String(vb))
          : String(vb).localeCompare(String(va));
      });
    }

    const body = document.getElementById('tableBody');
    if (!sorted.length) {
      body.innerHTML = `<tr><td colspan="${COLUMNS.length}" style="text-align:center; padding:40px; color:#94a3b8;">当前时间周期内无数据，请调整筛选条件</td></tr>`;
      document.getElementById('tableInfo').textContent = '';
      return;
    }
    const chipCls = state.category === 'bags' ? 'brand-chip' : 'brand-chip shoe';
    body.innerHTML = sorted.map(r => {
      return '<tr>' + COLUMNS.map(col => {
        if (col.key === 'brand') return `<td><span class="${chipCls}">${r.brand}</span></td>`;
        const val = col.fmt(r[col.key]);
        return col.strong ? `<td><span class="num-strong">${val}</span></td>` : `<td>${val}</td>`;
      }).join('') + '</tr>';
    }).join('');
    document.getElementById('tableInfo').textContent =
      `${state.startDate} ~ ${state.endDate} · TOP${sorted.length} 大众品牌（每个品牌取最新一场）· 已剔除奢侈品`;
  }

  // ---------- Playbook 基本盘画像 ----------
  function renderPlaybook(topRows) {
    const labelEl = document.getElementById('pbCatLabel');
    if (labelEl) labelEl.textContent = state.category === 'bags' ? '箱包' : '鞋靴';

    const box = document.getElementById('pbPortrait');
    if (!box || !topRows.length) return;

    const avg = (arr, key) => arr.reduce((s, x) => s + x[key], 0) / arr.length;
    const minMax = (arr, key) => {
      const vs = arr.map(x => x[key]).sort((a, b) => a - b);
      return [vs[0], vs[vs.length - 1]];
    };
    const gmvMM      = minMax(topRows, 'estGmv');
    const durMM      = minMax(topRows, 'duration');
    const skuMM      = minMax(topRows, 'skuCount');
    const avgConv    = avg(topRows, 'conversionRate');
    const avgGpm     = avg(topRows, 'gpm');
    const avgInter   = avg(topRows, 'interactRate');
    // 客单价区间出现次数最多的两个
    const bandCount = {};
    topRows.forEach(r => { bandCount[r.priceBand] = (bandCount[r.priceBand] || 0) + 1; });
    const bandTop = Object.entries(bandCount).sort((a, b) => b[1] - a[1]).slice(0, 2).map(x => x[0]).join(' / ');
    // 开播时间段
    const hours = topRows.map(r => parseInt(r.startTime.slice(11, 13)));
    const startH = Math.min(...hours), endH = Math.max(...hours);

    const items = [
      { lbl: '单场 GMV',     val: `¥${(gmvMM[0]/10000).toFixed(0)}万 ~ ¥${(gmvMM[1]/10000).toFixed(0)}万` },
      { lbl: '直播时长',     val: `${durMM[0].toFixed(1)} ~ ${durMM[1].toFixed(1)} 小时（长播为主）` },
      { lbl: '开播时间',     val: `${startH}:00 ~ ${endH}:00 黄金档起播` },
      { lbl: '客单价集中段', val: bandTop || '-' },
      { lbl: 'SKU 数',       val: `${skuMM[0]} ~ ${skuMM[1]} 件 · 宽款式 + 深尾货` },
      { lbl: '平均 GPM',     val: `${Math.round(avgGpm).toLocaleString('zh-CN')}（行业均值 4000~6000）` },
      { lbl: '平均转化率',   val: `${avgConv.toFixed(2)}%` },
      { lbl: '平均互动率',   val: `${avgInter.toFixed(2)}%（≥30% 才有自然流量加权）` },
      { lbl: '上榜品牌',     val: topRows.slice(0, 5).map(r => r.brand).join(' · ') + ' 等' }
    ];
    box.innerHTML = items.map(it => `
      <div class="pb-portrait-item">
        <div class="lbl">${it.lbl}</div>
        <div class="val">${it.val}</div>
      </div>
    `).join('');
  }

  function render() {
    const allRows = getAllSessions();        // 全赛道场次（用于 KPI）
    const topRows = getTop10LatestSessions();// TOP10 最新场次（用于图表&表格）
    renderKpi(allRows);
    renderGmvChart(topRows);
    renderCategoryChart();
    renderTable(topRows);
    renderPlaybook(topRows);
  }

  window.addEventListener('resize', () => {
    chartGmv && chartGmv.resize();
  });

  initDateRange();
  bindEvents();
  render();
})();
