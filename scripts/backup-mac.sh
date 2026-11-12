#!/bin/bash
# The weekly Supabase backup on the owner's Mac (scripts/backup-supabase.mjs), run by launchd.
#
#   bash scripts/backup-mac.sh install   asks for the three secrets once (kept in the login Keychain), installs the job
#   bash scripts/backup-mac.sh now       a backup right away (what the job runs, without the 7-day wait)
#   bash scripts/backup-mac.sh status    the last backup, and whether the job is installed
#   bash scripts/backup-mac.sh remove    removes the job and the secrets (the backups stay)
#
# launchd calls `run` every day at 03:30 and at each login; it backs up only when the last backup is 7 days old or more,
# so a week the Mac was off is caught up the next time it is on. A failure shows a macOS notification and is logged in
# ~/Diloloji-yedek/yedek.log. Moving the repository folder needs `install` again (the job points at this file).
set -euo pipefail

LABEL="com.diloloji.backup"
SERVICE="diloloji-backup"
KEYS=(SUPABASE_DB_URL SUPABASE_URL SUPABASE_SECRET_KEY)
OUT="${DILOLOJI_BACKUP_DIR:-$HOME/Diloloji-yedek}"
DAYS="${DILOLOJI_BACKUP_DAYS:-7}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$OUT/yedek.log"

secret() { security find-generic-password -s "$SERVICE" -a "$1" -w 2>/dev/null; }

notify() {
  osascript -e "display notification \"$1\" with title \"Diloloji yedeği\"" >/dev/null 2>&1 || true
}

# Whether the last backup (SON-YEDEK.txt, written by the Node script) is younger than DAYS days.
recent() {
  local stamp="$OUT/SON-YEDEK.txt"
  [ -f "$stamp" ] || return 1
  local last now
  last=$(head -n 1 "$stamp")
  now=$(date -u +%s)
  last=$(date -j -u -f "%Y-%m-%dT%H:%M:%S" "${last%%.*}" +%s 2>/dev/null || date -u -d "$last" +%s 2>/dev/null || echo 0)
  [ $((now - last)) -lt $((DAYS * 86400)) ]
}

backup() {
  mkdir -p "$OUT"
  # One backup at a time (the job at login and a manual `now` may meet); a lock older than a day is a crashed run's.
  local lock="$OUT/.calisiyor"
  find "$lock" -maxdepth 0 -mmin +1440 -exec rmdir {} \; 2>/dev/null || true
  if ! mkdir "$lock" 2>/dev/null; then
    echo "$(date '+%F %T') başka bir yedek sürüyor, bu atlandı" >>"$LOG"
    return 0
  fi
  local rc=0
  dump || rc=$?
  rmdir "$lock" 2>/dev/null || true
  return $rc
}

dump() {
  local key value
  for key in "${KEYS[@]}"; do
    value=$(secret "$key") || { echo "$(date '+%F %T') $key Anahtar Zinciri'nde yok: bash scripts/backup-mac.sh install" >>"$LOG"; notify "Kurulum eksik ($key)."; return 1; }
    export "$key=$value"
  done
  # launchd's PATH is short: Homebrew's pg_dump (keg-only postgresql@17) and node.
  export PATH="/opt/homebrew/opt/postgresql@17/bin:/usr/local/opt/postgresql@17/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
  [ -f "$OUT/node-path" ] && PATH="$(cat "$OUT/node-path"):$PATH"
  echo "$(date '+%F %T') yedek başlıyor" >>"$LOG"
  if node "$REPO/scripts/backup-supabase.mjs" --out "$OUT" >>"$LOG" 2>&1; then
    echo "$(date '+%F %T') yedek tamam" >>"$LOG"
  else
    echo "$(date '+%F %T') yedek BAŞARISIZ" >>"$LOG"
    notify "Yedek alınamadı; ayrıntı: ~/Diloloji-yedek/yedek.log"
    return 1
  fi
}

install() {
  command -v security >/dev/null || { echo "Bu komut yalnızca macOS'ta çalışır."; exit 1; }
  command -v node >/dev/null || { echo "node bulunamadı."; exit 1; }
  if ! command -v pg_dump >/dev/null && [ ! -x /opt/homebrew/opt/postgresql@17/bin/pg_dump ] && [ ! -x /usr/local/opt/postgresql@17/bin/pg_dump ]; then
    echo "pg_dump bulunamadı: brew install postgresql@17"
    exit 1
  fi
  mkdir -p "$OUT" "$HOME/Library/LaunchAgents"
  dirname "$(command -v node)" >"$OUT/node-path"
  local key value
  for key in "${KEYS[@]}"; do
    if secret "$key" >/dev/null; then
      read -r -p "$key Anahtar Zinciri'nde var. Değiştir? (e/H) " answer
      [ "$answer" = "e" ] || continue
    fi
    read -r -s -p "$key: " value
    echo
    [ -n "$value" ] || { echo "Boş bırakıldı, kurulum durdu."; exit 1; }
    security add-generic-password -U -s "$SERVICE" -a "$key" -w "$value"
  done
  cat >"$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$REPO/scripts/backup-mac.sh</string><string>run</string></array>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>3</integer><key>Minute</key><integer>30</integer></dict>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>/dev/null</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
PLIST
  # The first backup here, before the job is loaded (its run at load then finds it recent and does nothing).
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
  echo "İlk yedek alınıyor (birkaç dakika sürebilir)…"
  local ok=1
  backup || ok=0
  launchctl bootstrap "gui/$(id -u)" "$PLIST"
  if [ $ok = 1 ]; then
    echo "Kuruldu, ilk yedek tamam: $OUT"
  else
    echo "Görev kuruldu ama ilk yedek alınamadı. Son satırlar:"
    tail -n 6 "$LOG" | grep -v '^\s*$' || true
    echo "Düzeltip: bash scripts/backup-mac.sh install"
  fi
}

remove() {
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
  rm -f "$PLIST"
  local key
  for key in "${KEYS[@]}"; do security delete-generic-password -s "$SERVICE" -a "$key" >/dev/null 2>&1 || true; done
  echo "Zamanlanmış yedek ve gizliler kaldırıldı; $OUT yerinde."
}

status() {
  if [ -f "$OUT/SON-YEDEK.txt" ]; then echo "Son yedek: $(head -n 1 "$OUT/SON-YEDEK.txt")"; else echo "Henüz yedek yok."; fi
  if launchctl print "gui/$(id -u)/$LABEL" >/dev/null 2>&1; then echo "Zamanlanmış görev kurulu."; else echo "Zamanlanmış görev kurulu değil."; fi
}

case "${1:-}" in
  install) install ;;
  run) if recent; then exit 0; fi; backup ;;
  now) backup ;;
  status) status ;;
  remove) remove ;;
  *) sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac
