import { createHmac, timingSafeEqual } from "node:crypto"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { findUserById, type AppUser, type UserRole } from "@/lib/user-system"

const SESSION_COOKIE_NAME = "voguenova_session"
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000

interface SessionPayload {
  userId: string
  role: UserRole
  exp: number
}

function getSessionSecret() {
  return (
    process.env.SESSION_SECRET ||
    process.env.AUTH_SECRET ||
    "voguenova-local-session-secret"
  )
}

function signValue(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url")
}

function encodeSession(payload: SessionPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signature = signValue(encodedPayload)
  return `${encodedPayload}.${signature}`
}

function decodeSession(token: string) {
  const [encodedPayload, signature] = token.split(".")

  if (!encodedPayload || !signature) {
    return null
  }

  const expectedSignature = signValue(encodedPayload)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as SessionPayload

    if (!payload.userId || !payload.role || !payload.exp) {
      return null
    }

    if (payload.exp <= Date.now()) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

export async function createSession(user: Pick<AppUser, "id" | "role">) {
  const expires = new Date(Date.now() + SESSION_DURATION_MS)
  const cookieStore = await cookies()

  cookieStore.set(SESSION_COOKIE_NAME, encodeSession({
    userId: user.id,
    role: user.role,
    exp: expires.getTime(),
  }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires,
    path: "/",
  })
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

export async function getSessionPayload() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value

  if (!token) {
    return null
  }

  return decodeSession(token)
}

export async function getCurrentUser() {
  const session = await getSessionPayload()

  if (!session) {
    return null
  }

  return findUserById(session.userId)
}

export async function requireUser() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/")
  }

  return user
}

export async function requireRole(roles: UserRole[]) {
  const user = await requireUser()

  if (!roles.includes(user.role)) {
    redirect("/workspace")
  }

  return user
}
