# 설정 하기 기능

각 클럽 별로 "커스텀 하게 설정할 부분"을 아래 기능을 설정하는 기능을 만들려고 해

- admin 계정만 사이드 메뉴에 클럽 설정 기능 추가
- 사이드 메뉴: src/components/organisms/navigation/mainNavigation/SideMenu.tsx

# 커스텀 하게 설정할 부분

1. "클럽 문의하기 기능"또는 "클럽 게스트 신청 기능" 하기 설명글 custom

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

2. 이메일 발송 custom
   - 이메일 받을 사람은 한명 이상
3. 문자 발송 custom
   - 문자를 받을 살마은 한명 이상

# 고민 사항

- 테이블 구조: 커스텀 하게 설정할 부분 관련 작업과 설정하기 기능을 구현할때 테이블 구조를 효율적, 최적화 해서 만들고 싶어

---

# 클럽 문의 하기

- [ ] 이메일 전송 db로 관리 하기
- [ ] 설명 부분 db로 관리 하기

# 회원 관리

- 회원 관리 페이지 추가

# 세팅

- 임원 관리
- 게스트 신청 하기 안내글
- 클럽 문의 하기 안내글
- [ ] 이메일 전송 관리 하기
-

# 메인 페이지

- 회원 목록
  - 전체 회원이 볼 수 있도록

# 컴포넌트

- dropdown layer
  - 아래 메뉴에 있음
  - src/components/organisms/club/ClubMemberCard.tsx

# refactoring

- useParticipantSortContext > participants 수정

```
const { sortOption, participants, onChangeSort } =
    useParticipantSortContext();
```
