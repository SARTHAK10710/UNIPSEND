#!/usr/bin/env bash
# ──────────────────────────────────────────────
#  Unispend Docker Rebuild & Management Script
# ──────────────────────────────────────────────
set -euo pipefail

# ─── Colors ───────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ─── Symbols ─────────────────────────────────
CHECK="${GREEN}✅${NC}"
CROSS="${RED}❌${NC}"
WARN="${YELLOW}⚠️${NC}"
INFO="${BLUE}ℹ️${NC}"

# ─── Service Map ──────────────────────────────
declare -A SERVICE_MAP=(
  [gateway]="gateway"
  [auth]="auth-service"
  [plaid]="plaid-service"
  [investment]="investment-service"
  [subscription]="subscription-service"
  [notification]="notification-service"
  [user]="user-service"
)

declare -A PORT_MAP=(
  [gateway]=3000
  [auth]=3001
  [plaid]=3002
  [investment]=3003
  [subscription]=3004
  [notification]=3005
  [user]=3006
)

VALID_SERVICES="gateway, auth, plaid, investment, subscription, notification, user"

# ─── Timer ────────────────────────────────────
START_TIME=$(date +%s)

elapsed() {
  local end=$(date +%s)
  local diff=$((end - START_TIME))
  local mins=$((diff / 60))
  local secs=$((diff % 60))
  if [ "$mins" -gt 0 ]; then
    echo "${mins}m ${secs}s"
  else
    echo "${secs}s"
  fi
}

# ─── Helpers ──────────────────────────────────
print_header() {
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}  $1${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

print_info()    { echo -e "  ${INFO}  ${BLUE}$1${NC}"; }
print_success() { echo -e "  ${CHECK} ${GREEN}$1${NC}"; }
print_error()   { echo -e "  ${CROSS} ${RED}$1${NC}"; }
print_warn()    { echo -e "  ${WARN}  ${YELLOW}$1${NC}"; }

# ─── Preflight Checks ────────────────────────
check_docker() {
  if ! command -v docker &>/dev/null; then
    print_error "Docker is not installed or not in PATH"
    exit 1
  fi

  if ! docker info &>/dev/null; then
    print_error "Docker daemon is not running. Start Docker Desktop first."
    exit 1
  fi

  # Check for docker compose (v2) or docker-compose (v1)
  if docker compose version &>/dev/null; then
    DC="docker compose"
  elif command -v docker-compose &>/dev/null; then
    DC="docker-compose"
  else
    print_error "Neither 'docker compose' nor 'docker-compose' found"
    exit 1
  fi
}

check_port() {
  local port=$1
  local name=$2
  if lsof -i :"$port" -sTCP:LISTEN &>/dev/null 2>&1 || \
     ss -tlnp 2>/dev/null | grep -q ":${port} " 2>/dev/null; then
    print_warn "Port $port ($name) may already be in use"
  fi
}

# ─── Health Check ─────────────────────────────
health_check() {
  print_header "Health Check"

  local all_ok=true

  for key in gateway auth plaid investment subscription notification user; do
    local port="${PORT_MAP[$key]}"
    local svc="${SERVICE_MAP[$key]}"
    local url="http://localhost:${port}/health"

    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "$url" 2>/dev/null || echo "000")

    if [ "$status" = "200" ]; then
      printf "  ${CHECK} %-20s → ${GREEN}http://localhost:${port}${NC}\n" "$key"
    else
      printf "  ${CROSS} %-20s → ${RED}http://localhost:${port}  (HTTP $status)${NC}\n" "$key"
      all_ok=false
    fi
  done

  echo ""
  if $all_ok; then
    print_success "All services are healthy!"
  else
    print_warn "Some services are not responding. Check logs with: ./rebuild.sh logs"
  fi
}

# ─── Commands ─────────────────────────────────

cmd_all() {
  print_header "Full Rebuild — All Services"

  print_info "Stopping all services..."
  $DC down --remove-orphans 2>/dev/null || true

  print_info "Building all services..."
  $DC build --no-cache

  print_info "Starting all services..."
  $DC up -d

  print_info "Waiting 8 seconds for services to start..."
  sleep 8

  health_check

  echo ""
  print_success "Full rebuild complete in $(elapsed)"
}

