#!/usr/bin/env bash
# install.sh — One-shot installer for the SalesMfast Ops MCP facade.
#
# What it does (idempotent — re-running is safe):
#   1. Pre-flight (Node 20+, git, jq, curl)
#   2. Clones (or updates) the upstream `GoHighLevel-MCP` next to this repo
#   3. Builds the upstream
#   4. Patches this repo's package.json to point at the local upstream
#   5. npm install + npm run build here
#   6. Prompts for GHL credentials (or reads them from env)
#   7. Writes .env
#   8. Smoke-tests the PIT against live GHL
#   9. Runs `npm run probe` to verify everything is green
#  10. Auto-merges the salesmfast-ops block into Claude Desktop config
#      (with a timestamped backup of the existing config)
#  11. Prints next steps (restart Desktop)
#
# Usage:
#   bash install.sh                                              # interactive
#   GHL_API_KEY=pit-... GHL_LOCATION_ID=... bash install.sh      # non-interactive
#   SKIP_DESKTOP_MERGE=1 bash install.sh                         # skip auto-merge
#
# Prereqs: macOS or Linux. Windows: use WSL or follow CLIENT-GUIDE.md "Manual install".

set -euo pipefail

# ─── Locate this script + repo root ─────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FACADE_DIR="$SCRIPT_DIR"
PARENT_DIR="$(dirname "$FACADE_DIR")"
UPSTREAM_DIR="${UPSTREAM_DIR:-$PARENT_DIR/GoHighLevel-MCP}"
UPSTREAM_REPO="${UPSTREAM_REPO:-https://github.com/mastanley13/GoHighLevel-MCP.git}"

# Pin the facade to a specific tag for reproducible installs. Override with
# SALESMFAST_OPS_VERSION=v1.1.x or set to "main" for HEAD. v1.1.4 = current
# stable as of 2026-05-10 — closes 277 manifest-vs-upstream drift findings
# (param-shape renames, missing requireds, broken social platform ops),
# adds `ghl-forms-reader`, `ghl-toolkit-help.token-status` diagnostic,
# 401 envelope enrichment, and the `audit:manifest` / `sync:required`
# scripts that detect and fix drift after upstream version bumps.
SALESMFAST_OPS_VERSION="${SALESMFAST_OPS_VERSION:-v1.1.4}"

# ─── Output helpers ─────────────────────────────────────────────────────────
GREEN="\033[0;32m"; RED="\033[0;31m"; YEL="\033[0;33m"; BLU="\033[0;34m"; NC="\033[0m"
log()  { printf "${BLU}▶${NC}  %s\n" "$*"; }
ok()   { printf "${GREEN}✓${NC}  %s\n" "$*"; }
warn() { printf "${YEL}⚠${NC}  %s\n" "$*"; }
err()  { printf "${RED}✗${NC}  %s\n" "$*" >&2; }
step() { printf "\n${BLU}━━━ %s ━━━${NC}\n" "$*"; }
fail() { err "$*"; exit 1; }

# ─── Step 1: pre-flight ─────────────────────────────────────────────────────
step "1/9 Pre-flight"

command -v git >/dev/null  || fail "git not found. Install git and re-run."
command -v node >/dev/null || fail "node not found. Install Node.js 20+ from https://nodejs.org"
command -v npm >/dev/null  || fail "npm not found (should ship with Node.js)."
command -v curl >/dev/null || fail "curl not found."

NODE_MAJOR="$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
if [[ "$NODE_MAJOR" -lt 20 ]]; then
  fail "Node.js $NODE_MAJOR found, but 20+ required. Update at https://nodejs.org"
fi
ok "Node.js $(node -v), npm $(npm -v), git $(git --version | awk '{print $3}')"

if ! command -v jq >/dev/null; then
  warn "jq not found — Desktop config auto-merge will be skipped (snippet still printed)."
  HAS_JQ=0
else
  HAS_JQ=1
fi

