#!/bin/sh
# 做三份不同厚度的 beta 複本（_t14、_t11、_t09，放在 repo 根目錄，用完記得刪，不要推上去）
# 用法：在 repo 根目錄跑 sh 垃圾桶/2026-10-16_硬幣厚度實驗/make.sh
set -e
for t in 14 11 09; do
  rm -rf _t$t; cp -r beta _t$t
  sed -i "s/^const COIN_H = 0.14;/const COIN_H = 0.$t;/" _t$t/app.js
  grep -n "^const COIN_H" _t$t/app.js
done
