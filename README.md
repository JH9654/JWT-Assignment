# 시네로그 (CineLog) — JWT 인증 영화 리뷰 게시판

웹서비스설계 JWT 게시판 개인 과제입니다.

## 작성자와 서비스 소개

- 학번 / 이름: [202212941] / [박준호]
- 서비스 목적과 대상 사용자: 영화를 본 뒤 감상을 기록하고 다른 사람과 나누고 싶은 사용자를 위한 영화 리뷰 게시판입니다. 누구나 로그인 없이 리뷰 목록과 상세 내용을 읽을 수 있습니다. 리뷰 작성은 로그인한 사용자만 할 수 있고, 수정·삭제는 리뷰를 쓴 본인만 할 수 있습니다. 로그인은 JWT로 처리하며, 작성자 확인과 권한 검사는 서버에서 합니다.
- 선택한 기술: React + Node.js Express (SQLite 파일 DB)
- 주요 기능: 공개 리뷰 목록·상세 조회, 로그인과 JWT 발급, 내 정보 조회, 본인 리뷰 작성·수정·삭제, 토큰 만료·로그아웃 처리, 입력·인증·권한 오류 안내

## 보고서와 테스트 증거

- [구현 보고서 PDF](docs/report.pdf)
- [테스트 증거](docs/evidence/)

## 프로젝트 구조

```text
.
├── README.md
├── .gitignore
├── frontend-react/        # React 프론트 (Vite)
│   ├── index.html
│   ├── vite.config.js     # /api → 127.0.0.1:8000 프록시 (dev·preview)
│   ├── package.json, package-lock.json
│   └── src/
│       ├── api.js         # 토큰 보관·Authorization 헤더·응답 코드 처리
│       ├── main.jsx       # 화면과 상태
│       └── style.css
├── backend-express/       # Express 백엔드
│   ├── .env.example       # 환경설정 예시 (실제 .env는 커밋하지 않음)
│   ├── package.json, package-lock.json
│   └── src/
│       ├── app.js         # 라우트·입력 검사·오류 응답
│       ├── auth.js        # JWT 발급·검증·작성자 권한 검사 (학생 구현)
│       ├── store.js       # SQLite 저장소 (sql.js)
│       ├── users.js       # 테스트 계정·비밀번호 검증 (제공 코드)
│       └── errors.js
├── tools/
│   └── check_api.py       # 제공 자동 API 검사 도구
└── docs/
    ├── report.pdf
    └── evidence/          # 테스트 캡처
```

## 실행 환경

| 항목 | 사용 버전 |
|---|---|
| 운영체제 | Windows [버전, Windows 11 Home] |
| Node.js (프론트·백엔드 공통) | v24.13.0 (요구: 20.19 이상) |
| 백엔드 | Express 5.3.0, jsonwebtoken 9.0.3, sql.js 1.14.2, dotenv 18.0.7 |
| 프론트 | React 19.3.0, Vite 8.3.4 |
| 데이터 저장 | SQLite 파일 (`backend-express/data/board.sqlite`) |
| 자동 검사 | Python 3.14 (`tools/check_api.py`, 표준 라이브러리만 사용) |

## 설치와 실행

터미널 두 개를 사용합니다. 터미널 A는 백엔드, 터미널 B는 프론트입니다. 아래 명령은 Windows PowerShell 기준이며, macOS/Linux에서 다른 부분은 따로 적었습니다.

> PowerShell에서 `npm` 실행 시 "스크립트를 실행할 수 없으므로" 오류가 나면 한 번만 실행:
> `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

### 1 저장소 복제

```sh
git clone https://github.com/JH9654/JWT-Assignment.git
cd JWT-Assignment
```

### 2 백엔드 준비와 실행 (터미널 A)

```powershell
cd backend-express
npm ci
Copy-Item .env.example .env          # macOS/Linux: cp .env.example .env
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

마지막 명령이 출력한 64자리 16진수를 `.env`의 `JWT_SECRET=` 뒤에 붙여 넣고 저장합니다. 그다음 서버를 실행합니다.

```powershell
npm start
```

