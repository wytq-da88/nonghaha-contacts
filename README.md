# 农哈哈播种部 · 全国销售服务通讯录（静态版）

纯静态、零后端的「输入地区 → 找到负责该片区的区域经理」查询页。
部署在 GitHub Pages，任何人都可免费访问。

## 文件说明
- `index.html` — 页面结构（相对路径，适配 GitHub Pages 子目录）
- `app.css` — 样式（原站点一致）
- `app.js` — 前端逻辑 + **本地匹配引擎**（含「安徽除亳州」「周口除太康」「蒙西/甘宁青」等片区与排除语义）
- `data.js` — 内嵌数据（`window.NH_DATA`，由 `data/contacts.json` 生成）
- `data/contacts.json` — 经理数据（原始抓取）
- `scripts/` — 抓取/校验脚本（可选，依赖内网服务器）

## 本地预览
```bash
python -m http.server 8099
# 打开 http://localhost:8099/
```

## 更新数据
1. 用 `scripts/harvest.py` 从内网服务器重新抓取（需要能访问 192.168.1.102:3210）；
2. 重新生成：`python -c "import json;d=json.load(open('data/contacts.json',encoding='utf-8'));open('data.js','w',encoding='utf-8').write('window.NH_DATA = '+json.dumps(d,ensure_ascii=False,indent=1)+';')"`；
3. 推送到 GitHub，Pages 会自动更新。

## 匹配规则
- 输入市 / 县 / 旗 / 省 / 片区（如「蒙西」「甘宁青」）均可识别；
- 带「市/县/省」后缀也能匹配；
- 排除语义：如「安徽除亳州」会把亳州客户正确导向专门负责亳州的经理。

> 注意：本仓库为**公开仓库**，经理手机号对全网可见。如需隐藏号码，可改用 `phoneMasked` 字段并在 `app.js` 中默认打码。
