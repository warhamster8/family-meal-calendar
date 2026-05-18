import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "family-meal-calendar-super-secret-key-change-me";
const key = new TextEncoder().encode(JWT_SECRET);

export interface SessionPayload {
    userId: string;
    email: string;
    familyId?: string | null;
}

/**
 * Sign a secure JWT session token expiring in 7 days
 */
export async function signSession(payload: SessionPayload): Promise<string> {
    return await new SignJWT({ ...payload })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(key);
}

/**
 * Verify a JWT session token and return its payload
 */
export async function verifySession(token: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, key, {
            algorithms: ["HS256"],
        });
        return payload as unknown as SessionPayload;
    } catch (error) {
        return null;
    }
}

/**
 * Retrieve the current session payload from cookies
 */
export async function getSessionUser(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return null;
    return await verifySession(token);
}