- 환경설정 예시 파일: `backend-express/.env.example`
- JWT_SECRET: 32바이트 난수를 64자리 16진수로 표현한 값입니다. 서버 시작 시 빈 값, 형식 오류, 예시 키이면 시작을 거부합니다. 실제 키는 저장소에 올리지 않습니다.
- JWT_ISSUER / JWT_AUDIENCE: `webservice-class` / `board-api` (예시 파일 값 그대로 사용)
- TOKEN_TTL: 기본 90초. 만료 테스트를 할 때는 서버를 짧은 TTL로 다시 시작합니다.
  - PowerShell: `$env:TOKEN_TTL="3"` 후 `npm start` → 테스트가 끝나면 `Remove-Item Env:TOKEN_TTL` 후 재시작
  - macOS/Linux: `TOKEN_TTL=3 npm start`
- 백엔드 주소: http://127.0.0.1:8000
- 정상 실행 확인: 브라우저에서 http://127.0.0.1:8000/api/health → `{"status":"ok","stack":"express"}`

### 3 프론트 빌드와 로컬 실행 (터미널 B)

백엔드를 켜 둔 상태에서 실행합니다.

```sh
cd frontend-react
npm ci
npm run build
npm run preview
```

- 최종 확인 주소: http://127.0.0.1:4173
- 개발 중 실행: `npm run dev` → http://127.0.0.1:5173
- API 연결 방식: 프론트는 `/api`로 요청하고, Vite의 `server.proxy`와 `preview.proxy`가 이 요청을 http://127.0.0.1:8000 백엔드로 전달합니다. 백엔드 포트를 바꿀 때는 `frontend-react/vite.config.js`의 두 proxy 설정을 함께 수정합니다.
- 종료: 각 터미널에서 `Ctrl + C`
- 코드 변경 후 재실행: 백엔드 코드나 `.env`를 바꾸면 `Ctrl + C` 후 `npm start`로 재시작합니다. 프론트 코드를 바꾸면 preview를 종료하고 `npm run build` → `npm run preview`를 다시 실행합니다.

### 4 테스트 계정과 DB

| 사용자 | 이메일 | 실습용 비밀번호 |
|---|---|---|
| Alice (id 1) | alice@class.test | Classroom!2026 |
| Bob (id 2) | bob@class.test | Classroom!2026 |

- SQLite 파일: `backend-express/data/board.sqlite`. 서버를 처음 실행할 때 자동으로 생성됩니다. 백엔드 폴더 안에서 `npm start`를 실행해야 같은 파일을 사용합니다.
- DB 초기화: 백엔드를 종료한 뒤 `backend-express/data/board.sqlite`를 삭제하고 다시 실행합니다. 기존 리뷰가 모두 지워집니다.
- 데이터 유지: 백엔드를 종료했다가 다시 실행해도 리뷰, 작성자, 내용이 유지되는 것을 확인했습니다 (T15, 보고서 4장).
- 로그인 상태: 토큰은 브라우저 메모리에만 저장합니다. 그래서 새로고침하면 로그아웃되는 것이 정상입니다 (T16).

위 계정은 과제용 테스트 계정입니다. 실제 계정 정보와 서버 비밀 키는 기록하지 않습니다.

## 구현 완료 범위

| 기능 | 완료 여부 | 주요 파일 또는 함수 |
|---|---|---|
| 공개 목록과 상세 | 완료 | `backend-express/src/app.js` (제공 코드), `frontend-react/src/main.jsx` |
| 로그인과 JWT 발급 | 완료 | `backend-express/src/auth.js` `loadConfig()`, `issueToken()` / `frontend-react/src/api.js` `login()` |
| JWT 검증과 내 정보 조회 | 완료 | `backend-express/src/auth.js` `currentUserId()` |
| 글 작성과 작성자 저장 | 완료 | `app.js` POST `/api/posts` (작성자 = 검증된 토큰의 `sub`) |
| 본인 글 수정·삭제 | 완료 | `backend-express/src/auth.js` `assertOwner()` / `api.js` `canEdit()` |
| 토큰 만료와 로그아웃 | 완료 | `api.js` `request()` (401이면 세션 해제), `main.jsx` 로그아웃 |
| 입력 오류와 권한 오류 처리 | 완료 | `app.js` `fields()`, `api.js` 오류 code별 안내, `main.jsx` `run()` (404 처리) |

알려진 문제와 미완성 기능: [없으면 "없음"]

