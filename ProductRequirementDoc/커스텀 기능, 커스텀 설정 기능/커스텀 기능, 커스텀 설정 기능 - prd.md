# 설정 하기 기능

각 클럽 별로 "커스텀 하게 설정할 부분"을 아래 기능을 설정하는 기능을 만들려고 해

1. 사이드 메뉴에 "custom" 이라는 메뉴를 추가
2. 추가한 메뉴를 선택하면 "커스텀 하게 설정할 부분" 은 4가지 항목"을 관리할수 있는 화면으로 이동
3. 화면 왼쪽 메뉴에는 "커스텀 하게 설정할 부분" 은 4가지 항목이 있어
4. 화면 왼쪽 메뉴에 "커스텀 하게 설정할 부분"을 하나 선택하면 선택한 부분에 대해서 설정 할 수 있는 내용이 왼쪽 메뉴 오른쪽 메인 화면에 수정할 수 있는 컴포넌트에 나타나.(DB retrieve)
5. 4번 에서 나타난 화면을 수정 가능한 기능을 구현해줘(DB Creaet, Update)

- admin 계정만 사이드 메뉴에 클럽 설정 기능 추가
- 사이드 메뉴: src/components/organisms/navigation/mainNavigation/SideMenu.tsx

# 커스텀 하게 설정할 부분

1. 클럽 홈 설명 부분

- 설정할 필드
  - 운영 시간
  - 장소
  - 설명
- 클럽 홈 화면 dir: src/pages/clubs/[id]/index.tsx

2. "클럽 문의하기 기능"또는 "클럽 게스트 신청 기능" 하기 설명글 custom

   - 설정할 필드
     - "클럽 설명" 또는 "게스트 신청 설명"
     - "클럽 운동 시간"
   - 화면 dir: src/pages/clubs/[id]/guest/index.tsx
   - 특이 사항
     - src/pages/clubs/[id]/guest/index.tsx 코드 중 아래 코드에 의해서 "clubMember" 멤버 여부에 따라
       클럽에 가입 전이면 "문의하기 기능"으로 클럽에 가입 이후에는 "게스트 신청 기능"으로 변경돼
     - 전략 패턴으로(전략 패턴 설정된 dir: src/strategies/GuestPageStrategy.ts) 나뉘어져 있어
     ```
     //src/pages/clubs/[id]/guest/index.tsx
     const strategy = getGuestPageStrategy(!!clubMember);
     ```

3. 이메일 발송 custom
   - 이메일 받을 사람은 한명 이상
4. 문자 발송 custom
   - 문자를 받을 살마은 한명 이상

# 고민 사항

- 테이블 구조: 커스텀 하게 설정할 부분 관련 작업과 설정하기 기능을 구현할때 테이블 구조를 효율적, 최적화 해서 만들고 싶어

- 조회 타이밍:
  - 클럽별 커스텀한 내용을 처음에 모두 받아서 redux에 setting할지 아니면 화면 접속시 필요한 api를 따로 보낼지
  - 이번에 redux 대신에 zustand를 쓰고 redux와 비교 하고 싶어서 두개 모두 사용해보고 싶음

# 주의 사항

- ui 구현시 주의 사항 모바일 화면까지 지원
- 다음 패키지를 활용해서 구현해줘: @hookform/resolvers zod react-hook-form
- admin 조건을 가진 사람만 접근 할 수 있어(Role.ADMIN)

# 완료 되고 나서 마무리 작업

- Club model에 있는 아래 필드 제거 필요
  - description, location, meetingTime, maxMembers, etc
