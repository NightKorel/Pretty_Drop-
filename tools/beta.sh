#!/bin/sh
# 測試版（2026-10-06 納可定）：測試中的版本放在 beta/ 資料夾，網址是正式版網址加 /beta/。
#   sh tools/beta.sh new     把正式版複製一份到 beta/（beta/ 原本的東西會被蓋掉）
#   sh tools/beta.sh ship    納可點頭後，把 beta/ 搬回正式版（beta/ 會清掉）
# beta 裡從 ../lib/ 拿函式庫（不複製）；存檔、設定的名字加上 beta_，跟正式版分開。
set -e
cd "$(dirname "$0")/.."
FILES="index.html style.css achievements.js app.js coin.js digits.js slime.js start-layout.js treasure.js"
case "$1" in
  new)
    rm -rf beta && mkdir beta
    for f in $FILES; do cp "$f" beta/; done
    sed -i -E "s#([\"'])(\./)?lib/#\1../lib/#g; s#pretty_drop_#pretty_drop_beta_#g" beta/*.js beta/index.html
    sed -i -E 's#(<span class="ver">v[0-9.]+)</span>#\1 測試版</span>#' beta/index.html
    ;;
  ship)
    for f in $FILES; do cp "beta/$f" "$f"; done
    sed -i -E "s#([\"'])\.\./lib/#\1./lib/#g; s#pretty_drop_beta_#pretty_drop_#g" $FILES
    sed -i -E "s#(href=\")\./lib/#\1lib/#g" index.html
    sed -i -E 's# 測試版</span>#</span>#' index.html
    rm -rf beta
    ;;
  *) echo "用法：sh tools/beta.sh new | ship"; exit 1 ;;
esac