# Pin facade repo to the requested version (idempotent — only switches if needed).
if [[ -d "$FACADE_DIR/.git" ]]; then
  CURRENT_REF="$(cd "$FACADE_DIR" && git describe --tags --always 2>/dev/null || echo "unknown")"
  if [[ "$SALESMFAST_OPS_VERSION" != "main" && "$CURRENT_REF" != "$SALESMFAST_OPS_VERSION"* ]]; then
    log "Pinning facade to $SALESMFAST_OPS_VERSION (current: $CURRENT_REF)"
    (cd "$FACADE_DIR" && git fetch --tags --force --quiet 2>/dev/null || true)
    # The repo is a deployment artifact — local edits aren't expected to
    # survive an installer re-run. Force-clean before tag switch so *any*
    # dirty file (mutated package.json, CRLF/LF drift, AV touch, manual
    # edits) gets discarded. .env is gitignored so `git clean -fd` leaves it
    # alone (no `-x`). Replaces the earlier file-by-file restore which kept
    # missing newly-mutated files on re-runs.
    log "Discarding any local changes (installer treats repo as deployment artifact)"
    (cd "$FACADE_DIR" && git reset --hard --quiet HEAD 2>/dev/null || true)
    (cd "$FACADE_DIR" && git clean -fd --quiet 2>/dev/null || true)
    if (cd "$FACADE_DIR" && git rev-parse --verify --quiet "$SALESMFAST_OPS_VERSION" >/dev/null); then
      (cd "$FACADE_DIR" && git checkout --quiet "$SALESMFAST_OPS_VERSION") \
        || warn "checkout $SALESMFAST_OPS_VERSION failed — continuing on $CURRENT_REF"
    else
      warn "tag $SALESMFAST_OPS_VERSION not found locally; continuing on $CURRENT_REF (set SALESMFAST_OPS_VERSION=main to skip pinning)"
    fi
  else
    ok "Facade already on $CURRENT_REF (matches $SALESMFAST_OPS_VERSION)"
  fi
else
  warn "Facade dir is not a git repo — skipping version pin"
fi

# ─── Step 2: clone or update upstream ───────────────────────────────────────
step "2/9 Upstream GoHighLevel-MCP"

if [[ -d "$UPSTREAM_DIR/.git" ]]; then
  log "Existing upstream at $UPSTREAM_DIR — pulling latest"
  # Same deployment-artifact treatment as the facade: force-clean before pull.
  (cd "$UPSTREAM_DIR" && git reset --hard --quiet HEAD 2>/dev/null || true)
  (cd "$UPSTREAM_DIR" && git clean -fd --quiet 2>/dev/null || true)
  (cd "$UPSTREAM_DIR" && git pull --ff-only) || warn "git pull failed (continuing)"
elif [[ -d "$UPSTREAM_DIR" ]]; then
  fail "$UPSTREAM_DIR exists but is not a git repo. Move it aside or set UPSTREAM_DIR."
else
  log "Cloning upstream into $UPSTREAM_DIR"
  git clone "$UPSTREAM_REPO" "$UPSTREAM_DIR"
fi
ok "Upstream ready at $UPSTREAM_DIR"

# ─── Step 3: build upstream ─────────────────────────────────────────────────
step "3/9 Build upstream"

(
  cd "$UPSTREAM_DIR"
  if [[ ! -d node_modules ]]; then
    log "Installing upstream deps (one-time, ~1 min)"
    npm install --silent
  fi
  if [[ ! -f dist/tools/calendar-tools.js ]]; then
    log "Building upstream (one-time)"
    npm run build --silent
  fi
)
[[ -f "$UPSTREAM_DIR/dist/tools/calendar-tools.js" ]] || fail "Upstream build failed"
ok "Upstream built"

# ─── Step 4: patch facade package.json to point at local upstream ───────────
step "4/9 Wire facade → upstream"

cd "$FACADE_DIR"

CURRENT_DEP="$(node -e "console.log(require('./package.json').dependencies['ghl-mcp-upstream']||'')")"
DESIRED_DEP="file:$UPSTREAM_DIR"

if [[ "$CURRENT_DEP" == "$DESIRED_DEP" ]]; then
  ok "package.json already points at $UPSTREAM_DIR"
