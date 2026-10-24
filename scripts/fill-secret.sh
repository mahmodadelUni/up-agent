#!/usr/bin/env bash
# Types the value of an APP_* environment variable into a page field via playwright-cli.
#
# Why this exists: headless Claude refuses any shell command containing "$VAR",
# so the agent cannot run:  playwright-cli fill e13 "$APP_EMAIL"
# The agent runs this script instead, with no "$" in the command. The variable is
# expanded inside this script, and any echo of the value in the output is masked.
#
# The value comes from the environment, or from the project's .env file when the variable
# is not set in the environment (so nobody has to remember to "source .env").
#
# Usage: bash scripts/fill-secret.sh -s=<session> <element-ref> <ENV_VAR_NAME> [--submit]
# Example: bash scripts/fill-secret.sh -s=TC-001 e13 APP_EMAIL
set -u

if [ "$#" -lt 3 ]; then
  echo "usage: fill-secret.sh -s=<session> <element-ref> <ENV_VAR_NAME> [--submit]" >&2
  exit 2
fi

session="$1"; ref="$2"; var="$3"; shift 3

[[ "$session" =~ ^-s=[A-Za-z0-9._-]+$ ]] || { echo "refused: bad session argument" >&2; exit 2; }
[[ "$ref" =~ ^[A-Za-z0-9_-]+$ ]]         || { echo "refused: bad element ref" >&2; exit 2; }
[[ "$var" =~ ^APP_[A-Z0-9_]+$ ]]         || { echo "refused: only APP_* variables may be used" >&2; exit 2; }
for extra in "$@"; do
  [ "$extra" = "--submit" ] || { echo "refused: unsupported option '$extra'" >&2; exit 2; }
done

value="${!var:-}"
env_file="$(cd "$(dirname "$0")/.." && pwd)/.env"
if [ -z "$value" ] && [ -f "$env_file" ]; then
  line="$(grep -E "^[[:space:]]*(export[[:space:]]+)?${var}[[:space:]]*=" "$env_file" | tail -n 1)"
  value="${line#*=}"
  value="${value%$'\r'}"                                   # Windows line endings
  value="${value#"${value%%[![:space:]]*}"}"               # trim leading spaces
  value="${value%"${value##*[![:space:]]}"}"               # trim trailing spaces
  if [[ "$value" =~ ^\"(.*)\"$ ]] || [[ "$value" =~ ^\'(.*)\'$ ]]; then value="${BASH_REMATCH[1]}"; fi
fi
if [ -z "$value" ]; then
  echo "$var is not set: add it to .env" >&2
  exit 3
fi

out="$(playwright-cli "$session" fill "$ref" "$value" "$@" 2>&1)"
rc=$?
out="${out//"$value"/***}"   # mask the secret if the CLI echoes it back
printf '%s\n' "$out"
exit $rc