# 價錢曲線（2026-10-16，沒有輪迴的 beta 用；舊的 curve.py 是有輪迴時的做法）
# 想法：
#   1. ORDER 排好 52 級的購買順序；第 k 次購買大約在第 T(k) 分鐘（前面快、後面慢，最後一級「一次多投 Lv 2」前面留一段存錢的時間）。
#   2. 用 tools/rate.mjs 量「買了前 k 個升級」時每分鐘淨賺多少。
#   3. 第 k 級的價錢 = 從第 k-1 次購買到第 k 次購買之間賺到的錢。這樣照順序買，剛好在排定的時間買得起。
# 用法：
#   python3 tools/curve2.py states 組合.json          產生要量的升級組合（給 rate.mjs）
#   python3 tools/curve2.py prices 量到的.json [beta/app.js]   算價錢；給了 app.js 就寫進去
import json, sys, re

ORDER = '''refill guard coinMix coinMix refill guard coinMix dropRate gems speed
rain coinMix shake refill guard rainSize coinMix dropRate summon rainCool
lottery gems shakeCool coinMix gemCap shake speed dollCap multi coinMix
rain dropRate rainSize summon rainCool coinMix gems shakeCool shake gemCap
lottery coinMix rain summon rainSize coinMix shakeCool rainCool dollCap gemCap
lottery multi'''.split()
END = 180      # 全部買完是第幾分鐘（目標 2 到 4 小時，取中間 3 小時）
LAST_GAP = 15  # 最後一級（一次多投 Lv 2）前面留幾分鐘存錢
EXP = 1.45     # 越大前面越快、後面越慢

N = len(ORDER)
def T(k):  # 第 k 次購買（從 1 開始）在第幾分鐘
    if k <= 0: return 0.0
    if k == N: return float(END)
    return (END - LAST_GAP) * (k / (N - 1)) ** EXP

CHECK = [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 29, 32, 35, 38, 41, 44, 47, 50, 51]

def state(k):
    st = {}
    for key in ORDER[:k]: st[key] = st.get(key, 0) + 1
    return st

def nice(x):
    if x <= 100: return max(10, round(x / 10) * 10)
    if x <= 1000: return round(x / 50) * 50
    if x <= 10000: return round(x / 100) * 100
    return round(x / 1000) * 1000

def rate_fn(measured):
    # 量到的淨賺取「只升不降」（多買了升級不該賺得少，量到變少是誤差）
    ks = [m['k'] for m in measured]
    best, rs = 0, []
    for m in measured:
        best = max(best, m['net']); rs.append(max(best, 20))
    def r(k):
        if k <= ks[0]: return rs[0]
        for i in range(1, len(ks)):
            if k <= ks[i]:
                f = (k - ks[i - 1]) / (ks[i] - ks[i - 1])
                return rs[i - 1] * (1 - f) + rs[i] * f
        return rs[-1]
    return r

if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'states':
        json.dump([state(k) for k in CHECK], open(sys.argv[2], 'w'))
        for k in CHECK: print(k, round(T(k), 1), state(k))
    elif cmd == 'prices':
        out = json.load(open(sys.argv[2]))
        measured = [{'k': k, 'net': o['net']} for k, o in zip(CHECK, out)]
        r = rate_fn(measured)
        prices, rows = {}, []
        for k in range(1, N + 1):
            key = ORDER[k - 1]
            p = nice(r(k - 1) * (T(k) - T(k - 1)))
            ps = prices.setdefault(key, [])
            if ps and p <= ps[-1]: p = nice(ps[-1] * 1.15)
            ps.append(p)
            rows.append((k, round(T(k), 1), key, len(ps), p, round(r(k - 1))))
        for row in rows: print('第 %2d 次 %5.1f 分 %-10s Lv %d  %6d 枚（那時每分鐘淨賺 %d）' % row)
        m1, m2 = prices['multi']
        others = max(p for k, ps in prices.items() if k != 'multi' for p in ps)
        if m2 < max(m1 * 10, others * 1.2):
            prices['multi'][1] = nice(max(m1 * 10, others * 1.2))
            print('一次多投 Lv 2 拉到', prices['multi'][1], '（至少第 1 級的 10 倍、比其他都貴）')
        for k, ps in prices.items(): print(f'{k}: {ps}')
        print('全部升滿：', sum(sum(p) for p in prices.values()))
        if len(sys.argv) > 3:
            path = sys.argv[3]
            s = open(path, encoding='utf-8').read()
            for k, ps in prices.items():
                pat = re.compile(r'(\n  ' + k + r': \{\n(?:    .*\n)*?)    prices: [^\n]*\n')
                s, n = pat.subn(lambda m: m.group(1) + f'    prices: [{", ".join(map(str, ps))}],\n', s, count=1)
                assert n == 1, k
            open(path, 'w', encoding='utf-8').write(s)
            print('寫進', path)
