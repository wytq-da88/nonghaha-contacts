#!/usr/bin/env python3
import json, urllib.request, time, sys

BASE = "http://192.168.1.102:3210"
PROVINCES = ["北京","天津","上海","重庆","河北","山西","内蒙古","辽宁","吉林","黑龙江",
             "江苏","浙江","安徽","福建","江西","山东","河南","湖北","湖南","广东",
             "广西","海南","四川","贵州","云南","西藏","陕西","甘肃","青海","宁夏",
             "新疆","香港","澳门","台湾"]
SPECIALS = ["甘宁青","蒙西","蒙东","海南","广东","西藏"]
CITIES = """北京 天津 上海 重庆 石家庄 唐山 秦皇岛 邯郸 邢台 保定 张家口 承德 沧州 廊坊 衡水
太原 大同 阳泉 长治 晋城 朔州 晋中 运城 忻州 临汾 吕梁 呼和浩特 包头 乌海 赤峰 通辽
鄂尔多斯 呼伦贝尔 巴彦淖尔 乌兰察布 兴安盟 锡林郭勒 阿拉善 沈阳 大连 鞍山 抚顺 本溪
丹东 锦州 营口 阜新 辽阳 盘锦 铁岭 朝阳 葫芦岛 长春 吉林 四平 辽源 通化 白山 松原
白城 延边 哈尔滨 齐齐哈尔 鸡西 鹤岗 双鸭山 大庆 伊春 佳木斯 七台河 牡丹江 黑河 绥化
南京 无锡 徐州 常州 苏州 南通 连云港 淮安 盐城 扬州 镇江 泰州 宿迁 杭州 宁波 温州
嘉兴 湖州 绍兴 金华 衢州 舟山 台州 丽水 合肥 芜湖 蚌埠 淮南 马鞍山 淮北 铜陵 安庆
黄山 滁州 阜阳 宿州 六安 亳州 池州 宣城 福州 厦门 莆田 三明 泉州 漳州 南平 龙岩 宁德
南昌 景德镇 萍乡 九江 新余 鹰潭 赣州 吉安 宜春 抚州 上饶 济南 青岛 淄博 枣庄 东营
烟台 潍坊 济宁 泰安 威海 日照 临沂 德州 聊城 滨州 菏泽 郑州 开封 洛阳 平顶山 安阳
鹤壁 新乡 焦作 濮阳 许昌 漯河 三门峡 南阳 商丘 信阳 周口 驻马店 济源 武汉 黄石 十堰
宜昌 襄阳 鄂州 荆门 孝感 荆州 黄冈 咸宁 随州 恩施 长沙 株洲 湘潭 衡阳 邵阳 岳阳 常德
张家界 益阳 郴州 永州 怀化 娄底 广州 韶关 深圳 珠海 汕头 佛山 江门 湛江 茂名 肇庆
惠州 梅州 汕尾 河源 阳江 清远 东莞 中山 潮州 揭阳 云浮 南宁 柳州 桂林 梧州 北海 防城港
钦州 贵港 玉林 百色 贺州 河池 来宾 崇左 海口 三亚 儋州 成都 自贡 攀枝花 泸州 德阳 绵阳
广元 遂宁 内江 乐山 南充 宜宾 广安 达州 雅安 眉山 资阳 贵阳 六盘水 遵义 安顺 毕节
铜仁 昆明 曲靖 玉溪 保山 昭通 丽江 普洱 临沧 楚雄 红河 文山 大理 德宏 拉萨 昌都 山南
林芝 日喀则 西安 铜川 宝鸡 咸阳 渭南 延安 汉中 榆林 安康 商洛 兰州 嘉峪关 金昌 白银
天水 武威 张掖 平凉 酒泉 庆阳 定西 陇南 西宁 海东 银川 石嘴山 吴忠 固原 中卫 乌鲁木齐
克拉玛依 吐鲁番 哈密 昌吉 巴音郭楞 阿克苏 喀什 和田 伊犁 塔城 阿勒泰""".split()

def post(q, tries=4):
    for _ in range(tries):
        try:
            req = urllib.request.Request(BASE + "/api/lookup",
                data=json.dumps({"q": q}).encode(),
                headers={"Content-Type": "application/json"}, method="POST")
            with urllib.request.urlopen(req, timeout=8) as r:
                return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(1.5); continue
            return None
        except Exception:
            time.sleep(0.8); continue
    return None

seen = {m["id"]: m for m in json.load(open("data/contacts.json", encoding="utf-8"))["managers"]}
new = 0
for q in PROVINCES + SPECIALS + CITIES:
    res = post(q)
    if res and res.get("ok"):
        for m in res.get("matches", []):
            if m["id"] not in seen:
                seen[m["id"]] = m; new += 1
                print("NEW #%d %s %s [%s]" % (m["id"], m["name"], m.get("phone",""), m.get("regionText","")))
    time.sleep(0.3)

mgrs = sorted(seen.values(), key=lambda x: x.get("id", 0))
d = json.load(open("data/contacts.json", encoding="utf-8"))
d["managers"] = mgrs
json.dump(d, open("data/contacts.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("total now:", len(mgrs), "new this sweep:", new)
