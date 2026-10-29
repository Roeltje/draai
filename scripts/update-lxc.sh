#!/usr/bin/env bash
# First build without downtime; then cold backup, swap, healthcheck or rollback.
set -Eeuo pipefail
# Shared, source-guarded Git export and URL validation; never sources app config.
# shellcheck source=install-lxc.sh
source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/install-lxc.sh"

UPDATE_APP=/opt/draai
UPDATE_ENV=/etc/draai.env
UPDATE_UNIT=/etc/systemd/system/draai.service
UPDATE_DATA=/var/lib/draai
UPDATE_BACKUP_ROOT=/var/backups/draai
UPDATE_BACKUP=''
UPDATE_NODE=''
UPDATE_STOPPED=0
UPDATE_SNAPSHOT=0
UPDATE_SWAPPED=0
UPDATE_DONE=0
UPDATE_PORT=3210

update_usage() {
  cat <<'HELP'
Draai — update binnen de bestaande Ubuntu 24.04/26.04 LXC

sudo bash scripts/update-lxc.sh --source /root/draai-bron --ref main
sudo bash scripts/update-lxc.sh --repo git@github.com:Roeltje/draai.git --ref main

--source PAD  Exporteer gecommitteerde ref uit bestaande clone (eerst git pull).
--repo URL    Clone privé-repository; standaard https://github.com/Roeltje/draai.git.
--ref REF     Branch/tag/commit; standaard main.
--node PAD    Bestaande absolute Node 24 executable; standaard detectie.
--help        Werkt ook op Mac; voert niets uit.

Vereist bestaande actieve draai.service, /opt/draai, /etc/draai.env en data in
/var/lib/draai. PORT uit config wordt behouden; HOST moet 0.0.0.0 of 127.0.0.1 zijn.
APP_ORIGIN (ook je HTTPS-subdomein), sleutels en instellingen blijven behouden.
Ondersteunt de meegeleverde unit en de oude node + tsx CLI-unit zonder drop-ins.
Bestaande .env/data binnen de app en lokale broncodewijzigingen worden geweigerd.
Node 24 en pnpm 11.25.0 moeten al beschikbaar zijn; installeert geen OS-pakketten.

Bouwt eerst als draai zonder credential-omgeving. Daarna stopt de service voor
een volledige koude backup en codewissel. Bij fout: herstel en herstart oude
versie. Backups blijven root-only in /var/backups/draai, inclusief privégegevens.
Wijzigt geen firewall, reverse proxy of Proxmox-host. Gebruik geen token in URL.
HELP
}

update_parse_args() {
  while (($#)); do
    case "$1" in
      --help|-h) update_usage; return 10 ;;
      --source|--repo|--ref|--node)
        (($# >= 2)) && [[ -n "$2" ]] || fail "Waarde ontbreekt bij $1."
        case "$1" in
          --source) DRAAI_SOURCE=$2 ;; --repo) DRAAI_REPO=$2 ;;
          --ref) DRAAI_REF=$2 ;; --node) UPDATE_NODE=$2 ;;
        esac
        shift 2 ;;
      *) fail 'Onbekende update-optie; gebruik --help.' ;;
    esac
  done
  validate_repo "$DRAAI_REPO"
  [[ -n "$DRAAI_REF" && "$DRAAI_REF" != -* && "$DRAAI_REF" != *$'\n'* ]] || fail 'Ongeldige Git-ref.'
}

update_detect_node() {
  if [[ -z "$UPDATE_NODE" ]]; then
    local service_node
    service_node=$(sed -n 's/^ExecStart=\([^[:space:]]*\).*/\1/p' "$UPDATE_UNIT")
    # Prefer the working service's runtime, including manually installed /usr/bin/node.
    if [[ "$service_node" =~ ^/[-a-zA-Z0-9_./]+$ && -x "$service_node" ]] && [[ $("$service_node" --version) =~ ^v24\.[0-9]+\.[0-9]+$ ]]; then
      UPDATE_NODE=$service_node
    elif [[ -x /opt/draai-node/bin/node ]]; then UPDATE_NODE=/opt/draai-node/bin/node
    else UPDATE_NODE=$(command -v node || true); fi
  fi
  [[ "$UPDATE_NODE" =~ ^/[-a-zA-Z0-9_./]+$ && -x "$UPDATE_NODE" ]] || fail 'Geen bruikbare Node gevonden; gebruik --node /absoluut/pad/naar/node.'
  [[ $("$UPDATE_NODE" --version) =~ ^v24\.[0-9]+\.[0-9]+$ ]] || fail 'De updater vereist een bestaande Node 24-runtime.'
  UPDATE_NODE_BIN=$(dirname -- "$UPDATE_NODE")
  UPDATE_PNPM=$(PATH="$UPDATE_NODE_BIN:$PATH" command -v pnpm || true)
  [[ -n "$UPDATE_PNPM" && $(PATH="$UPDATE_NODE_BIN:$PATH" "$UPDATE_PNPM" --version) == 11.25.0 ]] || fail 'Installeer eerst pnpm 11.25.0 bij de bestaande Node 24-runtime.'
}