## 테스트 방법과 결과 요약

- 자동 검사 (과제 루트에서 실행, 백엔드 실행 중):
  - `py tools\check_api.py --mode final` (macOS/Linux: `python3 tools/check_api.py --mode final`)
  - 만료 검사: 백엔드를 `TOKEN_TTL=3`으로 재시작한 뒤 `py tools\check_api.py --mode final --expiry`
- 수동 검사: 4173번 빌드 화면과 개발자 도구 Network, PowerShell 직접 요청으로 `T01~T17`을 수행했습니다. 결과와 캡처는 보고서 4장과 `docs/evidence/`에 있습니다.
- Alice/Bob 권한 구분: Bob 토큰으로 Alice 글을 수정·삭제하면 403 FORBIDDEN이 반환되고, 다시 조회해도 원문이 그대로입니다 (T07, T08).
- 응답 헤더·본문: 등록 시 201과 `Location: /api/posts/{id}`, 보호 API 401에 `WWW-Authenticate: Bearer`, 삭제 시 204와 빈 본문을 확인했습니다.
- 토큰 없음, 변조, 만료: 각각 401 `TOKEN_REQUIRED`, `INVALID_TOKEN`, `TOKEN_EXPIRED`가 반환되고 데이터는 바뀌지 않았습니다 (T04, T09, T10).

## 핵심 구현 설명

1. **로그인과 발급**: `app.js`가 제공된 `verifyCredentials()`로 계정을 확인합니다. 확인되면 `auth.js`의 `issueToken()`이 HS256으로 서명하고 `sub`(문자열 사용자 ID), `iss`, `aud`, `exp`를 담은 JWT를 발급합니다.
2. **토큰 보관과 전송**: `api.js`의 `login()`이 받은 토큰을 메모리 변수 `session`에 저장합니다. `authorizationHeaders()`는 토큰이 있을 때만 `Authorization: Bearer <JWT>` 헤더를 붙입니다.
3. **서버 검증**: `auth.js`의 `currentUserId()`가 Bearer 헤더를 꺼낸 뒤 `jwt.verify()`로 알고리즘(HS256 고정), 서명, 만료, `iss`, `aud`를 검증합니다. `exp`와 `sub` 형식, 실제 계정이 있는지도 확인한 다음 검증된 사용자 ID만 돌려줍니다.
4. **작성자 권한**: 수정·삭제할 때 `auth.js`의 `assertOwner()`가 검증된 사용자 ID와 DB에 저장된 글의 `authorId`를 비교합니다. 다르면 403을 반환합니다. 처리 순서는 인증 → 글 존재 → 권한 → 입력 검증 → DB 변경입니다.

자세한 코드 설명은 보고서 3장에 있습니다.

## AI 활용 요약과 참고 자료

- AI 사용 여부: 사용
- 도구와 사용 목적: Claude (Anthropic). 과제 요구사항 정리, 실행 환경 문제 해결, `auth.js`·`api.js`·`main.jsx` 구현 코드 초안 작성, 테스트 명령 작성
- 반영 위치와 검증: `backend-express/src/auth.js` (`loadConfig`, `issueToken`, `currentUserId`, `assertOwner`), `frontend-react/src/api.js`, `frontend-react/src/main.jsx`. 반영한 코드는 직접 실행해 자동 검사와 `T01~T17`로 확인했습니다.
- 상세 활용 기록: 보고서 5장
- 참고 자료: 수업 제공 시작 코드와 과제 문서 (`docs/02_API명세.md` 등), jsonwebtoken 공식 문서 (https://github.com/auth0/node-jsonwebtoken)

## 제출 확인

- [ ] README의 안내 문구를 실제 내용으로 바꿨다.
- [ ] 새 폴더에 clone해서 README만 보고 설치·환경설정·빌드·로컬 실행을 해봤다.
- [ ] 4173번 빌드 화면에서 API 연결과 필수 기능 전체를 확인했다.
- [ ] GitHub에서 보고서와 증거 링크가 열린다.
- [ ] 교수자가 저장소를 열람·복제할 수 있다.
- [ ] 비밀 키, 실제 토큰, DB, node_modules를 커밋하지 않았다.
- [ ] 최종 push 후 저장소 URL과 제출 기준 커밋 SHA를 LMS에 제출했다.
