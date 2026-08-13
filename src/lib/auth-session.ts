import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "ym_session";
export const SESSION_DAYS = 7;

export type SessionPayload = {
  id: string;
  login: string;
  role: "admin" | "user";
};

export function getAuthSecret() {
  const raw =
    process.env.AUTH_SECRET ||
    process.env.DATABASE_URL ||
    "ymarket-digital-seller-auth";
  return new TextEncoder().encode(raw);
}

export async function createSessionToken(user: {
  id: string;
  login: string;
  role: string;
}) {
  return new SignJWT({ login: user.login, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getAuthSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    const id = typeof payload.sub === "string" ? payload.sub : "";
    const login = typeof payload.login === "string" ? payload.login : "";
    const role = payload.role === "admin" ? "admin" : "user";
    if (!id) return null;
    return { id, login, role };
  } catch {
    return null;
  }
}
