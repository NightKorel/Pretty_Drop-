# 彩券轉盤的平均回本（2026-10-16）：算「只花錢抽」「只用免費抽」平均一次拿回幾枚。
# 大獎用保底式機率（跟遊戲裡的 PseudoRandom 一樣），獎池起始 500、花錢抽 +30、免費抽 +10。
# 格子照 beta/app.js 的 WHEEL 讀進來，不用手抄。用法：python3 tools/wheel_ev.py [beta/app.js]
import re, sys

src = open(sys.argv[1] if len(sys.argv) > 1 else 'beta/app.js', encoding='utf-8').read()
block = src[src.index('const WHEEL = ['):src.index('];', src.index('const WHEEL = ['))]
cells = []
pc = re.search(r'const P_CELL = ([^;]+);', src)
P_CELL = eval(pc.group(1)) if pc else None
for m in re.finditer(r'\{ coins: (\d+),(?: big: true,)?(?: jackpot: true,)? p: ([0-9./ ]+|P_CELL) \}', block):
    cells.append((int(m.group(1)), eval(m.group(2)), 'jackpot' in m.group(0)))
PRICE = int(re.search(r'WHEEL_BASE_PRICE = (\d+)', src).group(1))
START = int(re.search(r'JACKPOT_START = (\d+)', src).group(1))
ADD_PAY = int(re.search(r'JACKPOT_ADD_PAY = (\d+)', src).group(1))
ADD_FREE = int(re.search(r'JACKPOT_ADD_FREE = (\d+)', src).group(1))
pj = [p for c, p, j in cells if j][0]

def rate_of(c):
    not_yet, exp, n = 1.0, 0.0, 1
    while not_yet > 1e-12:
        hit = min(1, c * n) * not_yet
        exp += n * hit; not_yet -= hit; n += 1
    return 1 / exp, exp

lo, hi = 0.0, pj
for _ in range(60):
    mid = (lo + hi) / 2
    if rate_of(mid)[0] < pj: lo = mid
    else: hi = mid
c = (lo + hi) / 2
# 第 n 抽才中大獎的機率，算「中的時候獎池平均多大」
not_yet, n, e_pool_spins = 1.0, 1, 0.0
while not_yet > 1e-12:
    hit = min(1, c * n) * not_yet
    e_pool_spins += n * hit; not_yet -= hit; n += 1
others = sum(cv * p for cv, p, j in cells if not j)
total_p = sum(p for cv, p, j in cells)
print(f'格子機率加起來 {total_p:.4f}（要是 1）')
print(f'大獎平均 {e_pool_spins:.2f} 抽中一次（要是 {1 / pj:.0f}）')
for name, add in (('只花錢抽', ADD_PAY), ('只用免費抽', ADD_FREE)):
    jack = (START + add * e_pool_spins) / e_pool_spins
    print(f'{name}：一般格子平均 {others:.1f} 枚＋大獎平均 {jack:.1f} 枚＝一次平均 {others + jack:.1f} 枚，是花錢抽價錢 {PRICE} 的 {(others + jack) / PRICE:.0%}（中大獎時獎池平均 {START + add * e_pool_spins:.0f}）')