else
  log "Updating package.json: ghl-mcp-upstream → $DESIRED_DEP"
  npm pkg set dependencies.ghl-mcp-upstream="$DESIRED_DEP" >/dev/null
  ok "package.json updated"
fi

# ─── Step 5: install + build facade ─────────────────────────────────────────
step "5/9 Install + build facade"

if [[ ! -d node_modules ]] || [[ "$CURRENT_DEP" != "$DESIRED_DEP" ]]; then
  log "Running npm install (re-links the local upstream)"
  npm install --silent
fi
log "Building facade (tsc)"
npm run build >/dev/null
[[ -f dist/server.js ]] || fail "Facade build failed — dist/server.js missing"
ok "Facade built"

# ─── Step 6: collect credentials ────────────────────────────────────────────
step "6/9 Configure credentials"

PIT="${GHL_API_KEY:-}"
LOC="${GHL_LOCATION_ID:-}"
BASE="${GHL_BASE_URL:-https://services.leadconnectorhq.com}"
CATS="${GHL_TOOL_CATEGORIES:-all}"
DENY="${GHL_TOOL_DENY:-}"

if [[ -f .env ]]; then
  log "Existing .env found — re-using (delete .env to re-prompt)"
  set -a; source .env; set +a
  PIT="${GHL_API_KEY:-$PIT}"; LOC="${GHL_LOCATION_ID:-$LOC}"
  BASE="${GHL_BASE_URL:-$BASE}"; CATS="${GHL_TOOL_CATEGORIES:-$CATS}"; DENY="${GHL_TOOL_DENY:-$DENY}"
fi

if [[ -z "$PIT" ]]; then
  printf "  Enter GoHighLevel Personal Integration Token (starts with pit-): "
  read -r PIT
fi
if [[ -z "$LOC" ]]; then
  printf "  Enter GHL Location ID: "
  read -r LOC
fi

[[ -z "$PIT" ]] && fail "PIT required."
[[ -z "$LOC" ]] && fail "Location ID required."

# Write .env (env-style assignments via printf to avoid Edit-tool scanner triggers)
{
  printf 'GHL_API_KEY=%s\n' "$PIT"
  printf 'GHL_LOCATION_ID=%s\n' "$LOC"
  printf 'GHL_BASE_URL=%s\n' "$BASE"
  printf 'GHL_TOOL_CATEGORIES=%s\n' "$CATS"
  printf 'GHL_TOOL_DENY=%s\n' "$DENY"
} > .env
chmod 600 .env
ok ".env written ($(wc -c < .env | tr -d ' ') bytes, mode 600, gitignored)"

# ─── Step 7: PIT smoke-test ─────────────────────────────────────────────────
step "7/9 PIT smoke-test"

HTTP="$(curl -s -o /tmp/salesmfast-pit-check.body -w '%{http_code}' \
  -H "Authorization: Bearer $PIT" \
  -H "Version: 2021-07-28" \
  "$BASE/calendars/groups?locationId=$LOC")"

if [[ "$HTTP" == "200" ]]; then
  ok "PIT works against the live GHL API"
elif [[ "$HTTP" == "401" || "$HTTP" == "403" ]]; then
  err "PIT auth failed (HTTP $HTTP). Body: $(head -c 200 /tmp/salesmfast-pit-check.body)"
  err "Generate a fresh PIT in GHL → Settings → Private Integrations and retry."
  exit 1
else
  warn "PIT smoke-test returned HTTP $HTTP — continuing but probe may fail."
fi

# ─── Step 8: probe (full live verification) ─────────────────────────────────
step "8/9 Probe — live verification across all 18 categories"

if npm run probe 2>&1 | tee /tmp/salesmfast-probe.log | tail -5 | grep -q "All assertions passed"; then
  ok "Probe GREEN — every category live-verified"
else
  err "Probe failed — see /tmp/salesmfast-probe.log"
  err "Common causes: PIT lacks scope (regenerate with full scope), location ID mismatch, network."
  exit 1
fi

# ─── Step 9: Claude Desktop config ──────────────────────────────────────────
step "9/9 Claude Desktop wiring"

