#!/usr/bin/env bash
set -euo pipefail

repository_root="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
required_server_env=(DATABASE_URL NEXTAUTH_SECRET CRON_SECRET)
fail=0

ci_build_block="$(awk '
  /^      - name: Build Next.js$/ { in_build_step = 1 }
  in_build_step && /^      - name:/ && $0 !~ /Build Next.js/ { exit }
  in_build_step && /^  [[:alnum:]_-]+:$/ { exit }
  in_build_step { print }
' "${repository_root}/.github/workflows/ci.yml")"
e2e_job_env_block="$(awk '/^    env:$/ { in_env = 1 } in_env { print } /^    steps:$/ { exit }' "${repository_root}/.github/workflows/e2e.yml")"
docker_builder_block="$(awk '/^FROM .* AS builder$/ { in_builder = 1 } /^FROM .* AS runner$/ { exit } in_builder { print }' "${repository_root}/web/Dockerfile")"

check_yaml_env() {
  local surface="$1"
  local block="$2"
  local key="$3"
  local declaration
  local value

  declaration="$(grep -E "^[[:space:]]+${key}:" <<<"${block}" | head -1 || true)"
  value="${declaration#*:}"
  value="$(sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//' <<<"${value}")"

  if [ -z "${value}" ] || grep -Eq "^(\"\"|'')([[:space:]]+#.*)?$" <<<"${value}"; then
    echo "::error::${surface} 缺少必要 build environment variable：${key}"
    fail=1
  fi
}

check_docker_env() {
  local key="$1"
  local argument
  local argument_value
  local forward_pattern

  argument="$(grep -E "^ARG ${key}=" <<<"${docker_builder_block}" | head -1 || true)"
  argument_value="${argument#*=}"
  argument_value="$(sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//' <<<"${argument_value}")"

  if [ -z "${argument_value}" ] || grep -Eq "^(\"\"|'')$" <<<"${argument_value}"; then
    echo "::error::Docker builder 缺少必要 build ARG：${key}"
    fail=1
  fi

  forward_pattern="^(ENV[[:space:]]+|[[:space:]]+)${key}=\\\$${key}([[:space:]]|$)"
  if ! grep -Eq "${forward_pattern}" <<<"${docker_builder_block}"; then
    echo "::error::Docker builder 未將 ${key} 傳入 build ENV"
    fail=1
  fi
}

for key in "${required_server_env[@]}"; do
  check_yaml_env "CI build job" "${ci_build_block}" "${key}"
  check_yaml_env "E2E job" "${e2e_job_env_block}" "${key}"
  check_docker_env "${key}"
done

if [ "${fail}" -ne 0 ]; then
  exit 1
fi

echo "Runtime build environment contract is consistent."
