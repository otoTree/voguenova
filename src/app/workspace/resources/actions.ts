"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { requireUser } from "@/lib/auth"
import {
  createResourceInstruction,
  createResourceModel,
  createResourceProduct,
  deleteResourceInstruction,
  deleteResourceModel,
  deleteResourceProduct,
  setGeneratedImageCategory,
  setResourceModelAvatar,
  updateResourceInstruction,
  updateResourceModel,
  updateResourceProduct,
} from "@/lib/resource-system"
import { uploadFileToS3 } from "@/lib/s3"

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "操作失败，请稍后重试。"
}

function buildResourceRedirect(
  section: string,
  tone: "success" | "error",
  message: string
) {
  const params = new URLSearchParams({
    section,
    tone,
    message,
  })
  return `/workspace/resources?${params.toString()}#${section}`
}

export async function createModelAction(formData: FormData) {
  const actor = await requireUser()
  let redirectUrl = buildResourceRedirect("models", "success", "模特资源已创建。")

  try {
    let avatarUrl = String(formData.get("avatarUrl") ?? "")
    const file = formData.get("avatarFile") as File | null
    if (file && file.size > 0) {
      avatarUrl = await uploadFileToS3(file, "avatars")
    }

    await createResourceModel(actor, {
      name: String(formData.get("name") ?? ""),
      style: String(formData.get("style") ?? ""),
      backstory: String(formData.get("backstory") ?? ""),
      avatarUrl: avatarUrl,
      assignedOperatorId: String(formData.get("assignedOperatorId") ?? ""),
    })
    revalidatePath("/workspace/resources")
  } catch (error: unknown) {
    redirectUrl = buildResourceRedirect("models", "error", getErrorMessage(error))
  }

  redirect(redirectUrl)
}

export async function updateModelAction(formData: FormData) {
  const actor = await requireUser()
  let redirectUrl = buildResourceRedirect("models", "success", "模特资源已更新。")

  try {
    let avatarUrl = String(formData.get("avatarUrl") ?? "")
    const file = formData.get("avatarFile") as File | null
    if (file && file.size > 0) {
      avatarUrl = await uploadFileToS3(file, "avatars")
    }

    await updateResourceModel(actor, {
      id: String(formData.get("id") ?? ""),
      name: String(formData.get("name") ?? ""),
      style: String(formData.get("style") ?? ""),
      backstory: String(formData.get("backstory") ?? ""),
      avatarUrl: avatarUrl,
      assignedOperatorId: String(formData.get("assignedOperatorId") ?? ""),
    })
    revalidatePath("/workspace/resources")
  } catch (error: unknown) {
    redirectUrl = buildResourceRedirect("models", "error", getErrorMessage(error))
  }

  redirect(redirectUrl)
}

export async function deleteModelAction(formData: FormData) {
  const actor = await requireUser()
  let redirectUrl = buildResourceRedirect("models", "success", "模特资源已删除。")

  try {
    await deleteResourceModel(actor, String(formData.get("id") ?? ""))
    revalidatePath("/workspace/resources")
  } catch (error: unknown) {
    redirectUrl = buildResourceRedirect("models", "error", getErrorMessage(error))
  }

  redirect(redirectUrl)
}

export async function setModelAvatarAction(formData: FormData) {
  const actor = await requireUser()
  let redirectUrl = buildResourceRedirect("studio", "success", "已设为模特封面。")

  try {
    await setResourceModelAvatar(actor, {
      modelId: String(formData.get("modelId") ?? ""),
      avatarUrl: String(formData.get("imageUrl") ?? ""),
    })
    revalidatePath("/workspace/resources")
  } catch (error: unknown) {
    redirectUrl = buildResourceRedirect("studio", "error", getErrorMessage(error))
  }

  redirect(redirectUrl)
}

export async function setGeneratedImageCategoryAction(formData: FormData) {
  const actor = await requireUser()
  let redirectUrl = buildResourceRedirect("models", "success", "作品分类已更新。")

  try {
    await setGeneratedImageCategory(actor, {
      imageId: String(formData.get("imageId") ?? ""),
      category: String(formData.get("category") ?? ""),
    })
    revalidatePath("/workspace/resources")
  } catch (error: unknown) {
    redirectUrl = buildResourceRedirect("models", "error", getErrorMessage(error))
  }

  redirect(redirectUrl)
}

