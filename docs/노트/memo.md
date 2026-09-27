1.  main에서 부터 브랜치 까지의 작업 사항 commit 확인

- git log --oneline main..jyoon/phone-verification

2. lint 확인 명령어

- 기본 lint 명령어
  이 명령어는 `next lint`를 실행하여 Next.js 프로젝트의 ESLint 검사를 수행합니다.

```bash
npm run lint
```

- 추가 lint 관련 명령어들

프로젝트에 설정된 다른 관련 명령어들:

- 코드 포맷팅

```bash
# Prettier로 코드 포맷팅 (package.json에 스크립트는 없지만 prettier가 설치되어 있음)
npx prettier --write .
```

- TypeScript 타입 체크

```bash
# TypeScript 컴파일러로 타입 체크
npx tsc --noEmit
```

- 전체 코드 품질 검사 (권장)

```bash
# lint + 타입 체크 + 포맷팅
npm run lint && npx tsc --noEmit && npx prettier --check .
```

- ESLint 설정 정보

프로젝트에는 다음과 같은 ESLint 관련 패키지들이 설치되어 있습니다:

- `eslint`: 기본 ESLint
- `eslint-config-next`: Next.js 전용 ESLint 설정
- `eslint-config-prettier`: Prettier와 충돌 방지
- `eslint-plugin-import`: import 문 검사
- `eslint-plugin-prettier`: Prettier를 ESLint 규칙으로 실행

`package.json`에 커스텀 ESLint 규칙도 설정되어 있어서 사용하지 않는 변수와 `any` 타입 사용 시 경고를 표시합니다.

3. 모든 파일의 import 그룹 문제를 한번에 해결 방법

```
npx eslint --fix src/
```

이렇게 하면 import 그룹 간 빈 줄 누락 문제가 자동으로 해결됩니다.
