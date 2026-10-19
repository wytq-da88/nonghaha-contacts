'use strict';
// 本地验证：加载 data.js，复刻 app.js 的核心匹配逻辑，确认海外/全球关键词可命中
const fs = require('fs');
const path = require('path');

const code = fs.readFileSync(path.join(__dirname, '..', 'data.js'), 'utf8');
const NH_DATA = new Function('window', code + '\nreturn window.NH_DATA;')({});

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
const GROUP_EXPAND = { '甘宁青': ['甘肃','宁夏','青海'] };
const AREA_EXPAND = { '蒙西': ['阿拉善盟','乌海','巴彦淖尔','鄂尔多斯'] };
const CITY_PROVINCE = {};
Object.keys(PROVINCE_CITIES).forEach((p) => {
  PROVINCE_CITIES[p].forEach((c) => { if (!CITY_PROVINCE[c]) CITY_PROVINCE[c] = p; });
});

function norm(s) {
  return String(s == null ? '' : s)
    .replace(/\s+/g, '')
    .replace(/(省|市|县|自治区|回族自治区|维吾尔自治区|壮族自治区|自治州|地区|区)$/, '');
}
function parseExclude(label) {
  const m = String(label || '').match(/（除([^）]+)）/);
  if (!m) return [];
  return m[1].split(/[、，,]/).map((x) => norm(x)).filter(Boolean);
}
function coverageOf(m) {
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
      out.push(r.name);
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
  return { leaves: leaves, excludes: excludes, meta: meta };
}
function localLookup(rawQ) {
  const Q = norm(rawQ);
  if (Q.length < 2) return { ok: false, error: 'too short' };
  const matches = [];
  (NH_DATA.managers || []).forEach((m) => {
    const cov = coverageOf(m);
    if (cov.excludes.has(Q)) return;
    if (!cov.leaves.has(Q)) return;
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
    matches.push({ id: m.id, name: m.name, phone: m.phone, reasons: reasons, regionText: m.regionText, regions: m.regions, _abroad: anyAbroad });
  });
  if (matches.length && matches.every((m) => m._abroad)) {
    const overseasScore = (m) =>
      ((m.regionText || '').includes('国际贸易') ? 100 : 0) +
      (m.regions || []).filter((r) => r.type === 'abroad').length;
    matches.sort((a, b) => overseasScore(b) - overseasScore(a));
  }
  matches.forEach((m) => { delete m._abroad; });
  return matches.length ? { ok: true, matches: matches } : { ok: false, error: '未收录' };
}

const tests = ['国外','海外','国际','国际贸易','非洲','澳洲','澳大利亚','中亚','南美洲','南美','全球','贵州','江西','福建','广东','广西','云南','西藏'];
console.log('== 海外/全球 关键词命中验证 ==');
let fail = 0;
tests.forEach((q) => {
  const r = localLookup(q);
  if (!r.ok) {
    console.log(`✗ ${q.padEnd(6)} → 未命中`);
    fail++;
  } else {
    const names = r.matches.map((m) => `${m.name}(${m.reasons[0]})`).join('、');
    console.log(`✓ ${q.padEnd(6)} → ${names}`);
  }
});
console.log(fail ? `\n有 ${fail} 个关键词未命中` : '\n全部命中 ✅');

// ============ 排序断言 ============
console.log('\n== 排序断言 ==');
let orderFail = 0;
function firstOf(q) { const r = localLookup(q); return r.ok ? r.matches[0].name : '(无)'; }
const orderChecks = [
  ['国外', '曹蒙'],
  ['国际', '曹蒙'],
  ['海外', '曹蒙'],
  ['非洲', '曹蒙'],
  ['全球', '王志勇'],
  ['云南', '宋宝军'],   // 国内顺序保持不变
  ['贵州', '王志勇'],
];
orderChecks.forEach(([q, expect]) => {
  const got = firstOf(q);
  if (got === expect) {
    console.log(`✓ ${q.padEnd(4)} → 第一：${got}`);
  } else {
    console.log(`✗ ${q.padEnd(4)} → 第一：${got}（期望 ${expect}）`);
    orderFail++;
  }
});

const total = fail + orderFail;
console.log(total ? `\n存在 ${total} 个问题` : '\n命中与排序全部通过 ✅');
process.exit(total ? 1 : 0);
