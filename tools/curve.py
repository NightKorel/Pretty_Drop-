# 價格曲線（2026-10-06）：照模擬量到的收入，算出每一級的價錢。
# 想法：先排好「每一級大約第幾分鐘該買得起」（SCHEDULE），價錢 = 那時候每分鐘淨賺 × W 分鐘。
# 收入會跟著價錢變，所以要來回幾次：改價錢 → 跑 tools/cycle.mjs（OUTJSON=檔名）→ 再算一次。
# 用法：python3 tools/curve.py 模擬.json [要寫進去的 app.js]
import json, sys, re

# 每一級大約第幾分鐘買得起（第一輪）。各項接力：一項快買完，下一項剛好接上
SCHEDULE = {
    'refill':   [0.2, 1, 2, 3.5, 5, 7, 9],
    'guard':    [0.5, 1.5, 3, 4.5, 6, 8, 10],
    'silver':   [1, 4, 7, 11, 16, 22],
    'speed':    [2.5, 4, 5.5, 7.5, 9.5, 12, 14],
    'dropRate': [3, 5, 6.5, 8.5, 10.5, 13],
    'rain':     [8, 11, 15, 19, 24, 29, 34, 39],
    'rainSize': [12, 17, 21, 26, 31, 36, 42],
    'gold':     [14, 19, 25, 32, 40, 48, 56, 64, 72, 80],  # 後面幾級是長尾（第二輪以後慢慢買）
    'shake':    [18, 23, 28, 33, 38, 44],
    'summon':   [22, 27, 32, 37, 43, 48],
    'multi':    [30],  # 第二級是第一級的 10 倍（納可：天價）
}
W = 0.6  # 每一級的價錢大約是「那時候 W 分鐘的淨賺」

def nice(x):
    if x <= 100: return max(10, round(x / 10) * 10)
    if x <= 1000: return round(x / 50) * 50
    if x <= 10000: return round(x / 100) * 100
    return round(x / 1000) * 1000

def rates(rows):
    # 每分鐘淨賺 = 手上的錢變多少 + 這分鐘花在商店的錢
    out, pw, ps = [], 30, 0
    for r in rows:
        out.append(r['wallet'] - pw + r['spent'] - ps)
        pw, ps = r['wallet'], r['spent']
    # 前後 2 分鐘平均，只升不降
    sm = []
    for i in range(len(out)):
        seg = out[max(0, i - 2):i + 3]
        sm.append(sum(seg) / len(seg))
    best = 0
    for i in range(len(sm)):
        best = max(best, sm[i]); sm[i] = max(best, 20)
    return sm

def rate_at(sm, t):
    if t <= 0.5: return sm[0]
    i = t - 0.5
    if i >= len(sm) - 1:
        # 超過模擬的時間：照最後 10 分鐘的成長速度往後推
        g = (sm[-1] / sm[-11]) ** (1 / 10) if len(sm) > 11 else 1.03
        return sm[-1] * g ** (i - (len(sm) - 1))
    a = int(i); f = i - a
    return sm[a] * (1 - f) + sm[a + 1] * f

def build(sm):
    prices = {}
    for k, ts in SCHEDULE.items():
        ps, prev = [], 0
        for t in ts:
            p = nice(W * rate_at(sm, t))
            if p <= prev: p = nice(prev * 1.15) if prev >= 100 else prev + 10
            ps.append(p); prev = p
        if k == 'multi': ps.append(ps[0] * 10)
        prices[k] = ps
    return prices

if __name__ == '__main__':
    d = json.load(open(sys.argv[1]))
    sm = rates(d['run1'])
    print('每分鐘淨賺（平滑後）：', ' '.join(str(round(x)) for x in sm))
    prices = build(sm)
    for k, ps in prices.items(): print(f'{k}: {ps}')
    print('全部升滿：', sum(sum(p) for p in prices.values()))
    if len(sys.argv) > 2:
        path = sys.argv[2]
        s = open(path, encoding='utf-8').read()
        for k, ps in prices.items():
            pat = re.compile(r'(\n  ' + k + r': \{\n(?:    .*\n)*?)    (?:base|prices): [^\n]*\n')
            s, n = pat.subn(lambda m: m.group(1) + f'    prices: [{", ".join(map(str, ps))}], // tools/curve.py 照模擬的收入算的（2026-10-06）\n', s, count=1)
            assert n == 1, k
        open(path, 'w', encoding='utf-8').write(s)
        print('寫進', path)
