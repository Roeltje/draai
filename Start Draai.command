#!/bin/zsh
set -eu
cd -- "${0:A:h}"

if command -v node >/dev/null 2>&1; then
  draai_node="$(command -v node)"
else
  draai_node="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi
if [[ ! -x "$draai_node" ]]; then
  print 'Installeer Node.js 24 volgens README.md en probeer opnieuw.'
  read -r 'antwoord?Druk op Enter om te sluiten.'
  exit 1
fi
if [[ ! -f node_modules/tsx/dist/cli.mjs || ! -f dist/client/index.html ]]; then
  print 'De app moet eerst geïnstalleerd en gebouwd worden. Zie README.md.'
  read -r 'antwoord?Druk op Enter om te sluiten.'
  exit 1
fi
print 'Draai start. Open de URL die hieronder verschijnt in je browser.'
print 'Laat dit venster open zolang je Draai gebruikt. Stoppen: Ctrl+C.'
NODE_ENV=production "$draai_node" --import tsx server/index.ts
