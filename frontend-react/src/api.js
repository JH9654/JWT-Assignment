// ───────────────────────────────────────────
// 로그인 상태 (브라우저 "메모리"에만 보관)
// localStorage/sessionStorage에 저장하지 않으므로 새로고침하면 사라지는 게 정상
// ───────────────────────────────────────────
let session = { accessToken: "", user: null };
export const getSession = () => session;
export function clearSession() {
  session = { accessToken: "", user: null };
}

// ───────────────────────────────────────────
// [FE-02] 토큰이 있을 때만 Authorization 헤더를 만든다
// (토큰이 없으면 헤더 자체를 안 보냄 → "Bearer undefined" 방지)
// ───────────────────────────────────────────
function authorizationHeaders() {
  return session.accessToken
    ? { Authorization: `Bearer ${session.accessToken}` }
    : {};
}

// ───────────────────────────────────────────
// [FE-03] 서버 오류 code → 사용자에게 보여줄 안내 문구
// ───────────────────────────────────────────
const MESSAGES = {
  INVALID_CREDENTIALS: "이메일 또는 비밀번호가 올바르지 않습니다.",
  TOKEN_REQUIRED: "로그인이 필요합니다. 먼저 로그인하세요.",
  INVALID_TOKEN: "로그인 정보가 유효하지 않습니다. 다시 로그인하세요.",
  TOKEN_EXPIRED: "로그인 시간이 만료되었습니다. 다시 로그인하세요.",
  FORBIDDEN: "본인이 작성한 글만 수정·삭제할 수 있습니다.",
  NOT_FOUND: "해당 게시글을 찾을 수 없습니다.",
};

// ───────────────────────────────────────────
// 모든 API 요청이 거쳐 가는 공통 함수
// ───────────────────────────────────────────
export async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authorizationHeaders(),
      ...options.headers,
    },
  });

  // 204(삭제 성공)는 본문이 없으므로 JSON을 읽지 않는다
  let data = null;
  if (response.status !== 204) {
    try {
      data = await response.json();
    } catch {
      data = null; // JSON이 아닌 응답이 와도 화면이 멈추지 않게
    }
  }

  if (!response.ok) {
    // 401 = 인증 실패 → 메모리의 토큰·사용자 정보를 지운다 (자동 로그아웃)
    // 403은 여기서 지우지 않는다 (로그인은 정상, 권한만 없는 상황)
    if (response.status === 401) clearSession();

    const code = data?.code;
    const message =
      code === "BAD_INPUT"
        ? `입력을 확인하세요. (${data?.message ?? "형식 오류"})`
        : MESSAGES[code] || data?.message || `요청 실패 (HTTP ${response.status})`;

    const error = new Error(message);
    error.status = response.status;
    error.code = code;
    throw error;
  }
  return data;
}

// ───────────────────────────────────────────
// [FE-01] 로그인: 성공하면 토큰과 사용자를 메모리에 저장
// ───────────────────────────────────────────
export async function login(email, password) {
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  // 여기까지 왔다면 200 성공 (실패면 request()가 이미 오류를 던졌음)
  session = { accessToken: data.accessToken, user: data.user };
  return data.user;
}

// ───────────────────────────────────────────
// [FE-04] 수정·삭제 버튼을 보여줄지 판단
// 로그인했고, 글의 작성자 ID가 내 ID와 같을 때만 true
// (화면용일 뿐, 진짜 차단은 서버의 assertOwner가 한다)
// ───────────────────────────────────────────
export function canEdit(post) {
  return Boolean(session.user) && post?.authorId === session.user.id;
}

export const api = {
  list: () => request("/posts"),
  detail: (id) => request(`/posts/${id}`),
  create: (input) =>
    request("/posts", { method: "POST", body: JSON.stringify(input) }),
  update: (id, input) =>
    request(`/posts/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  remove: (id) => request(`/posts/${id}`, { method: "DELETE" }),
  me: () => request("/me"),
};