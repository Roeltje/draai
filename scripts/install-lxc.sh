#!/usr/bin/env bash
# Run inside a dedicated, unprivileged Ubuntu 24.04/26.04 LXC. Never run on the host.
set -Eeuo pipefail

DRAAI_REPO='https://github.com/Roeltje/draai.git'
DRAAI_REF='main'
DRAAI_ORIGIN=''
DRAAI_SOURCE=''
DRAAI_TMP=''
DRAAI_PUBLISHED=0

usage() {
  cat <<'HELP'
Draai — eerste installatie in een ongeprivilegieerde Ubuntu 24.04/26.04 LXC

sudo bash scripts/install-lxc.sh --source "$PWD" --origin http://192.168.1.50:3210
sudo bash scripts/install-lxc.sh --repo git@github.com:Roeltje/draai.git --origin http://192.168.1.50:3210

Opties:
  --repo URL       Git-repository (standaard https://github.com/Roeltje/draai.git)
  --ref BRANCH     Branch, tag of commit (standaard main)
  --source PAD     Bestaande lokale Git-clone; exporteert de gekozen ref
  --origin URL     Verplicht: exact browseradres, http(s)://host[:poort]
  --help          Toon deze uitleg; werkt ook buiten Linux

De GitHub-repository is privé. Clone vooraf met je eigen SSH-deploykey of
Git-credentialhelper; geef nooit een token in de repository-URL mee.
Bij sudo wordt Git uitgevoerd als de oorspronkelijke gebruiker, met diens HOME.
--source neemt uitsluitend gecommitteerde bestanden van --ref over.

Installeert /opt/draai, /opt/draai-node, /var/lib/draai, /etc/draai.env en
draai.service. Bestaande installatie wordt geweigerd. Bestaande configuratie en
data worden behouden. Begint zonder API-tokens in demo. Wijzigt geen firewall.
Updates: volg de afzonderlijke procedure in docs/INSTALLATIE.md.
HELP
}

fail() { printf 'Fout: %s\n' "$*" >&2; exit 1; }
log() { printf '%s\n' "$*"; }

parse_args() {
  while (($#)); do
    case "$1" in
      --help|-h) usage; return 10 ;;
      --repo|--ref|--source|--origin)
        (($# >= 2)) && [[ -n "$2" ]] || fail "Waarde ontbreekt bij $1."
        case "$1" in
          --repo) DRAAI_REPO=$2 ;;
          --ref) DRAAI_REF=$2 ;;
          --source) DRAAI_SOURCE=$2 ;;
          --origin) DRAAI_ORIGIN=$2 ;;
        esac
        shift 2 ;;
      *) fail 'Onbekende optie; gebruik --help.' ;;
    esac
  done
  [[ "$DRAAI_ORIGIN" =~ ^https?://[a-zA-Z0-9.-]+(:[0-9]{1,5})?$ || "$DRAAI_ORIGIN" =~ ^https?://\[[a-fA-F0-9:]+\](:[0-9]{1,5})?$ ]] || fail '--origin moet een volledig http(s) browseradres zonder pad zijn.'
  local origin_port
  origin_port=${DRAAI_ORIGIN##*:}
  if [[ "$origin_port" =~ ^[0-9]+$ ]]; then
    ((10#$origin_port >= 1 && 10#$origin_port <= 65535)) || fail 'De poort in --origin moet tussen 1 en 65535 liggen.'
  fi
  [[ "$DRAAI_REF" != -* && "$DRAAI_REF" != *$'\n'* && -n "$DRAAI_REF" ]] || fail 'Ongeldige Git-ref.'
  validate_repo "$DRAAI_REPO"
}

validate_repo() {
  # No user/password in HTTPS, query strings, fragments, whitespace or local paths.
  [[ "$1" =~ ^https://[a-zA-Z0-9.-]+/[-a-zA-Z0-9_./]+$ || "$1" =~ ^git@[a-zA-Z0-9.-]+:[-a-zA-Z0-9_./]+$ || "$1" =~ ^ssh://git@[a-zA-Z0-9.-]+/[-a-zA-Z0-9_./]+$ ]] || fail 'Gebruik een HTTPS- of SSH-Git-URL zonder token, wachtwoord of query.'
}

supports_ubuntu() { [[ "$1" == ubuntu && ( "$2" == 24.04 || "$2" == 26.04 ) ]]; }

check_environment() {
  [[ $(uname -s) == Linux ]] || fail 'Alleen Linux wordt ondersteund; voer dit uit IN de LXC.'
  [[ ${EUID:-$(id -u)} == 0 ]] || fail 'Voer uit als root binnen de LXC (bijvoorbeeld met sudo).'
  [[ ! -e /etc/pve ]] && ! command -v pveversion >/dev/null 2>&1 || fail 'Proxmox-host gedetecteerd. Stop: voer dit uitsluitend IN de LXC uit.'
  [[ -r /etc/os-release ]] || fail 'Ubuntu 24.04 of 26.04 is vereist.'
  # shellcheck disable=SC1091
  . /etc/os-release
  supports_ubuntu "${ID:-}" "${VERSION_ID:-}" || fail 'Deze installer ondersteunt Ubuntu 24.04 en 26.04.'
  [[ -d /run/systemd/system ]] && command -v systemctl >/dev/null || fail 'Een actieve systemd-installatie is vereist.'
  [[ $(systemd-detect-virt --container 2>/dev/null || true) == lxc ]] || fail 'Geen LXC gedetecteerd. Gebruik een dedicated Ubuntu LXC.'
  awk '$1 == 0 && $2 != 0 { found=1 } END { exit !found }' /proc/self/uid_map || fail 'Deze LXC lijkt geprivilegieerd; maak een ongeprivilegieerde LXC.'
  [[ ! -e /opt/draai && ! -L /opt/draai ]] || fail '/opt/draai bestaat al. Gebruik de updateprocedure; deze installer overschrijft geen installatie.'
  [[ ! -e /etc/systemd/system/draai.service && ! -L /etc/systemd/system/draai.service ]] || fail 'draai.service bestaat al; controleer de bestaande installatie.'
  [[ ! -L /etc/draai.env && ! -L /var/lib/draai ]] || fail 'Configuratie of datamap is een symbolische link; controleer de installatie handmatig.'
  if [[ -n "$DRAAI_SOURCE" ]]; then
    DRAAI_SOURCE=$(cd -- "$DRAAI_SOURCE" && pwd -P) || fail 'Bronmap bestaat niet.'
  fi
}

cleanup() {
  local status=$?
  trap - EXIT
  if [[ -n "$DRAAI_TMP" && "$DRAAI_TMP" == /opt/.draai-install.* ]]; then rm -rf -- "$DRAAI_TMP"; fi
  if ((status != 0)); then
    printf 'Installatie gestopt. Bestaande configuratie en data zijn behouden.\n' >&2
    if ((DRAAI_PUBLISHED)); then printf 'Code staat in /opt/draai; controleer systemctl status draai. Herhaal de installer niet als updater.\n' >&2; fi
  fi
  exit "$status"
}

as_git_user() {
  if [[ -n ${SUDO_USER:-} && "$SUDO_USER" != root ]]; then
    local git_home
    git_home=$(getent passwd "$SUDO_USER" | cut -d: -f6)
    [[ -n "$git_home" ]] || fail 'Oorspronkelijke Git-gebruiker heeft geen home-directory.'
    runuser -u "$SUDO_USER" -- env HOME="$git_home" "$@"
  else
    "$@"
  fi
}

fetch_code() {
  local git_dir git_owner
  git_owner=${SUDO_USER:-root}
  git_dir="$DRAAI_TMP/git"
  install -d -m 0700 -o "$git_owner" "$git_dir"
  # Traverse-only access to the private staging parent, not to build contents.
  chmod 0711 "$DRAAI_TMP"
  log 'Gecommitteerde broncode ophalen (Git kan om authenticatie vragen)…'
  if [[ -n "$DRAAI_SOURCE" ]]; then
    as_git_user git -C "$DRAAI_SOURCE" rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail '--source moet een toegankelijke Git-clone zijn.'
    git_dir=$DRAAI_SOURCE
  else
    # Suppress raw remote errors: servers/credential helpers may include secrets.
    as_git_user git clone --quiet --no-checkout -- "$DRAAI_REPO" "$git_dir/repo" 2>"$DRAAI_TMP/git-error" || fail 'Git-clone mislukt. Controleer toegang/deploykey of clone vooraf en gebruik --source.'
    git_dir="$git_dir/repo"
  fi
  if ! as_git_user git -C "$git_dir" rev-parse --verify --end-of-options "${DRAAI_REF}^{commit}" >"$DRAAI_TMP/commit" 2>/dev/null; then
    [[ -z "$DRAAI_SOURCE" ]] && as_git_user git -C "$git_dir" rev-parse --verify --end-of-options "refs/remotes/origin/${DRAAI_REF}^{commit}" >"$DRAAI_TMP/commit" 2>/dev/null || fail 'Git-ref niet gevonden; bij --source moet deze lokaal beschikbaar zijn.'
  fi
  DRAAI_COMMIT=$(cat "$DRAAI_TMP/commit")
  [[ "$DRAAI_COMMIT" =~ ^[0-9a-f]{40,64}$ ]] || fail 'Ongeldig commit-ID.'
  install -d -m 0755 "$DRAAI_TMP/app"
  as_git_user git -C "$git_dir" archive "$DRAAI_COMMIT" | tar -x -C "$DRAAI_TMP/app"
  [[ -f "$DRAAI_TMP/app/pnpm-lock.yaml" && -f "$DRAAI_TMP/app/deploy/draai.service" && -f "$DRAAI_TMP/app/server/index.ts" ]] || fail 'Deze commit bevat geen complete Draai-installatie.'
  [[ ! -e "$DRAAI_TMP/app/.env" && ! -L "$DRAAI_TMP/app/.env" ]] || fail 'De repository bevat .env; verwijder secrets uit de broncode.'
  printf '%s\n' "$DRAAI_COMMIT" >"$DRAAI_TMP/app/INSTALL_COMMIT"
  log "Broncode geselecteerd: $DRAAI_COMMIT"
}

install_node() {
  local arch archive version target
  case $(uname -m) in x86_64) arch=x64 ;; aarch64|arm64) arch=arm64 ;; *) fail 'Alleen x86_64 en arm64 worden ondersteund.' ;; esac
  log 'Officiële Node.js 24-download en gepubliceerde SHA256 controleren…'
  curl --fail --silent --show-error --proto '=https' --tlsv1.2 https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt -o "$DRAAI_TMP/SHASUMS256.txt"
  archive=$(awk -v arch="$arch" '$2 ~ ("^node-v24\\.[0-9]+\\.[0-9]+-linux-" arch "\\.tar\\.xz$") { print $2 }' "$DRAAI_TMP/SHASUMS256.txt")
  [[ "$archive" =~ ^node-(v24\.[0-9]+\.[0-9]+)-linux-(x64|arm64)\.tar\.xz$ ]] || fail 'Geen eenduidige officiële Node 24-distributie gevonden.'
  version=${BASH_REMATCH[1]}
  target="/opt/draai-node-${version}-${arch}"
  curl --fail --silent --show-error --proto '=https' --tlsv1.2 "https://nodejs.org/dist/$version/$archive" -o "$DRAAI_TMP/$archive"
  (cd "$DRAAI_TMP" && awk -v file="$archive" '$2 == file' SHASUMS256.txt | sha256sum --check --status) || fail 'Node SHA256-controle mislukt.'
  [[ ! -e /opt/draai-node || -L /opt/draai-node ]] || fail '/opt/draai-node is geen beheerde symlink.'
  [[ ! -e "$target" && ! -L "$target" ]] || fail "Runtimepad $target bestaat al. Controleer een eerdere gedeeltelijke installatie handmatig."
  install -d -m 0755 "$target"
  tar -xJf "$DRAAI_TMP/$archive" --strip-components=1 -C "$target"
  chown -R root:root "$target"
  ln -sfn "$target" /opt/draai-node
  export PATH="/opt/draai-node/bin:$PATH"
  npm install --global --prefix "$target" --ignore-scripts --no-audit --no-fund pnpm@11.25.0
  [[ $(node --version) == "$version" && $(pnpm --version) == 11.25.0 ]] || fail 'Node/pnpm-versiecontrole mislukt.'
}

prepare_account() {
  if getent passwd draai >/dev/null; then
    [[ $(id -u draai) -ne 0 && $(getent passwd draai | cut -d: -f6) == /var/lib/draai && $(getent passwd draai | cut -d: -f7) == /usr/sbin/nologin ]] || fail 'Bestaande gebruiker draai heeft onverwachte rechten/home/shell.'
  else
    useradd --system --user-group --home-dir /var/lib/draai --shell /usr/sbin/nologin draai
  fi
  [[ $(id -gn draai) == draai ]] || fail 'Gebruiker draai moet primaire groep draai hebben.'
  install -d -o draai -g draai -m 0700 /var/lib/draai
}

build_app() {
  log 'Afhankelijkheden installeren en productieversie bouwen als gebruiker draai…'
  install -d -o draai -g draai -m 0700 "$DRAAI_TMP/build-home"
  chown -R draai:draai "$DRAAI_TMP/app"
  runuser -u draai -- env -i HOME="$DRAAI_TMP/build-home" PATH='/opt/draai-node/bin:/usr/bin:/bin' \
    /bin/bash -ec 'cd "$1"; pnpm install --frozen-lockfile; pnpm build' bash "$DRAAI_TMP/app"
  chown -R root:root "$DRAAI_TMP/app"
  chmod -R a+rX,go-w "$DRAAI_TMP/app"
}

# Optional path makes configuration creation/preservation independently testable.
# Existing files must use these four unquoted, single-line deployment settings.
write_environment() {
  local env_path=${1:-/etc/draai.env} expected setting
  [[ ! -L "$env_path" ]] || fail 'Configuratie is een symbolische link; controleer de installatie handmatig.'
  if [[ ! -e "$env_path" ]]; then
    (umask 027; cat > "$env_path" <<ENV
NODE_ENV=production
HOST=0.0.0.0
PORT=3210
DATA_DIR=/var/lib/draai
DISCOGS_USERNAME=roeltej
DISCOGS_TOKEN=
WU_STATION_ID=IWAALW30
WU_API_KEY=
WIKI_ENABLED=false
APP_ORIGIN=$DRAAI_ORIGIN
ENV
    )
    chown root:draai "$env_path"
    chmod 0640 "$env_path"
  else
    [[ -f "$env_path" ]] || fail 'Configuratie is geen gewoon bestand.'
    [[ $(stat -c '%U:%G:%a' "$env_path") == root:draai:640 ]] || fail 'Bestaande configuratie moet root:draai en 0640 zijn; inhoud blijft behouden.'
    for expected in 'HOST=0.0.0.0' 'PORT=3210' 'DATA_DIR=/var/lib/draai' "APP_ORIGIN=$DRAAI_ORIGIN"; do
      setting=${expected%%=*}
      [[ $(grep -Ec "^[[:space:]]*${setting}[[:space:]]*=" "$env_path") == 1 ]] && \
        grep -Fxq -- "$expected" "$env_path" || fail "Bestaande configuratie heeft een afwijkende of dubbele $setting. Pas die instelling handmatig aan; configuratie blijft behouden."
    done
    log 'Bestaande configuratie behouden; netwerkadres en datamap gecontroleerd.'
  fi
}

install_config_service() {
  write_environment
  [[ ! -e /opt/draai && ! -L /opt/draai ]] || fail '/opt/draai is ondertussen aangemaakt; installatie gestopt.'
  mv -- "$DRAAI_TMP/app" /opt/draai
  DRAAI_PUBLISHED=1
  # Keep repository hardening and pin the isolated runtime, without the tsx CLI.
  sed 's|^ExecStart=.*|ExecStart=/opt/draai-node/bin/node --import tsx server/index.ts|' /opt/draai/deploy/draai.service > "$DRAAI_TMP/draai.service"
  [[ $(grep -c '^ExecStart=' "$DRAAI_TMP/draai.service") == 1 ]] || fail 'Servicebestand moet precies één ExecStart bevatten.'
  install -o root -g root -m 0644 "$DRAAI_TMP/draai.service" /etc/systemd/system/draai.service
  systemctl daemon-reload
  systemctl enable --now draai.service
}

check_health() {
  local attempt
  for attempt in {1..30}; do
    if curl --fail --silent --max-time 2 http://127.0.0.1:3210/api/health >"$DRAAI_TMP/health" && \
      /opt/draai-node/bin/node -e 'const fs=require("node:fs");try{process.exit(JSON.parse(fs.readFileSync(process.argv[1],"utf8")).ok===true?0:1)}catch{process.exit(1)}' "$DRAAI_TMP/health" && \
      systemctl is-active --quiet draai.service; then
      log "Draai is gestart: $DRAAI_ORIGIN"
      log "Commit: $DRAAI_COMMIT. Configuratie: /etc/draai.env. Controle: systemctl status draai."
      return
    fi
    sleep 1
  done
  fail 'Healthcheck niet geslaagd. Controleer systemctl status draai en journalctl -u draai; deel nooit configuratie met API-tokens.'
}

main() {
  local parse_status=0
  parse_args "$@" || parse_status=$?
  [[ $parse_status == 10 ]] && return 0
  ((parse_status == 0)) || return "$parse_status"
  check_environment
  trap cleanup EXIT
  umask 022
  log 'Ubuntu-pakketten installeren…'
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl git xz-utils openssh-client
  DRAAI_TMP=$(mktemp -d /opt/.draai-install.XXXXXXXX)
  fetch_code
  prepare_account
  install_node
  build_app
  install_config_service
  check_health
}

if [[ ${BASH_SOURCE[0]} == "$0" ]]; then main "$@"; fi
