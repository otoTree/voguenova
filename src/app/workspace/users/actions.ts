"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { requireRole } from "@/lib/auth"
import { createUser, deleteUser, updateUser } from "@/lib/user-system"

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "操作失败，请稍后重试。"
}

function buildUsersRedirect(tone: "success" | "error", message: string) {
  const params = new URLSearchParams({
    tone,
    message,
  })

  return `/workspace/users?${params.toString()}`
}

export async function createManagedUserAction(formData: FormData) {
  await requireRole(["admin"])

  let redirectUrl = buildUsersRedirect("success", "账号已创建。")

  try {
    await createUser({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      role: String(formData.get("role") ?? "user") as "operator" | "user",
      company: String(formData.get("company") ?? ""),
      status: String(formData.get("status") ?? "invited") as
        | "active"
        | "invited"
        | "disabled",
      password: String(formData.get("password") ?? ""),
    })

    revalidatePath("/workspace")
    revalidatePath("/workspace/users")
  } catch (error: unknown) {
    redirectUrl = buildUsersRedirect("error", getErrorMessage(error))
  }

  redirect(redirectUrl)
}

export async function updateManagedUserAction(formData: FormData) {
  await requireRole(["admin"])

  let redirectUrl = buildUsersRedirect("success", "账号已更新。")

  try {
    await updateUser({
      id: String(formData.get("id") ?? ""),
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      role: String(formData.get("role") ?? "user") as "operator" | "user",
      company: String(formData.get("company") ?? ""),
      status: String(formData.get("status") ?? "invited") as
        | "active"
        | "invited"
        | "disabled",
      password: String(formData.get("password") ?? ""),
    })

    revalidatePath("/workspace")
    revalidatePath("/workspace/users")
  } catch (error: unknown) {
    redirectUrl = buildUsersRedirect("error", getErrorMessage(error))
  }

  redirect(redirectUrl)
}

export async function deleteManagedUserAction(formData: FormData) {
  await requireRole(["admin"])

  let redirectUrl = buildUsersRedirect("success", "账号已删除。")

  try {
    await deleteUser(String(formData.get("id") ?? ""))

    revalidatePath("/workspace")
    revalidatePath("/workspace/users")
  } catch (error: unknown) {
    redirectUrl = buildUsersRedirect("error", getErrorMessage(error))
  }

  redirect(redirectUrl)
}
