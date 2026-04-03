"use server"

import { redirect } from "next/navigation"

import { createSession, destroySession } from "@/lib/auth"
import { authenticateUser, registerUser } from "@/lib/user-system"

export interface AuthActionState {
  error?: string
}

export async function login(
  _: AuthActionState | undefined,
  formData: FormData
): Promise<AuthActionState | undefined> {
  const email = String(formData.get("email") ?? "")
  const password = String(formData.get("password") ?? "")

  try {
    const user = await authenticateUser({ email, password })
    await createSession(user)
  } catch (error: unknown) {
    return {
      error: error instanceof Error ? error.message : "登录失败。",
    }
  }

  redirect("/workspace")
}

export async function signup(
  _: AuthActionState | undefined,
  formData: FormData
): Promise<AuthActionState | undefined> {
  const name = String(formData.get("name") ?? "")
  const email = String(formData.get("email") ?? "")
  const company = String(formData.get("company") ?? "")
  const password = String(formData.get("password") ?? "")

  try {
    const user = await registerUser({
      name,
      email,
      company,
      password,
    })
    await createSession(user)
  } catch (error: unknown) {
    return {
      error: error instanceof Error ? error.message : "注册失败。",
    }
  }

  redirect("/workspace")
}

export async function logout() {
  await destroySession()
  redirect("/")
}
