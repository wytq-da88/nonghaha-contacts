'use strict';

(function () {
  const $ = (sel) => document.querySelector(sel);
  const FAV_KEY = 'nh_contact_favs_v1';

  // ===================== 本地匹配所需数据 =====================
  // 省份 -> 下辖地级市/地区（用于「省名查询」展开到市、以及「市查询」反查省份）
  const PROVINCE_CITIES = {
    '陕西': ['西安','铜川','宝鸡','咸阳','渭南','延安','汉中','榆林','安康','商洛'],
    '安徽': ['合肥','芜湖','蚌埠','淮南','马鞍山','淮北','铜陵','安庆','黄山','滁州','阜阳','宿州','六安','亳州','池州','宣城'],
    '吉林': ['长春','吉林','四平','辽源','通化','白山','松原','白城','延边'],
    '西藏': ['拉萨','日喀则','昌都','林芝','山南','那曲','阿里'],
    '新疆': ['乌鲁木齐','克拉玛依','吐鲁番','哈密','昌吉','博尔塔拉','巴音郭楞','阿克苏','克孜勒苏','喀什','和田','伊犁','塔城','阿勒泰'],
    '黑龙江': ['哈尔滨','齐齐哈尔','鸡西','鹤岗','双鸭山','大庆','伊春','佳木斯','七台河','牡丹江','黑河','绥化','大兴安岭'],
    '湖北': ['武汉','黄石','十堰','宜昌','襄阳','鄂州','荆门','孝感','荆州','黄冈','咸宁','随州','恩施','仙桃','潜江','天门','神农架'],
    '四川': ['成都','自贡','攀枝花','泸州','德阳','绵阳','广元','遂宁','内江','乐山','南充','眉山','宜宾','广安','达州','雅安','巴中','资阳','阿坝','甘孜','凉山'],
    '云南': ['昆明','曲靖','玉溪','保山','昭通','丽江','普洱','临沧','楚雄','红河','文山','西双版纳','大理','德宏','怒江','迪庆'],
    '江苏': ['南京','无锡','徐州','常州','苏州','南通','连云港','淮安','盐城','扬州','镇江','泰州','宿迁'],
    '辽宁': ['沈阳','大连','鞍山','抚顺','本溪','丹东','锦州','营口','阜新','辽阳','盘锦','铁岭','朝阳','葫芦岛'],
    '山西': ['太原','大同','阳泉','长治','晋城','朔州','晋中','运城','忻州','临汾','吕梁'],
    '甘肃': ['兰州','嘉峪关','金昌','白银','天水','武威','张掖','平凉','酒泉','庆阳','定西','陇南','临夏','甘南'],
    '宁夏': ['银川','石嘴山','吴忠','固原','中卫'],
    '青海': ['西宁','海东','海北','黄南','海南','果洛','玉树','海西'],
    '内蒙古': ['呼和浩特','包头','乌海','赤峰','通辽','鄂尔多斯','呼伦贝尔','巴彦淖尔','乌兰察布','兴安盟','锡林郭勒盟','锡林郭勒','阿拉善盟','鄂托克前旗','乌审旗'],
    '山东': ['济南','青岛','淄博','枣庄','东营','烟台','潍坊','济宁','泰安','威海','日照','临沂','德州','聊城','滨州','菏泽'],
    '河南': ['郑州','开封','洛阳','平顶山','安阳','鹤壁','新乡','焦作','濮阳','许昌','漯河','三门峡','南阳','商丘','信阳','周口','驻马店','济源'],
    '河北': ['石家庄','唐山','秦皇岛','邯郸','邢台','保定','张家口','承德','沧州','廊坊','衡水','定州','辛集'],
    '北京': ['北京'],
    '天津': ['天津']
  };
  // 片区/分组展开
  const GROUP_EXPAND = { '甘宁青': ['甘肃','宁夏','青海'] };
  const AREA_EXPAND = { '蒙西': ['阿拉善盟','乌海','巴彦淖尔','鄂尔多斯'] };

  // 城市 -> 省份（反查）
  const CITY_PROVINCE = {};
  Object.keys(PROVINCE_CITIES).forEach((p) => {
    PROVINCE_CITIES[p].forEach((c) => { if (!CITY_PROVINCE[c]) CITY_PROVINCE[c] = p; });
  });

  function norm(s) {
    return String(s == null ? '' : s)
      .replace(/\s+/g, '')
      .replace(/(省|市|县|自治区|回族自治区|维吾尔自治区|壮族自治区|自治州|地区|区)$/, '');
  }

  // 解析「X（除A、B）」中的排除项
  function parseExclude(label) {
    const m = String(label || '').match(/（除([^）]+)）/);
    if (!m) return [];
    return m[1].split(/[、，,]/).map((x) => norm(x)).filter(Boolean);
  }

  // 计算某经理的覆盖集合（含排除）
  function coverageOf(m) {
    if (m.__cov) return m.__cov;
    const leaves = new Set();
    const excludes = new Set();
    const meta = [];
    (m.regions || []).forEach((r) => {
      let names = [];
      if (r.type === 'province') {
        names = [r.name].concat(PROVINCE_CITIES[r.name] || []);
      } else if (r.type === 'city' || r.type === 'county') {
        names = [r.name];
        const p = CITY_PROVINCE[r.name];
        if (p) names.push(p);
      } else if (r.type === 'group' || r.type === 'area') {
        const expand = (r.type === 'group' ? GROUP_EXPAND : AREA_EXPAND)[r.name] || [r.name];
        const out = [];
        expand.forEach((n) => {
          out.push(n);
          (PROVINCE_CITIES[n] || []).forEach((c) => out.push(c));
          if (CITY_PROVINCE[n]) out.push(CITY_PROVINCE[n]);
        });
        out.push(r.name); // 片区关键词本身（如「甘宁青」「蒙西」）
        names = out;
      } else {
        names = [r.name];
      }
      const ex = parseExclude(r.label || r.name);
      const label = r.label || r.name;
      meta.push({ names: names.slice(), type: r.type, label: label, excluded: ex });
      names.forEach((n) => leaves.add(norm(n)));
      ex.forEach((n) => excludes.add(norm(n)));
    });
    const cov = { leaves: leaves, excludes: excludes, meta: meta };
    m.__cov = cov;
    return cov;
  }

  // 本地查找
  function localLookup(rawQ) {
    const Q = norm(rawQ);
    if (Q.length < 2) return { ok: false, query: rawQ, error: '请输入至少两个字，例如「石家庄」' };
    const matches = [];
    const matchedProvinces = new Set();
    (window.NH_DATA.managers || []).forEach((m) => {
      const cov = coverageOf(m);
      if (cov.excludes.has(Q)) return;            // 该经理明确把此地划出
      if (!cov.leaves.has(Q)) return;             // 不在覆盖范围内
      const reasons = [];
      let anyAbroad = false;
      cov.meta.forEach((rm) => {
        if (rm.excluded.indexOf(Q) !== -1) return;
        const direct = rm.names.some((n) => norm(n) === Q);
        if (!direct) return;
        if (rm.type === 'abroad') anyAbroad = true;
        if (rm.type === 'province' || rm.type === 'area' || rm.type === 'group' || rm.type === 'abroad') {
          reasons.push('直接负责「' + rm.label + '」');
        } else {
          reasons.push('负责 ' + (rm.names.find((n) => norm(n) === Q) || Q));
        }
      });
      if (!reasons.length) reasons.push('负责 ' + Q);
      // 记录命中省份（用于「别拨错」提示）
      cov.meta.forEach((rm) => {
        if (rm.type === 'province') matchedProvinces.add(rm.name);
        rm.names.forEach((n) => { if (CITY_PROVINCE[norm(n)]) matchedProvinces.add(CITY_PROVINCE[norm(n)]); });
      });
      matches.push(Object.assign({}, m, { matchReasons: reasons, _abroad: anyAbroad }));
    });

    // 海外/全球类查询（所有命中均来自 abroad 区域）：让国际贸易专员排前
    if (matches.length && matches.every((m) => m._abroad)) {
      const overseasScore = (m) =>
        ((m.regionText || '').includes('国际贸易') ? 100 : 0) +
        (m.regions || []).filter((r) => r.type === 'abroad').length;
      matches.sort((a, b) => overseasScore(b) - overseasScore(a));
    }
    matches.forEach((m) => { delete m._abroad; });

    if (!matches.length) {
      return { ok: false, query: rawQ, error: '该区域暂未收录，或请换个写法（如地级市名）' };
    }

    // related：未命中但同省份另有负责人的，提示「别拨错」
    const related = [];
    if (matches.length === 1) {
      (window.NH_DATA.managers || []).forEach((m) => {
        if (matches[0].id === m.id) return;
        const cov = coverageOf(m);
        let same = false;
        cov.meta.forEach((rm) => {
          if (rm.type === 'province' && matchedProvinces.has(rm.name)) same = true;
          rm.names.forEach((n) => { if (CITY_PROVINCE[norm(n)] && matchedProvinces.has(CITY_PROVINCE[norm(n)])) same = true; });
        });
        if (same) related.push({ note: '', name: m.name, regionText: m.regionText });
      });
    }

    return { ok: true, query: rawQ, matches: matches, related: related };
  }

  // ===================== 工具 =====================
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtPhone(p) {
    const s = String(p || '');
    if (s.length !== 11) return s;
    return s.slice(0, 3) + ' ' + s.slice(3, 7) + ' ' + s.slice(7);
  }

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 1900);
  }

  function loadFavs() {
    try {
      const raw = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch (e) { return []; }
  }

  function saveFavs() {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(state.favs)); } catch (e) {}
  }

  function isFav(id) { return state.favs.some((f) => f.id === id); }

  function toggleFav(m) {
    if (isFav(m.id)) {
      state.favs = state.favs.filter((f) => f.id !== m.id);
      toast('已取消收藏 ' + m.name);
    } else {
      state.favs.unshift({
        id: m.id, name: m.name, phone: m.phone || '', phoneMasked: m.phoneMasked || '',
        phoneStatus: m.phoneStatus, regionText: m.regionText, note: m.note || '',
      });
      toast('已收藏 ' + m.name);
    }
    saveFavs();
    renderFavs();
    if (state.result) renderResult();
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { /* 走降级 */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  // ===================== 启动 =====================
  const state = {
    config: null,
    query: '',
    result: null,
    view: 'cards',
    favs: loadFavs(),
    timer: null,
    lastId: 0,
  };

  function boot() {
    const cfg = window.NH_DATA || {};
    state.config = cfg;
    const mgrs = (cfg.managers || []);
    $('#metaTotal').textContent = mgrs.length + ' 位区域经理';
    const d = new Date(cfg.updatedAt);
    if (!isNaN(d)) {
      $('#metaUpdated').textContent = '数据更新 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日';
    }
    const chips = $('#chips');
    (cfg.hotRegions || []).forEach((r) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = r;
      b.addEventListener('click', () => {
        $('#q').value = r;
        doSearch(r);
      });
      chips.appendChild(b);
    });
    renderFavs();
    const init = new URLSearchParams(location.search).get('q');
    if (init) {
      $('#q').value = init;
      doSearch(init);
    }
  }

  // ===================== 搜索（本地） =====================
  function doSearch(q) {
    const query = String(q || '').trim();
    if (query.length < 2) {
      toast('请输入至少两个字，例如「石家庄」');
      return;
    }
    if (query === state.query && state.result && state.result.ok) return;
    state.query = query;

    $('#btnSearch').textContent = '查找中';
    $('#btnSearch').disabled = true;
    // 模拟异步，保持 UI 一致
    setTimeout(() => {
      const data = localLookup(query);
      state.result = data;
      state.lastId = Date.now();
      renderResult();
      const sec = $('#resultSection');
      sec.hidden = false;
      const intro = $('#introSection');
      if (intro) intro.hidden = true;
      sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      $('#btnSearch').textContent = '查找';
      $('#btnSearch').disabled = false;
    }, 60);
  }

  // ===================== 渲染 =====================
  function buildCard(m, index) {
    const pending = m.phoneStatus === 'pending';
    const fav = isFav(m.id);
    const canCall = !pending && !!m.phone;
    const display = pending ? (m.phoneRaw || m.phoneMasked || '待补录') : (m.phone ? fmtPhone(m.phone) : (m.phoneMasked || ''));
    const revealable = !pending && !m.phone && m.masked;

    return `
      <article class="card ${index === 0 ? 'primary' : ''}" data-id="${m.id}">
        <div class="card-top">
          <div class="avatar">${esc((m.name || '?').slice(0, 1))}</div>
          <div class="card-id">
            <h3 class="card-name">
              ${esc(m.name)}
              ${pending ? '<span class="badge pending">号码待核实</span>' : '<span class="badge ok">区域经理</span>'}
            </h3>
            <p class="card-region">负责：${esc(m.regionText || '—')}</p>
          </div>
          <button class="star ${fav ? 'on' : ''}" type="button" data-act="fav" aria-label="收藏" title="收藏">
            <svg viewBox="0 0 24 24" fill="${fav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">
              <path d="M12 4.5l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4L4.2 10.2l5.4-.8z"/>
            </svg>
          </button>
        </div>
        ${m.matchReasons && m.matchReasons.length ? `<p class="card-reason">匹配：${esc(m.matchReasons.join('；'))}</p>` : ''}
        <div class="phone-line">
          <div class="phone-num ${pending ? 'dim' : ''}">${esc(display)}</div>
          <div class="phone-hint">${pending ? '待补录' : '手机一键拨号'}</div>
        </div>
        <div class="actions">
          ${canCall
            ? `<a class="btn btn-primary" href="tel:${esc(m.phone)}">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6.6 3.5h3l1.6 4-2 1.4a12 12 0 005.9 5.9l1.4-2 4 1.6v3a2 2 0 01-2.2 2A16.5 16.5 0 014.6 5.7a2 2 0 012-2.2z"/></svg>
                 拨打电话</a>`
            : revealable
              ? `<button class="btn btn-primary" type="button" data-act="reveal">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/></svg>
                   查看完整号码</button>`
              : `<button class="btn" type="button" aria-disabled="true" disabled>号码待核实</button>`}
          ${canCall ? `<button class="btn btn-ghost" type="button" data-act="copy" data-text="${esc(m.phone)}">复制号码</button>` : ''}
        </div>
        ${pending && m.note ? `<p class="card-note">${esc(m.note)}</p>` : ''}
      </article>`;
  }

  function renderResult() {
    const r = state.result;
    const box = $('#result');
    const relBox = $('#related');
    const sec = $('#resultSection');
    if (!r) return;

    if (!r.ok) {
      $('#resultTitle').textContent = `没有找到「${r.query}」`;
      box.innerHTML = `
        <div class="empty">
          <div class="empty-mark">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>
            </svg>
          </div>
          <h3>换个写法试试</h3>
          <p>${esc(r.error || '建议输入地级市或县名')}<br>例如：石家庄市、潍坊、周口、鄂尔多斯、甘宁青</p>
        </div>`;
      relBox.innerHTML = '';
      sec.hidden = false;
      return;
    }

    $('#resultTitle').textContent = `「${r.query}」 · ${r.matches.length} 位负责人`;

    if (state.view === 'table') {
      box.innerHTML = `
        <div class="table-wrap">
          <table class="grid">
            <thead><tr>
              <th style="width:120px">销售经理</th><th>负责区域</th><th style="width:150px">联系方式</th><th style="width:170px">匹配原因</th>
            </tr></thead>
            <tbody>
              ${r.matches.map((m) => `
                <tr>
                  <td><b>${esc(m.name)}</b>${m.phoneStatus === 'pending' ? ' <span class="badge pending">待核实</span>' : ''}</td>
                  <td>${esc(m.regionText)}</td>
                  <td class="num">${m.phoneStatus === 'pending' ? esc(m.phoneRaw || '待补录') : (m.phone ? `<a href="tel:${esc(m.phone)}" style="color:var(--red)">${esc(fmtPhone(m.phone))}</a>` : esc(m.phoneMasked || ''))}</td>
                  <td style="font-size:12px;color:var(--muted)">${esc((m.matchReasons || []).join('；'))}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    } else {
      box.innerHTML = `<div class="cards">${r.matches.map((m, i) => buildCard(m, i)).join('')}</div>`;
    }

    relBox.innerHTML = (r.related && r.related.length)
      ? `<div class="related">
           <b>区域有划分，别拨错：</b><br>
           ${r.related.map((x) => `${esc(x.note)}（<b>${esc(x.name)}</b>：${esc(x.regionText)}）`).join('<br>')}
         </div>`
      : '';

    if (r.matches.length === 1 && (r.matches[0].regions || []).length > 1) {
      const chips = r.matches[0].regions
        .map((x) => x.label || x.name)
        .map((label) => `<button class="chip" type="button" data-q="${esc(label)}">${esc(label)}</button>`)
        .join('');
      relBox.innerHTML += `<div class="related">
        <b>${esc(r.matches[0].name)}</b> 还负责这些区域，点一下直接查：<br>
        <div class="chips" style="padding:8px 0 0;max-width:none;flex-wrap:wrap;overflow:visible">${chips}</div>
      </div>`;
    }
  }

  function renderFavs() {
    const sec = $('#favSection');
    const list = $('#favList');
    if (!state.favs.length) { sec.hidden = true; list.innerHTML = ''; return; }
    sec.hidden = false;
    list.innerHTML = state.favs.map((m, i) => buildCard(Object.assign({}, m, { matchReasons: [] }), i)).join('');
  }

  // ===================== 交互 =====================
  document.addEventListener('click', async (ev) => {
    const star = ev.target.closest('[data-act="fav"]');
    const copy = ev.target.closest('[data-act="copy"]');
    const jump = ev.target.closest('[data-q]');
    const card = ev.target.closest('.card');

    if (jump) {
      let q = jump.dataset.q;
      q = q.replace(/（.*$/, ''); // 片区标签去掉括号说明
      $('#q').value = q;
      state.query = '';
      doSearch(q);
      return;
    }
    if (star && card) {
      ev.preventDefault();
      const id = Number(card.dataset.id);
      const m = findContact(id);
      if (m) toggleFav(m);
      return;
    }
    if (copy) {
      const text = copy.dataset.text || (findContact(Number(card.dataset.id)) || {}).phone || '';
      if (!text) { toast('没有可复制的号码'); return; }
      const ok = await copyText(text);
      toast(ok ? '号码已复制' : '复制失败，请长按号码手动复制');
      return;
    }
  });

  function findContact(id) {
    if (state.result && state.result.ok) {
      const inRes = state.result.matches.find((m) => m.id === id);
      if (inRes) return inRes;
    }
    return state.favs.find((f) => f.id === id) || null;
  }

  $('#btnSearch').addEventListener('click', () => doSearch($('#q').value));

  $('#q').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); $('#q').blur(); doSearch($('#q').value); }
  });

  $('#q').addEventListener('input', () => {
    clearTimeout(state.timer);
    const v = $('#q').value.trim();
    if (v.length < 2) return;
    state.timer = setTimeout(() => doSearch(v), 520);
  });

  $('#viewToggle').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-view]');
    if (!btn) return;
    state.view = btn.dataset.view;
    [...$('#viewToggle').children].forEach((b) => b.classList.toggle('on', b === btn));
    renderResult();
  });

  $('#clearFav').addEventListener('click', () => {
    if (!state.favs.length) return;
    state.favs = [];
    saveFavs();
    renderFavs();
    toast('已清空收藏');
  });

  boot();
})();
