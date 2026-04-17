import bcrypt from "bcryptjs"
import { SignJWT, jwtVerify } from "jose"
import type { JWTPayload } from "jose"

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const JWT_SECRET =
  process.env.JWT_SECRET ?? "contaflow_jwt_secret_change_in_production_2024"

/** Convert the secret string into the Uint8Array that `jose` expects. */
function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(JWT_SECRET)
}

// Access-token lifetime: 15 minutes
const ACCESS_TOKEN_EXPIRY = "15m"
// Refresh-token lifetime: 7 days
const REFRESH_TOKEN_EXPIRY = "7d"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TokenPayload {
  userId: string
  email: string
  companyId: string
  roleId: string | null
  role: string
}

// ---------------------------------------------------------------------------
// Password helpers
// ---------------------------------------------------------------------------

/** Hash a plain-text password using bcryptjs (10 salt rounds). */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

/** Compare a plain-text password against a stored bcrypt hash. */
export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------

/**
 * Generate a short-lived access token.
 *
 * The token includes: userId, email, companyId, roleId, role.
 */
export async function generateAccessToken(
  payload: TokenPayload,
): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
    companyId: payload.companyId,
    roleId: payload.roleId,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(getSecretKey())
}

/**
 * Generate a long-lived refresh token.
 *
 * Only includes userId – the server will re-fetch full session data
 * when the refresh token is exchanged.
 */
export async function generateRefreshToken(payload: {
  userId: string
}): Promise<string> {
  return new SignJWT({ userId: payload.userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(getSecretKey())
}

/**
 * Verify and decode a JWT token.
 *
 * Returns the payload if the token is valid, or `null` if expired / malformed.
 */
export async function verifyToken(
  token: string,
): Promise<JWTPayload & TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    return payload as JWTPayload & TokenPayload
  } catch {
    return null
  }
}
