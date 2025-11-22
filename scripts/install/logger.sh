#!/usr/bin/env bash
#
# Logging and Progress Utilities
# Provides consistent output formatting
#

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${BLUE}ℹ${NC}  $*"
}

log_success() {
  echo -e "${GREEN}✓${NC} $*"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC}  $*" >&2
}

log_error() {
  echo -e "${RED}❌${NC} $*" >&2
}

log_step() {
  echo -e "${BLUE}▶${NC}  $*"
}

show_progress() {
  local current="$1"
  local total="$2"
  local message="$3"

  echo -e "${BLUE}[$current/$total]${NC} $message"
}
