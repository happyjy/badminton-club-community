#!/usr/bin/env bash
# 워크트리를 만들 때 .env를 메인 체크아웃에서 복사한다.
#
# .env는 .gitignore 대상이라 워크트리에 따라오지 않는다.
# 없으면 DB 연결부터 실패해 앱이 뜨지 않으므로 매번 손으로 복사해야 했다.
#
# 주의: 이 .env의 DATABASE_URL은 프로덕션 Supabase를 가리킨다(CLAUDE.md 참고).
# 워크트리에서 dev 서버를 띄우면 운영 DB에 직접 붙는다는 뜻이다.
set -uo pipefail

INPUT=$(cat)

# 훅 페이로드의 경로 필드명이 버전에 따라 다를 수 있어 후보를 순서대로 본다.
WORKTREE=$(printf '%s' "$INPUT" | jq -r '
  .worktree_path // .worktreePath // .path // .cwd //
  .tool_input.worktree_path // .tool_response.worktree_path // empty
' 2>/dev/null)

[ -n "$WORKTREE" ] && [ -d "$WORKTREE" ] || exit 0

SOURCE="${CLAUDE_PROJECT_DIR:-}"
# 훅이 이미 워크트리 안에서 실행되면 CLAUDE_PROJECT_DIR가 워크트리를 가리킬 수 있다.
# 그때는 메인 체크아웃을 git에게 직접 묻는다.
if [ -z "$SOURCE" ] || [ ! -f "$SOURCE/.env" ]; then
  SOURCE=$(git -C "$WORKTREE" worktree list --porcelain 2>/dev/null |
    awk '/^worktree /{print substr($0,10); exit}')
fi

[ -n "$SOURCE" ] && [ -f "$SOURCE/.env" ] || exit 0
[ "$SOURCE" = "$WORKTREE" ] && exit 0
# 이미 있으면 덮어쓰지 않는다. 워크트리별로 손댄 설정을 날리지 않기 위해서다.
[ -f "$WORKTREE/.env" ] && exit 0

cp "$SOURCE/.env" "$WORKTREE/.env" 2>/dev/null || exit 0

printf '{"systemMessage":"%s"}\n' ".env를 워크트리로 복사했습니다 (DATABASE_URL은 프로덕션을 가리킵니다)"
