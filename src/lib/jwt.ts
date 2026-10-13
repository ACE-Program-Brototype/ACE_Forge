import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "ace-forge-super-secret-development-jwt-key-2026-very-secure"
);

export interface AdminTokenPayload {
  sub: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "ADMIN";
  userType: "ADMIN";
}

export interface StudentTokenPayload {
  sub: string;
  email: string;
  name: string;
  mustChangePassword: boolean;
  userType: "STUDENT";
}

export type AuthPayload = AdminTokenPayload | StudentTokenPayload;

export async function signAuthToken(payload: AuthPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN || "7d")
    .sign(JWT_SECRET);
}

export async function verifyAuthToken<T extends AuthPayload>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as T;
  } catch {
    return null;
  }
}
