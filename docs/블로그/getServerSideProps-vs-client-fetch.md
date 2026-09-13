# getServerSideProps란? 그리고 클라이언트 fetch와의 차이

Next.js에서 페이지 데이터를 가져오는 대표적인 두 가지 방식인 **getServerSideProps**와 **useEffect + fetch/useQuery**의 차이를 정리한 글입니다.

---

## 1. getServerSideProps는 어떤 역할을 할까?

**getServerSideProps**는 Next.js가 제공하는 **특별한 함수**다.  
이 함수가 있으면, **해당 페이지로 요청이 올 때마다 서버에서 이 함수를 먼저 실행**하고, 그 반환값(`props`)을 페이지 컴포넌트에 넘겨준다.

### 하는 일 요약

- **실행 시점:** 사용자가 해당 페이지로 이동할 때마다
- **실행 위치:** **항상 서버(Node.js)**
- **역할:** DB/API에서 데이터를 가져와서 `props`로 페이지에 전달

즉, **“이 페이지를 그리기 전에, 서버에서 데이터를 미리 채워서 준다”**가 핵심 역할이다.

### 간단한 코드 예시

```tsx
// pages/clubs/[id]/guest/[guestId]/index.tsx

function GuestDetailPage({ guestPost }: { guestPost: GuestPost }) {
  return (
    <div>
      <h1>{guestPost.name}</h1>
      <p>상태: {guestPost.status}</p>
    </div>
  );
}

// 이 함수만 export하면 Next.js가 "페이지 요청 시 서버에서 실행"한다.
export const getServerSideProps = async (context: any) => {
  const { guestId } = context.params;

  const guestPost = await prisma.guestPost.findUnique({
    where: { id: guestId },
    select: { id: true, name: true, status: true /* ... */ },
  });

  if (!guestPost) {
    return { notFound: true };
  }

  return {
    props: {
      guestPost: JSON.parse(JSON.stringify(guestPost)),
    },
  };
};

export default GuestDetailPage;
```

- 사용자가 `/clubs/1/guest/abc` 로 접속하면
- **서버**가 `getServerSideProps`를 실행해 `guestPost`를 DB에서 가져오고
- 그 값을 `props.guestPost`로 `GuestDetailPage`에 넘긴 뒤
- **서버**에서 컴포넌트를 한 번 렌더해 HTML을 만든다.

---

## 2. getServerSideProps vs useEffect + fetch/useQuery

두 방식의 차이는 **“누가, 어디서, 언제” 데이터를 가져오느냐**다.

| 구분                     | getServerSideProps                    | useEffect + fetch / useQuery             |
| ------------------------ | ------------------------------------- | ---------------------------------------- |
| **데이터를 가져오는 곳** | 서버                                  | 클라이언트(브라우저)                     |
| **실행 시점**            | 페이지 요청 시, **페이지 렌더 전**    | 페이지가 **이미 브라우저에 뜬 뒤**       |
| **사용자 체감**          | 첫 화면부터 데이터가 채워진 HTML 수신 | 먼저 뼈대/로딩 → API 응답 후 데이터 표시 |

---

## 질문 1. “서버에서 데이터를 미리 채워서 그린다” = HTML에 이미 들어가 있다는 말?

**맞다.**  
다만 “데이터만 넣어서 보낸다”가 아니라, **서버가 React로 페이지를 한 번 그려서 만든 HTML**을 보낸다는 뜻이다.

- **서버:**
  - `getServerSideProps`로 데이터를 가져온다.
  - 그 데이터를 `props`로 페이지 컴포넌트에 넘긴다.
  - **같은 페이지 컴포넌트를 서버에서 한 번 실행**해 HTML 문자열을 만든다.
  - 이 HTML에는 이미 게스트 이름, 상태 같은 **데이터가 반영**되어 있다.
- **클라이언트:**
  - 그 **완성된 HTML**을 받아서 먼저 화면에 그대로 보여준다.
  - 그 다음 같은 페이지 컴포넌트를 브라우저에서 다시 실행해 이벤트만 붙인다(hydration).

그래서 **“서버에서 데이터를 미리 채워서 그린다” = “서버가 데이터까지 넣은 완성된 HTML을 만들어 보내고, 클라이언트는 그걸 받아서 그리기만 하면 된다”**가 맞다.

### 흐름 비교 (개념)

**getServerSideProps:**

