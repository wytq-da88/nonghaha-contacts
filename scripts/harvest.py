#!/usr/bin/env python3
# 从在线后端(192.168.1.102:3210)抓取全部区域经理数据，按 id 去重，存为 data/contacts.json
import json, urllib.request, os, time

BASE = "http://192.168.1.102:3210"
PROVINCES = ["北京","天津","上海","重庆","河北","山西","内蒙古","辽宁","吉林","黑龙江",
             "江苏","浙江","安徽","福建","江西","山东","河南","湖北","湖南","广东",
             "广西","海南","四川","贵州","云南","西藏","陕西","甘肃","青海","宁夏",
             "新疆","香港","澳门","台湾"]
SPECIALS = ["甘宁青","蒙西","蒙东"]

os.makedirs("data", exist_ok=True)
seen = {}
config = None

def post(path, payload):
    req = urllib.request.Request(BASE + path, data=json.dumps(payload).encode(),
                                headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=8) as r:
            return json.loads(r.read().decode())
    except Exception as e:
        print("ERR", path, payload, e)
        return None

# config
try:
    with urllib.request.urlopen(BASE + "/api/config", timeout=8) as r:
        config = json.loads(r.read().decode())
except Exception as e:
    print("config err", e)

for q in PROVINCES + SPECIALS:
    res = post("/api/lookup", {"q": q})
    if not res or not res.get("ok"):
        continue
    for m in res.get("matches", []):
        seen[m["id"]] = m
    time.sleep(0.15)

managers = list(seen.values())
managers.sort(key=lambda x: x.get("id", 0))
out = {
    "brand": (config or {}).get("brand", "农哈哈播种部 · 全国销售服务通讯录"),
    "updatedAt": (config or {}).get("updatedAt"),
    "hotRegions": (config or {}).get("hotRegions", []),
    "privacyMode": (config or {}).get("privacyMode", "full"),
    "managers": managers,
}
with open("data/contacts.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)

print("抓取经理数:", len(managers), "/ config.total:", (config or {}).get("total"))
# 输出每个经理覆盖的区域摘要，便于核对
for m in managers:
    print(f"  #{m['id']:>2} {m['name']:<6} {m.get('phone','')}  [{m.get('regionText','')}]")