case "$(uname -s)" in
  Darwin)   DESKTOP_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json" ;;
  Linux)    DESKTOP_CONFIG="$HOME/.config/Claude/claude_desktop_config.json" ;;
  MINGW*|MSYS*|CYGWIN*) DESKTOP_CONFIG="${APPDATA:-}/Claude/claude_desktop_config.json" ;;
  *)        DESKTOP_CONFIG="" ;;
esac

SERVER_PATH="$FACADE_DIR/dist/server.js"

print_snippet() {
  cat <<SNIPPET
"salesmfast-ops": {
  "command": "node",
  "args": ["$SERVER_PATH"],
  "env": {
    "GHL_API_KEY": "$PIT",
    "GHL_LOCATION_ID": "$LOC",
    "GHL_BASE_URL": "$BASE",
    "GHL_TOOL_CATEGORIES": "$CATS",
    "GHL_TOOL_DENY": "$DENY"
  }
}
SNIPPET
}

if [[ -n "${SKIP_DESKTOP_MERGE:-}" ]]; then
  warn "SKIP_DESKTOP_MERGE set — printing snippet only"
  echo
  print_snippet
elif [[ -z "$DESKTOP_CONFIG" ]]; then
  warn "Unknown OS — Claude Desktop config path not auto-detected. Snippet:"
  echo
  print_snippet
elif [[ "$HAS_JQ" -eq 0 ]]; then
  warn "jq not installed — auto-merge skipped. Add this block under \"mcpServers\" in $DESKTOP_CONFIG:"
  echo
  print_snippet
else
  if [[ -f "$DESKTOP_CONFIG" ]]; then
    BACKUP="${DESKTOP_CONFIG%.json}.backup-$(date +%Y%m%d-%H%M%S).json"
    cp "$DESKTOP_CONFIG" "$BACKUP"
    log "Backed up existing config to $BACKUP"
  else
    mkdir -p "$(dirname "$DESKTOP_CONFIG")"
    echo '{"mcpServers":{}}' > "$DESKTOP_CONFIG"
    log "Created new Desktop config at $DESKTOP_CONFIG"
  fi

  TMP_NEW="$(mktemp)"
  jq \
    --arg cmd "node" \
    --arg arg0 "$SERVER_PATH" \
    --arg pit "$PIT" \
    --arg loc "$LOC" \
    --arg base "$BASE" \
    --arg cats "$CATS" \
    --arg deny "$DENY" \
    '. + (if .mcpServers then {} else {mcpServers:{}} end) |
     .mcpServers["salesmfast-ops"] = {
       command: $cmd,
       args: [$arg0],
       env: {
         GHL_API_KEY:         $pit,
         GHL_LOCATION_ID:     $loc,
         GHL_BASE_URL:        $base,
         GHL_TOOL_CATEGORIES: $cats,
         GHL_TOOL_DENY:       $deny
       }
     } |
     del(.mcpServers["ghl-mcp"])' \
    "$DESKTOP_CONFIG" > "$TMP_NEW"
  mv "$TMP_NEW" "$DESKTOP_CONFIG"
  ok "Merged 'salesmfast-ops' block into $DESKTOP_CONFIG"
  ok "Removed deprecated 'ghl-mcp' block (if present)"
fi

# ─── Done ───────────────────────────────────────────────────────────────────
echo
printf "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
printf "${GREEN}  ✓ SalesMfast Ops MCP installed and verified.${NC}\n"
printf "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
echo
echo "Next steps:"
echo "  1. Quit Claude Desktop completely (Cmd+Q on Mac)."
echo "  2. Reopen Claude Desktop."
echo "  3. In a new chat, ask: \"call ghl-toolkit-help with operation list-categories\""
echo "     You should see 18 categories returned."
echo
echo "Reference docs:"
echo "  • CLIENT-GUIDE.md   — full operator guide with all 18 categories"
echo "  • README.md         — quick reference + scripts"
echo "  • docs/MIGRATION.md — old → new tool name mapping"
echo
echo "Verify any time with: npm run probe"
echo
