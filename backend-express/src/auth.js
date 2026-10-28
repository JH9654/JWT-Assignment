import { readFileSync } from "node:fs";
import jwt from "jsonwebtoken";
import { ApiError } from "./errors.js";
import { findPublic } from "./users.js";

// ───────────────────────────────────────────
// [설정] 서버가 켜질 때 .env 값을 읽고 검사한다
// ───────────────────────────────────────────

// .env.example에 적힌 "예시 키"를 읽어온다 (이 값을 실제 키로 쓰면 안 되므로 비교용)
function readExampleSecret() {
  try {
    const text = readFileSync(new URL("../.env.example", import.meta.url), "utf8");
    const line = text.split(/\r?\n/).find((l) => l.startsWith("JWT_SECRET="));
    return line ? line.slice("JWT_SECRET=".length).trim() : null;
  } catch {
    return null; // 예시 파일이 없으면 비교만 건너뛴다
  }
}

function loadConfig() {
  const secretHex = (process.env.JWT_SECRET ?? "").trim();

  // 1) 빈 값 거부
  if (!secretHex) {
    throw new Error("JWT_SECRET이 비어 있습니다. backend-express/.env를 확인하세요.");
  }
  // 2) 형식 검사: 정확히 64자리 16진수(0-9, a-f)
  if (!/^[0-9a-fA-F]{64}$/.test(secretHex)) {
    throw new Error("JWT_SECRET은 64자리 16진수여야 합니다.");
  }
  // 3) 예시 키 그대로 쓰는지 검사
  if (secretHex === readExampleSecret()) {
    throw new Error("JWT_SECRET이 예시 키입니다. 새 난수로 바꾸세요.");
  }

  // 유효 시간(초): 기본 90초, 양의 정수만 허용
  const ttl = Number(process.env.TOKEN_TTL ?? 90);
  if (!Number.isInteger(ttl) || ttl <= 0) {
    throw new Error("TOKEN_TTL은 1 이상의 정수(초)여야 합니다.");
  }

  return {
    key: Buffer.from(secretHex, "hex"), // 64자리 16진수 → 32바이트 키로 변환
    issuer: process.env.JWT_ISSUER || "webservice-class",
    audience: process.env.JWT_AUDIENCE || "board-api",
    ttl,
  };
}

// 서버 시작 시 한 번 실행. 설정이 잘못되면 여기서 오류가 나서 서버가 켜지지 않는다.
const config = loadConfig();

// ───────────────────────────────────────────
// [BE-01] 로그인 성공한 사용자에게 JWT 발급
// ───────────────────────────────────────────
export function issueToken(user) {
  return jwt.sign(
    {}, // 추가 정보는 넣지 않는다 (비밀번호·해시 절대 금지)
    config.key,
    {
      algorithm: "HS256",       // 서명 방식 고정
      subject: String(user.id), // sub: 사용자 ID를 "문자열"로
      issuer: config.issuer,    // iss: 발급자
      audience: config.audience,// aud: 사용 대상
      expiresIn: config.ttl,    // exp: 지금부터 ttl초 뒤 만료
    },
  );
}
// ───────────────────────────────────────────
// [BE-02] 요청의 JWT를 검증하고 "검증된 사용자 ID"를 돌려준다
// ───────────────────────────────────────────
export function currentUserId(req) {
  // ① Authorization 헤더에서 "Bearer <토큰>" 꺼내기
  const header = req.get("Authorization") ?? "";
  const match = /^Bearer (\S+)$/.exec(header);
  if (!match) {
    // 헤더가 없거나, "Bearer " 형식이 아니거나, 토큰 자리가 비어 있음
    throw new ApiError(401, "TOKEN_REQUIRED", "로그인이 필요합니다.");
  }
  const token = match[1];

  // ②③④ 라이브러리로 진짜 검증 (decode가 아니라 verify!)
  let payload;
  try {
    payload = jwt.verify(token, config.key, {
      algorithms: ["HS256"],     // HS256만 허용 (다른 알고리즘 위장 차단)
      issuer: config.issuer,     // iss 확인
      audience: config.audience, // aud 확인
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      // 도장은 진짜인데 시간이 지난 경우
      throw new ApiError(401, "TOKEN_EXPIRED", "로그인 시간이 만료되었습니다. 다시 로그인하세요.");
    }
    // 서명 위조, 형식 깨짐, iss/aud 불일치 등
    throw new ApiError(401, "INVALID_TOKEN", "유효하지 않은 토큰입니다.");
  }

  // ④ 필수 클레임 추가 확인 (라이브러리는 exp가 아예 없는 토큰도 통과시키므로 직접 확인)
  if (typeof payload.exp !== "number") {
    throw new ApiError(401, "INVALID_TOKEN", "만료 시각이 없는 토큰입니다.");
  }
  if (typeof payload.sub !== "string" || !/^[1-9]\d*$/.test(payload.sub)) {
    throw new ApiError(401, "INVALID_TOKEN", "토큰의 사용자 정보가 올바르지 않습니다.");
  }

  // ⑤ 실제로 존재하는 계정인지 확인
  const userId = Number(payload.sub);
  if (!findPublic(userId)) {
    throw new ApiError(401, "INVALID_TOKEN", "존재하지 않는 사용자입니다.");
  }

  return userId; // 여기까지 통과한 ID만 다음 처리(/me, 글 등록·수정·삭제)로 넘어간다
}
// ───────────────────────────────────────────
// [BE-03] 현재 사용자가 글 작성자인지 확인
// ───────────────────────────────────────────
export function assertOwner(userId, authorId) {
  // userId: currentUserId()가 토큰을 검증해서 돌려준 ID
  // authorId: DB에 저장되어 있던 글의 작성자 ID
  if (userId !== Number(authorId)) {
    throw new ApiError(403, "FORBIDDEN", "본인이 작성한 글만 수정·삭제할 수 있습니다.");
  }
}