```
[요청] → [서버: getServerSideProps 실행 → DB 조회 → props 생성]
      → [서버: 컴포넌트 렌더 → HTML 생성]
      → [클라이언트: HTML 수신 → 화면 표시 → (선택) hydration]
```

**useEffect + useQuery:**

```
[요청] → [서버: 뼈대 HTML만 전달]
      → [클라이언트: HTML 표시]
      → [클라이언트: useEffect/useQuery 실행 → API 호출]
      → [클라이언트: 응답 수신 후 화면 업데이트]
```

---

## 질문 2. getServerSideProps 코드는 파일에 같이 있는데, 왜 “서버에서만” 돌아가나?

**코드가 “어느 파일에 있냐”가 아니라, Next.js가 “이 코드를 어디서 실행하기로 했냐”로 갈린다.**

- **같은 파일(`index.tsx`) 안에 있어도:**
  - **`getServerSideProps`**  
    → Next.js가 **“이 이름의 함수는 페이지 요청 시 서버(Node)에서만 실행한다”**라고 정해 둔 **특별한 이름**이다.  
    그래서 이 함수는 **브라우저 번들에 포함되지 않고, 서버에서만 실행**된다.
  - **일반 컴포넌트 / `useEffect` / `useQuery`**  
    → 브라우저용 JS 번들에 들어가 **클라이언트에서 실행**된다.  
    (getServerSideProps를 쓰는 페이지는, 첫 렌더 시 서버에서도 이 컴포넌트를 한 번 실행해 HTML을 만든다.)

정리하면:

- **getServerSideProps**
  - **실행 위치:** 항상 **서버만**
  - **역할:** “이 페이지 요청 올 때마다 서버에서 데이터 가져와서 props 만들기”
- **useEffect + fetch / useQuery**
  - **실행 위치:** **브라우저(클라이언트)**
  - **역할:** “페이지가 이미 뜬 다음, 클라이언트가 API 호출해서 데이터 가져오기”

파일은 같이 있어도, **함수 이름(`getServerSideProps`) 때문에 “이건 서버 전용”으로 분리되어 동작한다**고 보면 된다.

### 같은 파일, 다른 실행 환경 예시

```tsx
// 이 파일 하나에 "서버 전용"과 "클라이언트 전용"이 공존한다.

function GuestDetailPage({ guestPost }: Props) {
  // 아래 훅들은 브라우저에서만 실행된다.
  const [comments, setComments] = useState([]);
  useEffect(() => {
    fetch(`/api/guests/${guestId}/comments`).then(/* ... */);
  }, []);

  return (
    <div>
      <h1>{guestPost.name}</h1> {/* getServerSideProps에서 온 데이터 */}
      <CommentList comments={comments} /> {/* 클라이언트 fetch 데이터 */}
    </div>
  );
}

// 이 함수는 이 파일에 있지만 "서버에서만" 실행된다.
// Next.js가 이 이름을 보고 서버 전용으로 취급한다.
export const getServerSideProps = async (context: any) => {
  const guestPost = await prisma.guestPost.findUnique({
    /* ... */
  });
  return { props: { guestPost } };
};

export default GuestDetailPage;
```

- `getServerSideProps` → 서버에서만 실행, `guestPost` 제공
- `useEffect` 안의 `fetch` → 클라이언트에서만 실행, 댓글 목록 등 추가 데이터

---

## 요약

| 질문                        | 요약 답변                                                                                                                                                                                                                                                   |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **getServerSideProps 역할** | 페이지 요청 시 **서버에서** 데이터를 가져와 **props**로 넘겨 주고, 서버가 그 데이터로 HTML까지 만들어 보내준다.                                                                                                                                             |
| **질문 1**                  | 네. 서버가 **데이터까지 넣어서 만든 HTML**을 보내고, 클라이언트는 그걸 받아서 먼저 그리기만 하면 된다.                                                                                                                                                      |
| **질문 2**                  | `getServerSideProps`는 **이름 때문에** Next.js가 “서버에서만 실행”하도록 약속한 함수라서, 같은 파일에 있어도 **서버에서만** 돌고, 데이터는 **서버**에서 가져온다. `useEffect`/`useQuery`는 **브라우저**에서만 돌아서, 데이터는 **클라이언트**에서 가져온다. |

이렇게 정리해 두면 나중에 “서버에서 미리 채워서 그린다”와 “같은 파일인데 서버만 도는 이유”를 다시 볼 때 도움이 된다.