# Read three non-secret, single-line systemd assignments, without shell execution.
update_read_environment() {
  local line key value seen='|' host='' data='' port=''
  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ "$line" =~ ^[[:space:]]*(HOST|PORT|DATA_DIR)[[:space:]]*=(.*)$ ]]; then
      key=${BASH_REMATCH[1]}; value=${BASH_REMATCH[2]}
      [[ "$seen" != *"|$key|"* ]] || fail 'Dubbele netwerkinstelling of datamap in configuratie; pas die handmatig aan.'
      seen+="$key|"
      value="${value#"${value%%[![:space:]]*}"}"; value="${value%"${value##*[![:space:]]}"}"
      if [[ "$value" == \"*\" || "$value" == \'*\' ]]; then value=${value:1:${#value}-2}; fi
      case "$key" in HOST) host=$value ;; PORT) port=$value ;; DATA_DIR) data=$value ;; esac
    fi
  done < "$UPDATE_ENV"
  [[ "$host" == 0.0.0.0 || "$host" == 127.0.0.1 ]] || fail 'HOST moet 0.0.0.0 of 127.0.0.1 zijn voor de lokale healthcheck.'
  [[ "$port" =~ ^[0-9]{1,5}$ ]] && ((10#$port >= 1 && 10#$port <= 65535)) || fail 'Ongeldige PORT in configuratie.'
  [[ "$data" == "$UPDATE_DATA" ]] || fail 'Deze updater ondersteunt DATA_DIR=/var/lib/draai; migreer afwijkende opslag eerst handmatig.'
  UPDATE_PORT=$((10#$port))
}

update_check_local_code() {
  [[ ! -e "$UPDATE_APP/.env" && ! -L "$UPDATE_APP/.env" && ! -e "$UPDATE_APP/data" && ! -L "$UPDATE_APP/data" ]] || fail 'Appmap bevat .env of data. Verplaats configuratie/data eerst veilig naar /etc/draai.env en /var/lib/draai; niets is verwijderd.'
  if [[ -e "$UPDATE_APP/.git" ]]; then
    # Ignored generated dependencies/assets are fine; any tracked edits are not.
    [[ -z $(git -C "$UPDATE_APP" status --porcelain --untracked-files=all --ignored=matching -- . ':!node_modules' ':!dist' ':!INSTALL_COMMIT') ]] || fail 'Lokale codewijzigingen/onbekende bestanden in /opt/draai. Commit of bewaar die eerst; niets is overschreven.'
    [[ -z $(git -C "$UPDATE_APP" diff --name-only HEAD -- node_modules dist) ]] || fail 'Gewijzigde bijgehouden buildbestanden; controleer de checkout handmatig.'
  fi
}

update_render_unit() {
  local start
  [[ $(grep -c '^ExecStart=' "$UPDATE_UNIT") == 1 ]] || fail 'Unit moet precies één ExecStart bevatten.'
  grep -Fxq 'User=draai' "$UPDATE_UNIT" && grep -Fxq 'Group=draai' "$UPDATE_UNIT" && \
    grep -Fxq "WorkingDirectory=$UPDATE_APP" "$UPDATE_UNIT" && grep -Fxq "EnvironmentFile=$UPDATE_ENV" "$UPDATE_UNIT" || fail 'Afwijkende systemd-unit; controleer gebruiker, werkmap en configuratiepad handmatig.'
  start=$(sed -n 's/^ExecStart=//p' "$UPDATE_UNIT")
  [[ "$start" =~ ^/[-a-zA-Z0-9_./]+[[:space:]]--import[[:space:]]tsx[[:space:]]server/index\.ts$ || "$start" =~ ^/[-a-zA-Z0-9_./]+[[:space:]]node_modules/tsx/dist/cli\.mjs[[:space:]]server/index\.ts$ ]] || fail 'Afwijkende service-startopdracht; alleen Node met de lokale tsx-loader wordt ondersteund.'
  sed "s|^ExecStart=.*|ExecStart=$UPDATE_NODE --import tsx server/index.ts|" "$UPDATE_UNIT" > "$DRAAI_TMP/new.service"
}

update_preflight() {
  [[ $(uname -s) == Linux ]] || fail 'Alleen Linux wordt ondersteund; voer dit IN de LXC uit.'
  [[ ${EUID:-$(id -u)} == 0 ]] || fail 'Voer de updater uit als root binnen de LXC.'
  [[ ! -e /etc/pve ]] && ! command -v pveversion >/dev/null 2>&1 || fail 'Proxmox-host gedetecteerd; voer dit uitsluitend IN de LXC uit.'
  # shellcheck disable=SC1091
  . /etc/os-release
  supports_ubuntu "${ID:-}" "${VERSION_ID:-}" || fail 'Ubuntu 24.04 of 26.04 is vereist.'
  [[ $(systemd-detect-virt --container 2>/dev/null || true) == lxc ]] || fail 'Geen LXC gedetecteerd.'
  awk '$1 == 0 && $2 != 0 { found=1 } END { exit !found }' /proc/self/uid_map || fail 'Gebruik een ongeprivilegieerde LXC.'
  local path tool
  for tool in git curl runuser systemctl tar flock; do command -v "$tool" >/dev/null || fail "Vereist hulpprogramma ontbreekt: $tool."; done
  for path in "$UPDATE_APP" "$UPDATE_ENV" "$UPDATE_UNIT" "$UPDATE_DATA"; do
    [[ -e "$path" && ! -L "$path" ]] || fail 'Een vereist installatiepad ontbreekt of is een symlink; controleer de installatie handmatig.'
  done
  [[ $(stat -c '%U:%G:%a' "$UPDATE_ENV") == root:draai:640 ]] || fail '/etc/draai.env moet root:draai en 0640 zijn.'
  [[ $(id -u draai) -ne 0 && $(id -gn draai) == draai ]] || fail 'Vereist niet-root servicegebruiker draai met groep draai.'
  [[ $(getent passwd draai | cut -d: -f7) =~ ^/(usr/)?sbin/nologin$|^/bin/false$ ]] || fail 'Servicegebruiker draai moet een geblokkeerde login hebben.'
  [[ $(systemctl show draai.service -p FragmentPath --value) == "$UPDATE_UNIT" && -z $(systemctl show draai.service -p DropInPaths --value) ]] || fail 'Afwijkend servicepad of systemd drop-ins; handmatige update vereist.'
  systemctl is-active --quiet draai.service || fail 'Start en controleer eerst de bestaande draai.service; updater vereist een werkende oude versie.'
  update_read_environment
  update_check_local_code
  update_detect_node
}

update_build() {
  install -d -o draai -g draai -m 0700 "$DRAAI_TMP/build-home"
  chown -R draai:draai "$DRAAI_TMP/app"
  runuser -u draai -- env -i HOME="$DRAAI_TMP/build-home" PATH="$UPDATE_NODE_BIN:/usr/bin:/bin" \
    /bin/bash -ec 'cd "$1"; "$2" install --frozen-lockfile; "$2" build' bash "$DRAAI_TMP/app" "$UPDATE_PNPM"
  chown -R root:root "$DRAAI_TMP/app"
  chmod -R a+rX,go-w "$DRAAI_TMP/app"
}

update_backup() {
  [[ ! -L "$UPDATE_BACKUP_ROOT" ]] || fail 'Backupmap mag geen symlink zijn.'
  install -d -o root -g root -m 0700 "$UPDATE_BACKUP_ROOT"
  UPDATE_BACKUP=$(mktemp -d "$UPDATE_BACKUP_ROOT/$(date -u +%Y%m%dT%H%M%SZ).XXXXXXXX")
  chmod 0700 "$UPDATE_BACKUP"
  # The app is stopped, so both SQLite modes, WALs and all private data are cold.
  cp -a -- "$UPDATE_DATA" "$UPDATE_BACKUP/data"
  cp -a -- "$UPDATE_ENV" "$UPDATE_BACKUP/draai.env"
  cp -a -- "$UPDATE_UNIT" "$UPDATE_BACKUP/draai.service"
  tar -cpf "$UPDATE_BACKUP/app.tar" -C "$UPDATE_APP" .
  printf '%s\n' "$DRAAI_COMMIT" > "$UPDATE_BACKUP/new-commit"
  UPDATE_SNAPSHOT=1
}

update_health() {
  local attempt
  for attempt in {1..30}; do
    if systemctl is-active --quiet draai.service && curl --fail --silent --max-time 2 "http://127.0.0.1:$UPDATE_PORT/api/health" > "$DRAAI_TMP/health" && \
      "$UPDATE_NODE" -e 'try{process.exit(JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8")).ok===true?0:1)}catch{process.exit(1)}' "$DRAAI_TMP/health"; then return 0; fi
    sleep 1
  done
  return 1
}

update_rollback() {
  log 'Update mislukt; oude code, configuratie en koude databackup herstellen…'
  systemctl stop draai.service || return 1
  if ((UPDATE_SWAPPED)); then
    if [[ -e "$UPDATE_APP" ]]; then mv -- "$UPDATE_APP" "$DRAAI_TMP/failed-app" || return 1; fi
    mv -- "$DRAAI_TMP/old-app" "$UPDATE_APP" || return 1
  fi
  if ((UPDATE_SNAPSHOT)); then
    # Replace the whole directory so new SQLite sidecars/migrations cannot linger.
    mv -- "$UPDATE_DATA" "$UPDATE_BACKUP/failed-data" || return 1
    cp -a -- "$UPDATE_BACKUP/data" "$UPDATE_DATA" || return 1
    cp -a -- "$UPDATE_BACKUP/draai.env" "$UPDATE_ENV" || return 1
    cp -a -- "$UPDATE_BACKUP/draai.service" "$UPDATE_UNIT" || return 1
    systemctl daemon-reload || return 1
  fi
  systemctl start draai.service || return 1
  update_health || return 1
}

update_cleanup() {
  local status=$? restored=1
  trap - EXIT INT TERM
  if ((UPDATE_STOPPED && !UPDATE_DONE)); then
    update_rollback || restored=0
  fi
  if ((restored)); then
    if [[ "$DRAAI_TMP" == /opt/.draai-update.* ]]; then rm -rf -- "$DRAAI_TMP"; fi
  else
    printf 'Automatisch herstel kon niet worden voltooid. Service en bestanden handmatig controleren; staging en backup zijn behouden: %s %s\n' "$DRAAI_TMP" "$UPDATE_BACKUP" >&2
  fi
  ((status != 0)) || ((UPDATE_DONE)) || status=1
  exit "$status"
}

update_transaction() {
  # No stop, backup or mutation of the running deployment until this succeeds.
  update_build
  update_render_unit
  UPDATE_STOPPED=1
  systemctl stop draai.service
  update_backup
  mv -- "$UPDATE_APP" "$DRAAI_TMP/old-app"
  # Set the flag immediately after moving old code, for partial-swap recovery.
  UPDATE_SWAPPED=1
  mv -- "$DRAAI_TMP/app" "$UPDATE_APP"
  install -o root -g root -m 0644 "$DRAAI_TMP/new.service" "$UPDATE_UNIT"
  systemctl daemon-reload
  systemctl start draai.service
  update_health || fail 'Nieuwe service is niet gezond; automatisch herstel volgt.'
  UPDATE_DONE=1
  log "Update geslaagd. Commit: $DRAAI_COMMIT. Privébackup: $UPDATE_BACKUP"
  log 'Je bestaande configuratie, APP_ORIGIN en reverse proxy zijn behouden.'
}

update_main() {
  local status=0
  update_parse_args "$@" || status=$?
  [[ $status == 10 ]] && return 0
  ((status == 0)) || return "$status"
  [[ $(uname -s) == Linux ]] || fail 'Alleen Linux wordt ondersteund; voer dit IN de LXC uit.'
  [[ ${EUID:-$(id -u)} == 0 ]] || fail 'Voer de updater uit als root binnen de LXC.'
  [[ ! -e /etc/pve ]] && ! command -v pveversion >/dev/null 2>&1 || fail 'Proxmox-host gedetecteerd; voer dit uitsluitend IN de LXC uit.'
  # Serialize with other updater instances before inspecting mutable deployment state.
  exec 9>/run/lock/draai-update.lock
  flock -n 9 || fail 'Er draait al een Draai-update.'
  update_preflight
  DRAAI_TMP=$(mktemp -d /opt/.draai-update.XXXXXXXX)
  trap update_cleanup EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
  umask 077
  fetch_code
  [[ ! -e "$DRAAI_TMP/app/data" && ! -L "$DRAAI_TMP/app/data" ]] || fail 'Nieuwe code bevat een datamap; update geweigerd.'
  update_transaction
}

if [[ ${BASH_SOURCE[0]} == "$0" ]]; then update_main "$@"; fi
