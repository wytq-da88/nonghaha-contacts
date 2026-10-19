import json, re

PROVINCE_CITIES = {
 '陕西':['西安','铜川','宝鸡','咸阳','渭南','延安','汉中','榆林','安康','商洛'],
 '安徽':['合肥','芜湖','蚌埠','淮南','马鞍山','淮北','铜陵','安庆','黄山','滁州','阜阳','宿州','六安','亳州','池州','宣城'],
 '吉林':['长春','吉林','四平','辽源','通化','白山','松原','白城','延边'],
 '西藏':['拉萨','日喀则','昌都','林芝','山南','那曲','阿里'],
 '新疆':['乌鲁木齐','克拉玛依','吐鲁番','哈密','昌吉','博尔塔拉','巴音郭楞','阿克苏','克孜勒苏','喀什','和田','伊犁','塔城','阿勒泰'],
 '黑龙江':['哈尔滨','齐齐哈尔','鸡西','鹤岗','双鸭山','大庆','伊春','佳木斯','七台河','牡丹江','黑河','绥化','大兴安岭'],
 '湖北':['武汉','黄石','十堰','宜昌','襄阳','鄂州','荆门','孝感','荆州','黄冈','咸宁','随州','恩施','仙桃','潜江','天门','神农架'],
 '四川':['成都','自贡','攀枝花','泸州','德阳','绵阳','广元','遂宁','内江','乐山','南充','眉山','宜宾','广安','达州','雅安','巴中','资阳','阿坝','甘孜','凉山'],
 '云南':['昆明','曲靖','玉溪','保山','昭通','丽江','普洱','临沧','楚雄','红河','文山','西双版纳','大理','德宏','怒江','迪庆'],
 '江苏':['南京','无锡','徐州','常州','苏州','南通','连云港','淮安','盐城','扬州','镇江','泰州','宿迁'],
 '辽宁':['沈阳','大连','鞍山','抚顺','本溪','丹东','锦州','营口','阜新','辽阳','盘锦','铁岭','朝阳','葫芦岛'],
 '山西':['太原','大同','阳泉','长治','晋城','朔州','晋中','运城','忻州','临汾','吕梁'],
 '甘肃':['兰州','嘉峪关','金昌','白银','天水','武威','张掖','平凉','酒泉','庆阳','定西','陇南','临夏','甘南'],
 '宁夏':['银川','石嘴山','吴忠','固原','中卫'],
 '青海':['西宁','海东','海北','黄南','海南','果洛','玉树','海西'],
 '内蒙古':['呼和浩特','包头','乌海','赤峰','通辽','鄂尔多斯','呼伦贝尔','巴彦淖尔','乌兰察布','兴安盟','锡林郭勒盟','锡林郭勒','阿拉善盟','鄂托克前旗','乌审旗'],
 '山东':['济南','青岛','淄博','枣庄','东营','烟台','潍坊','济宁','泰安','威海','日照','临沂','德州','聊城','滨州','菏泽'],
 '河南':['郑州','开封','洛阳','平顶山','安阳','鹤壁','新乡','焦作','濮阳','许昌','漯河','三门峡','南阳','商丘','信阳','周口','驻马店','济源'],
 '河北':['石家庄','唐山','秦皇岛','邯郸','邢台','保定','张家口','承德','沧州','廊坊','衡水','定州','辛集'],
 '北京':['北京'],'天津':['天津']}
GROUP_EXPAND={'甘宁青':['甘肃','宁夏','青海']}
AREA_EXPAND={'蒙西':['阿拉善盟','乌海','巴彦淖尔','鄂尔多斯']}
CITY_PROVINCE={}
for p,cs in PROVINCE_CITIES.items():
    for c in cs:
        if c not in CITY_PROVINCE: CITY_PROVINCE[c]=p

def norm(s):
    s=str(s or '').replace(' ','')
    return re.sub(r'(省|市|县|自治区|回族自治区|维吾尔自治区|壮族自治区|自治州|地区|区)$','',s)

def parse_exclude(label):
    m=re.search(r'（除([^）]+)）',str(label or ''))
    if not m: return []
    return [norm(x) for x in re.split(r'[、，,]',m.group(1)) if x.strip()]

def coverage_of(m):
    leaves=set(); excludes=set(); meta=[]
    for r in m.get('regions',[]):
        if r['type']=='province':
            names=[r['name']]+PROVINCE_CITIES.get(r['name'],[])
        elif r['type'] in('city','county'):
            names=[r['name']]
            p=CITY_PROVINCE.get(r['name'])
            if p: names.append(p)
        elif r['type']=='group':
            names=GROUP_EXPAND.get(r['name'],[r['name']])
            for n in names[:]:
                for c in PROVINCE_CITIES.get(n,[]): names.append(c)
                if CITY_PROVINCE.get(n): names.append(CITY_PROVINCE[n])
            names.append(r['name'])
        elif r['type']=='area':
            names=AREA_EXPAND.get(r['name'],[r['name']])
            for n in names[:]:
                for c in PROVINCE_CITIES.get(n,[]): names.append(c)
                if CITY_PROVINCE.get(n): names.append(CITY_PROVINCE[n])
            names.append(r['name'])
        else:
            names=[r['name']]
        ex=parse_exclude(r.get('label') or r['name'])
        label=r.get('label') or r['name']
        meta.append({'names':names[:],'type':r['type'],'label':label,'excluded':ex})
        for n in names: leaves.add(norm(n))
        for n in ex: excludes.add(norm(n))
    return {'leaves':leaves,'excludes':excludes,'meta':meta}

def lookup(rawq):
    Q=norm(rawq)
    if len(Q)<2: return []
    res=[]
    for m in DATA['managers']:
        cov=coverage_of(m)
        if cov['excludes'] & {Q}: continue
        if Q not in cov['leaves']: continue
        res.append((m['id'],m['name'],m['regionText']))
    return res

DATA=json.load(open('data/contacts.json',encoding='utf-8'))
cases=['亳州','太康','周口','山东','山西','太原','运城','鄂尔多斯','陕西','西安','内蒙古','呼伦贝尔','甘宁青','甘肃','安徽','合肥','石家庄','郑州','湖北','武汉','蒙西','锡林郭勒','新疆','西藏']
print('经理总数:',len(DATA['managers']))
for c in cases:
    print(f'{c:6s} ->', lookup(c))
