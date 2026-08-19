#!/usr/bin/env bash
#
# 원격 DB를 파괴할 수 있는 명령을 실행 직전에 잡아 사용자 확인을 요구한다.
#
# 배경: 2026-08-19, 프로덕션 Supabase를 가리키는 .env 상태에서 `prisma migrate dev`가
# 실행되어 "리셋이 필요하다"는 응답을 받았다. 비대화형 셸이라 실제 삭제로 이어지지는
# 않았지만, 확인 프롬프트가 뜨는 환경이었다면 데이터가 사라질 수 있었다.
#
# PreToolUse(Bash) 훅. stdin으로 {"tool_input":{"command":"..."}} 형태의 JSON을 받는다.
# 종료 코드 0 = 통과, 그 외 = 차단(stderr 내용이 사용자와 Claude에게 전달된다).

set -uo pipefail

payload=$(cat)

# jq가 없는 환경도 있으므로 python3로 파싱한다(macOS 기본 탑재).
#
# 히어독 본문은 실행되는 명령이 아니라 데이터다. PR 본문이나 문서에
# 위험 명령의 "이름"이 적혀 있다고 차단하면 오탐이 된다.
# JSON을 풀면서 히어독 구간을 함께 비워 실제 명령만 남긴다.
command_line=$(printf '%s' "$payload" | python3 -c '
import json, re, sys

try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)

text = data.get("tool_input", {}).get("command", "")

# <<TAG / <<"TAG" / <<-TAG 형태를 찾아 본문을 지운다.
for tag in set(re.findall(r"<<-?\s*[\"\x27]?([A-Za-z_][A-Za-z0-9_]*)[\"\x27]?", text)):
    pattern = (r"(<<-?\s*[\"\x27]?" + re.escape(tag) + r"[\"\x27]?\n)"
               r".*?"
               r"(^\s*" + re.escape(tag) + r"\s*$)")
    text = re.sub(pattern, r"\1\2", text, flags=re.DOTALL | re.MULTILINE)

sys.stdout.write(text)
' 2>/dev/null)

[ -z "$command_line" ] && exit 0

# ── 1. 안전 목록: 읽기 전용이거나 프로덕션에 안전한 명령은 즉시 통과 ──────────────
#    migrate deploy는 이미 검토된 마이그레이션만 적용하므로 파괴적이지 않다.
if printf '%s' "$command_line" | grep -qE 'prisma[[:space:]]+(generate|validate|format)'; then
  exit 0
fi
if printf '%s' "$command_line" | grep -qE 'prisma[[:space:]]+migrate[[:space:]]+(status|diff|deploy)'; then
  exit 0
fi

# ── 2. 파괴 가능 명령 탐지 ───────────────────────────────────────────────────
danger_reason=""

if printf '%s' "$command_line" | grep -qE 'prisma[[:space:]]+migrate[[:space:]]+(dev|reset)'; then
  danger_reason="prisma migrate dev/reset — 스키마 드리프트가 있으면 DB 전체 리셋을 요구한다"
elif printf '%s' "$command_line" | grep -qE 'prisma[[:space:]]+db[[:space:]]+(push|execute)'; then
  danger_reason="prisma db push/execute — 스키마를 직접 변경하며 컬럼·테이블 삭제를 동반할 수 있다"
elif printf '%s' "$command_line" | grep -qE 'prisma[[:space:]]+migrate[[:space:]]+resolve'; then
  danger_reason="prisma migrate resolve — 마이그레이션 이력을 조작해 이후 작업의 판단 근거를 바꾼다"
elif printf '%s' "$command_line" | grep -qE 'supabase[[:space:]]+db[[:space:]]+(reset|remote[[:space:]]+commit)'; then
  danger_reason="supabase db reset — 로컬/원격 DB를 초기화한다"
elif printf '%s' "$command_line" | grep -qE '(^|[|;&[:space:]])(psql|pg_restore|mysql|supabase)([[:space:]]|$)'; then
  # SQL은 psql 등 DB 클라이언트를 거칠 때만 위험하다.
  # 이 조건이 없으면 커밋 메시지의 "delete from" 같은 평범한 문자열까지 걸린다.
  if printf '%s' "$command_line" | grep -qiE '\b(DROP|TRUNCATE)[[:space:]]+(TABLE|SCHEMA|DATABASE)\b'; then
    danger_reason="DROP/TRUNCATE — 테이블 또는 스키마를 삭제한다"
  elif printf '%s' "$command_line" | grep -qiE '\bDELETE[[:space:]]+FROM\b'; then
    danger_reason="DELETE FROM — 행을 삭제한다"
  fi
elif printf '%s' "$command_line" | grep -qE '\bprisma\b' && printf '%s' "$command_line" | grep -qE '\bdeleteMany\b'; then
  danger_reason="deleteMany — 조건에 걸리는 행을 모두 삭제한다"
fi

[ -z "$danger_reason" ] && exit 0

# ── 3. 대상 DB가 원격인지 판정 ───────────────────────────────────────────────
#    로컬(localhost/127.0.0.1)이 아니면 전부 위험으로 본다.
db_host=""
env_file=""
for candidate in .env .env.local; do
  if [ -f "$candidate" ]; then env_file="$candidate"; break; fi
done

if [ -n "$env_file" ]; then
  db_host=$(grep -E '^[[:space:]]*(DATABASE_URL|DIRECT_URL)=' "$env_file" 2>/dev/null \
    | head -1 \
    | sed -E 's/.*@([^/:]+).*/\1/' \
    | tr -d '"'"'"'')
fi

case "$db_host" in
  localhost|127.0.0.1|"")
    # 로컬이거나 판정 불가. 판정 불가일 때는 막지 않되 아래에서 경고를 남긴다.
    if [ -z "$db_host" ]; then
      cat >&2 <<WARN
[DB 가드] 대상 DB를 판정하지 못했습니다 (.env에서 DATABASE_URL을 찾을 수 없음).

실행하려는 명령:
  $command_line

위험 요소: $danger_reason

로컬 DB가 맞는지 확인한 뒤 진행하세요. 원격 DB라면 사용자에게 먼저 확인을 받아야 합니다.
WARN
      exit 2
    fi
    exit 0
    ;;
esac

# ── 4. 원격 DB + 파괴 가능 명령 → 차단하고 확인 요구 ─────────────────────────
cat >&2 <<BLOCKED
[DB 가드] 원격 데이터베이스를 대상으로 한 위험 명령이라 차단했습니다.

실행하려는 명령:
  $command_line

대상 DB:
  $db_host  (원격 — 프로덕션일 수 있음)

위험 요소:
  $danger_reason

이 명령은 사용자 승인 없이 실행하면 안 됩니다. 다음 순서를 따르세요.

  1. 먼저 영향 범위를 확인한다 (읽기 전용이라 안전):
       npx prisma migrate diff \\
         --from-schema-datasource prisma/schema.prisma \\
         --to-schema-datamodel prisma/schema.prisma --script

  2. 무엇이 바뀌고 무엇이 사라지는지 사용자에게 설명한다.

  3. 백업 상태를 확인하도록 안내한다
     (Supabase 대시보드 → Database → Backups).

  4. 사용자가 명시적으로 승인한 뒤에만 진행한다.

안전한 대안:
  npx prisma migrate diff    (미리보기)
  npx prisma migrate status  (상태 확인)
  npx prisma migrate deploy  (검토된 마이그레이션만 적용)
BLOCKED
exit 2
