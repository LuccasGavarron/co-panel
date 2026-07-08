#!/bin/bash
# co-panel — clique 2x pra abrir. Na primeira vez ele se prepara sozinho.
cd "$(dirname "$0")/.." || exit 1

if [ ! -d "node_modules" ] || [ ! -d ".next" ]; then
  echo "Preparando o co-panel (só na primeira vez)…"
  npm install --no-audit --no-fund && npm run build || {
    echo "Não consegui preparar. Confira se o Node está instalado (nodejs.org)."
    read -r -p "Enter pra fechar."
    exit 1
  }
fi

echo "Subindo o co-panel em http://localhost:4571 …"
npm run start >/tmp/co-panel.log 2>&1 &
SERVER=$!

for _ in $(seq 1 40); do
  curl -s http://localhost:4571 >/dev/null 2>&1 && break
  sleep 0.5
done

open "http://localhost:4571"
echo "co-panel rodando. Feche esta janela pra encerrar."
wait "$SERVER"
