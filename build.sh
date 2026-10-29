#!/bin/sh
# 把 parts/ 依檔名順序串成單一 index.html（發布 artifact 用，平台會包 skeleton）
# 另產生 preview.html：補上 doctype／charset，給本機瀏覽器預覽
# dist/index.html：同 preview.html，給 Cloudflare Pages 部署
cd "$(dirname "$0")" && cat parts/* > index.html
{ printf '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'; cat index.html; } > preview.html
mkdir -p dist && cp preview.html dist/index.html
wc -c index.html