cmd_single() {
  local key=$1
  local svc="${SERVICE_MAP[$key]}"
  local port="${PORT_MAP[$key]}"

  print_header "Rebuilding $key ($svc)"

  check_port "$port" "$key"

  print_info "Stopping $svc..."
  $DC stop "$svc" 2>/dev/null || true
  $DC rm -f "$svc" 2>/dev/null || true

  print_info "Building $svc..."
  $DC build --no-cache "$svc"

  print_info "Starting $svc..."
  $DC up -d "$svc"

  print_info "Waiting 5 seconds..."
  sleep 5

  local url="http://localhost:${port}/health"
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "$url" 2>/dev/null || echo "000")

  if [ "$status" = "200" ]; then
    print_success "$key is healthy → http://localhost:${port}"
  else
    print_warn "$key returned HTTP $status"
  fi

  echo ""
  print_info "Showing recent logs for $svc..."
  echo ""
  $DC logs --tail=30 "$svc"

  echo ""
  print_success "Rebuild of $key complete in $(elapsed)"
}

cmd_health() {
  health_check
}

cmd_logs() {
  if [ -n "${1:-}" ]; then
    local key="$1"
    if [ -z "${SERVICE_MAP[$key]+x}" ]; then
      print_error "Unknown service: $key"
      print_info "Valid services: $VALID_SERVICES"
      exit 1
    fi
    local svc="${SERVICE_MAP[$key]}"
    print_info "Following logs for $svc... (Ctrl+C to stop)"
    $DC logs -f "$svc"
  else
    print_info "Following logs for all services... (Ctrl+C to stop)"
    $DC logs -f
  fi
}

cmd_stop() {
  print_header "Stopping All Services"
  $DC down --remove-orphans
  print_success "All services stopped in $(elapsed)"
}

cmd_restart() {
  print_header "Restarting All Services (no rebuild)"

  print_info "Stopping services..."
  $DC down --remove-orphans 2>/dev/null || true

  print_info "Starting services..."
  $DC up -d

  print_info "Waiting 8 seconds for services to start..."
  sleep 8

  health_check

  echo ""
  print_success "Restart complete in $(elapsed)"
}

cmd_fresh() {
  print_header "⚠️  FRESH REBUILD (Nuclear Option)"
  echo ""
  print_warn "This will DELETE all volumes including Postgres data!"
  echo ""
  read -rp "  Are you sure? (yes/no): " confirm
  if [ "$confirm" != "yes" ]; then
    print_info "Cancelled."
    exit 0
  fi

  echo ""
  print_info "Stopping everything..."
  $DC down --remove-orphans --volumes 2>/dev/null || true

  print_info "Removing dangling containers..."
  docker container prune -f 2>/dev/null || true

  print_info "Building everything from scratch..."
  $DC build --no-cache

  print_info "Starting all services..."
  $DC up -d

  print_info "Waiting 10 seconds for fresh initialization..."
  sleep 10

  health_check

  echo ""
  print_success "Fresh rebuild complete in $(elapsed)"
}

cmd_redis_flush() {
  print_header "Flushing Redis Cache"

  local redis_container
  redis_container=$($DC ps -q redis 2>/dev/null)

  if [ -z "$redis_container" ]; then
    print_error "Redis container is not running"
    exit 1
  fi

  docker exec "$redis_container" redis-cli FLUSHALL
  print_success "Redis cache flushed!"
}

cmd_db() {
  print_header "Opening Postgres Shell"
  print_info "Connecting to unispend database..."
  echo ""

  local pg_container
  pg_container=$($DC ps -q postgres 2>/dev/null)

  if [ -z "$pg_container" ]; then
    print_error "Postgres container is not running"
    exit 1
  fi

  docker exec -it "$pg_container" psql -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-unispend}"
}

