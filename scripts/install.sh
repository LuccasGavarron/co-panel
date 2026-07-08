#!/usr/bin/env bash
# Instalador do co-panel (mac/Linux). Baixa do repo, builda e cria o atalho na Área de Trabalho.
# Uso: curl -fsSL https://raw.githubusercontent.com/LuccasGavarron/co-panel/main/scripts/install.sh | bash
set -e

REPO="https://github.com/LuccasGavarron/co-panel.git"
DIR="$HOME/co-panel"

command -v git >/dev/null || { echo "Instale o Git primeiro (git-scm.com)."; exit 1; }
command -v npm >/dev/null || { echo "Instale o Node.js primeiro (nodejs.org)."; exit 1; }

if [ -d "$DIR/.git" ]; then
  echo "Atualizando co-panel em $DIR…"
  git -C "$DIR" pull --ff-only
else
  echo "Baixando co-panel em $DIR…"
  git clone "$REPO" "$DIR"
fi

cd "$DIR"
echo "Instalando dependências…"
npm install --no-audit --no-fund
echo "Buildando…"
npm run build

DESK="$HOME/Desktop/co-panel.command"
cat > "$DESK" <<EOF
#!/bin/bash
exec "$DIR/scripts/Abrir co-panel.command"
EOF
chmod +x "$DESK" "$DIR/scripts/Abrir co-panel.command"

echo ""
echo "Pronto! Dois cliques em ~/Desktop/co-panel.command pra abrir o co-panel."