export async function createProductAction(formData: FormData) {
  const actor = await requireUser()
  let redirectUrl = buildResourceRedirect("products", "success", "商品资源已创建。")

  try {
    let imageUrl = String(formData.get("imageUrl") ?? "")
    const file = formData.get("imageFile") as File | null
    if (file && file.size > 0) {
      imageUrl = await uploadFileToS3(file, "products")
    }

    await createResourceProduct(actor, {
      name: String(formData.get("name") ?? ""),
      brand: String(formData.get("brand") ?? ""),
      sku: String(formData.get("sku") ?? ""),
      imageUrl: imageUrl,
      description: String(formData.get("description") ?? ""),
      ownerUserId: String(formData.get("ownerUserId") ?? ""),
    })
    revalidatePath("/workspace/resources")
  } catch (error: unknown) {
    redirectUrl = buildResourceRedirect("products", "error", getErrorMessage(error))
  }

  redirect(redirectUrl)
}

export async function updateProductAction(formData: FormData) {
  const actor = await requireUser()
  let redirectUrl = buildResourceRedirect("products", "success", "商品资源已更新。")

  try {
    let imageUrl = String(formData.get("imageUrl") ?? "")
    const file = formData.get("imageFile") as File | null
    if (file && file.size > 0) {
      imageUrl = await uploadFileToS3(file, "products")
    }

    await updateResourceProduct(actor, {
      id: String(formData.get("id") ?? ""),
      name: String(formData.get("name") ?? ""),
      brand: String(formData.get("brand") ?? ""),
      sku: String(formData.get("sku") ?? ""),
      imageUrl: imageUrl,
      description: String(formData.get("description") ?? ""),
      ownerUserId: String(formData.get("ownerUserId") ?? ""),
    })
    revalidatePath("/workspace/resources")
  } catch (error: unknown) {
    redirectUrl = buildResourceRedirect("products", "error", getErrorMessage(error))
  }

  redirect(redirectUrl)
}

export async function deleteProductAction(formData: FormData) {
  const actor = await requireUser()
  let redirectUrl = buildResourceRedirect("products", "success", "商品资源已删除。")

  try {
    await deleteResourceProduct(actor, String(formData.get("id") ?? ""))
    revalidatePath("/workspace/resources")
  } catch (error: unknown) {
    redirectUrl = buildResourceRedirect("products", "error", getErrorMessage(error))
  }

  redirect(redirectUrl)
}

export async function createInstructionAction(formData: FormData) {
  const actor = await requireUser()
  let redirectUrl = buildResourceRedirect(
    "instructions",
    "success",
    "指令资源已创建。"
  )

  try {
    await createResourceInstruction(actor, {
      title: String(formData.get("title") ?? ""),
      category: String(formData.get("category") ?? ""),
      content: String(formData.get("content") ?? ""),
    })
    revalidatePath("/workspace/resources")
  } catch (error: unknown) {
    redirectUrl = buildResourceRedirect(
      "instructions",
      "error",
      getErrorMessage(error)
    )
  }

  redirect(redirectUrl)
}

export async function updateInstructionAction(formData: FormData) {
  const actor = await requireUser()
  let redirectUrl = buildResourceRedirect(
    "instructions",
    "success",
    "指令资源已更新。"
  )

  try {
    await updateResourceInstruction(actor, {
      id: String(formData.get("id") ?? ""),
      title: String(formData.get("title") ?? ""),
      category: String(formData.get("category") ?? ""),
      content: String(formData.get("content") ?? ""),
    })
    revalidatePath("/workspace/resources")
  } catch (error: unknown) {
    redirectUrl = buildResourceRedirect(
      "instructions",
      "error",
      getErrorMessage(error)
    )
  }

  redirect(redirectUrl)
}

export async function deleteInstructionAction(formData: FormData) {
  const actor = await requireUser()
  let redirectUrl = buildResourceRedirect(
    "instructions",
    "success",
    "指令资源已删除。"
  )

  try {
    await deleteResourceInstruction(actor, String(formData.get("id") ?? ""))
    revalidatePath("/workspace/resources")
  } catch (error: unknown) {
    redirectUrl = buildResourceRedirect(
      "instructions",
      "error",
      getErrorMessage(error)
    )
  }

  redirect(redirectUrl)
}