cmd_redis_cli() {
  print_header "Opening Redis CLI"

  local redis_container
  redis_container=$($DC ps -q redis 2>/dev/null)

  if [ -z "$redis_container" ]; then
    print_error "Redis container is not running"
    exit 1
  fi

  docker exec -it "$redis_container" redis-cli
}

show_help() {
  echo ""
  echo -e "${BOLD}${CYAN}  ╦ ╦╔╗╔╦╔═╗╔═╗╔═╗╔╗╔╔╦╗${NC}"
  echo -e "${BOLD}${CYAN}  ║ ║║║║║╚═╗╠═╝║╣ ║║║ ║║${NC}"
  echo -e "${BOLD}${CYAN}  ╚═╝╝╚╝╩╚═╝╩  ╚═╝╝╚╝═╩╝${NC}"
  echo -e "  ${BLUE}Docker Rebuild & Management${NC}"
  echo ""
  echo -e "  ${BOLD}Usage:${NC}  ./rebuild.sh ${CYAN}<command>${NC} [args]"
  echo ""
  echo -e "  ${BOLD}Rebuild Commands:${NC}"
  echo -e "    ${CYAN}all${NC}              Rebuild and restart all services"
  echo -e "    ${CYAN}gateway${NC}          Rebuild gateway only"
  echo -e "    ${CYAN}auth${NC}             Rebuild auth-service only"
  echo -e "    ${CYAN}plaid${NC}            Rebuild plaid-service only"
  echo -e "    ${CYAN}user${NC}             Rebuild user-service only"
  echo -e "    ${CYAN}investment${NC}       Rebuild investment-service only"
  echo -e "    ${CYAN}subscription${NC}     Rebuild subscription-service only"
  echo -e "    ${CYAN}notification${NC}     Rebuild notification-service only"
  echo -e "    ${CYAN}fresh${NC}            Nuclear rebuild (deletes volumes)"
  echo ""
  echo -e "  ${BOLD}Management Commands:${NC}"
  echo -e "    ${CYAN}health${NC}           Check health of all services"
  echo -e "    ${CYAN}logs${NC}             Follow logs of all services"
  echo -e "    ${CYAN}logs <service>${NC}   Follow logs of specific service"
  echo -e "    ${CYAN}stop${NC}             Stop all services"
  echo -e "    ${CYAN}restart${NC}          Restart without rebuilding"
  echo ""
  echo -e "  ${BOLD}Utilities:${NC}"
  echo -e "    ${CYAN}redis-flush${NC}      Flush Redis cache"
  echo -e "    ${CYAN}db${NC}               Open Postgres shell"
  echo -e "    ${CYAN}redis${NC}            Open Redis CLI"
  echo ""
  echo -e "  ${BOLD}Examples:${NC}"
  echo -e "    ./rebuild.sh all          ${BLUE}# Full rebuild${NC}"
  echo -e "    ./rebuild.sh gateway      ${BLUE}# Rebuild gateway only${NC}"
  echo -e "    ./rebuild.sh logs auth    ${BLUE}# Follow auth-service logs${NC}"
  echo -e "    ./rebuild.sh health       ${BLUE}# Check all health endpoints${NC}"
  echo ""
}

# ─── Main ─────────────────────────────────────
check_docker

case "${1:-}" in
  all)            cmd_all ;;
  gateway)        cmd_single "gateway" ;;
  auth)           cmd_single "auth" ;;
  plaid)          cmd_single "plaid" ;;
  user)           cmd_single "user" ;;
  investment)     cmd_single "investment" ;;
  subscription)   cmd_single "subscription" ;;
  notification)   cmd_single "notification" ;;
  health)         cmd_health ;;
  logs)           cmd_logs "${2:-}" ;;
  stop)           cmd_stop ;;
  restart)        cmd_restart ;;
  fresh)          cmd_fresh ;;
  redis-flush)    cmd_redis_flush ;;
  db)             cmd_db ;;
  redis)          cmd_redis_cli ;;
  help|--help|-h) show_help ;;
  "")             show_help ;;
  *)
    print_error "Unknown command: $1"
    print_info "Valid services: $VALID_SERVICES"
    print_info "Run ./rebuild.sh help for usage"
    exit 1
    ;;
esac
