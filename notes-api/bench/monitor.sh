#!/usr/bin/env bash
# Background monitor for a projet-builder run. Polls omc team summary + per-pane
# token HUD every INTERVAL seconds, appends one JSON line per tick to timeline.jsonl.
# Stops when bench/.stop exists. Args: TEAM SESSION START_EPOCH OUTFILE
set -u
TEAM="$1"; SESSION="$2"; START="$3"; OUT="$4"; INTERVAL="${5:-15}"
STOP="$(dirname "$OUT")/.stop"
while [ ! -f "$STOP" ]; do
  now=$(date +%s); elapsed=$(( now - START )); iso=$(date -u +%FT%TZ)
  summary=$(omc team api get-summary --input "{\"team_name\":\"$TEAM\"}" --json 2>/dev/null)
  [ -z "$summary" ] && summary='{}'
  # per-pane token scrape from the HUD line "<N> tokens"
  panes=$(tmux list-panes -t "$SESSION:0" -F '#{pane_index} #{pane_id}' 2>/dev/null)
  tok="{"; first=1
  while read -r idx pid; do
    [ -z "${pid:-}" ] && continue
    n=$(tmux capture-pane -pt "$pid" -S -8 2>/dev/null | grep -oE '[0-9][0-9,]* tokens' | tail -1 | grep -oE '[0-9,]+' | tr -d ',')
    [ -z "$n" ] && n=0
    [ $first -eq 0 ] && tok="$tok,"; tok="$tok\"$idx\":$n"; first=0
  done <<< "$panes"
  tok="$tok}"
  data=$(echo "$summary" | python3 -c "import json,sys
try: d=json.load(sys.stdin).get('data',{})
except Exception: d={}
print(json.dumps(d))" 2>/dev/null)
  [ -z "$data" ] && data='{}'
  printf '{"t":"%s","elapsed":%d,"summary":%s,"panes_tokens":%s}\n' "$iso" "$elapsed" "$data" "$tok" >> "$OUT"
  sleep "$INTERVAL"
done
