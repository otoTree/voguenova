import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

import { getCurrentUser } from "@/lib/auth"
import { generateImageWithCloubic } from "@/lib/ai-provider"
import { createGeneratedImages } from "@/lib/resource-system"
import { uploadFileToS3, uploadRemoteFileToS3 } from "@/lib/s3"

export const dynamic = "force-dynamic"

async function fileToDataUrl(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer())
  return `data:${file.type || "image/png"};base64,${buffer.toString("base64")}`
}

async function urlToDataUrl(input: string, request: Request) {
  const normalized = input.trim()

  if (!normalized) {
    return ""
  }

  if (normalized.startsWith("data:")) {
    return normalized
  }

  const requestUrl = new URL(request.url)
  const resolvedUrl = normalized.startsWith("http")
    ? normalized
    : new URL(normalized, requestUrl.origin).toString()

  const response = await fetch(resolvedUrl, {
    headers: request.headers.get("cookie")
      ? {
          cookie: request.headers.get("cookie") || "",
        }
      : undefined,
  })

  if (!response.ok) {
    throw new Error("参考图读取失败。")
  }

  const contentType = response.headers.get("content-type") || "image/png"
  const buffer = Buffer.from(await response.arrayBuffer())

  return `data:${contentType};base64,${buffer.toString("base64")}`
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ success: false, error: "未登录。" }, { status: 401 })
  }

  if (!["admin", "operator"].includes(currentUser.role)) {
    return NextResponse.json(
      { success: false, error: "只有运营和 Admin 可以生成优化图。" },
      { status: 403 }
    )
  }

  try {
    const formData = await request.formData()
    const prompt = String(formData.get("prompt") ?? "").trim()
    const mode =
      formData.get("mode") === "image-to-image"
        ? "image-to-image"
        : "text-to-image"
    const modelId = String(formData.get("modelId") ?? "").trim() || null
    const productId = String(formData.get("productId") ?? "").trim() || null
    const referenceUrls = JSON.parse(
      String(formData.get("referenceUrls") ?? "[]")
    ) as string[]
    const variants = JSON.parse(
      String(formData.get("variants") ?? "[]")
    ) as Array<{ label?: string; prompt?: string }>
    const uploadedReferenceFiles = formData
      .getAll("referenceFiles")
      .filter((value): value is File => value instanceof File && value.size > 0)

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: "请输入用于生成的提示词。" },
        { status: 400 }
      )
    }

    const uploadedReferenceUrls = await Promise.all(
      uploadedReferenceFiles.map((file) =>
        uploadFileToS3(file, "references/generated")
      )
    )
    const uploadedReferenceInputs = await Promise.all(
      uploadedReferenceFiles.map((file) => fileToDataUrl(file))
    )

    const resolvedReferenceUrls = [...referenceUrls, ...uploadedReferenceUrls].filter(
      Boolean
    )
    const resolvedReferenceInputs = [
      ...(await Promise.all(referenceUrls.map((item) => urlToDataUrl(item, request)))),
      ...uploadedReferenceInputs,
    ].filter(Boolean)

    if (mode === "image-to-image" && resolvedReferenceInputs.length === 0) {
      return NextResponse.json(
        { success: false, error: "图生图至少需要一张参考图。" },
        { status: 400 }
      )
    }

    const resolvedVariants =
      variants.length > 0
        ? variants.filter((item) => String(item.prompt ?? "").trim())
        : [{ label: "主方案", prompt }]

    const results: Array<{
      label: string
      prompt: string
      mode: string
      imageUrl: string
      sourceImageUrl: string
    }> = []
    const errors: string[] = []

    for (const variant of resolvedVariants) {
      const variantLabel = String(variant.label ?? "方案").trim() || "方案"
      const variantPrompt = String(variant.prompt ?? "").trim()

      try {
        const generatedImageUrl = await generateImageWithCloubic(
          variantPrompt,
          resolvedReferenceInputs.length ? resolvedReferenceInputs : undefined,
          1
        )

        const storedImageUrl = await uploadRemoteFileToS3(
          generatedImageUrl,
          `generated/${mode}`
        )

        results.push({
          label: variantLabel,
          prompt: variantPrompt,
          mode,
          imageUrl: storedImageUrl,
          sourceImageUrl: generatedImageUrl,
        })
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "生成失败，请稍后重试。"
        errors.push(`${variantLabel}：${message}`)
      }
    }

    if (!results.length) {
      return NextResponse.json(
        {
          success: false,
          error: errors[0] || "所有方案均生成失败。",
          details: errors,
        },
        { status: 500 }
      )
    }

    await createGeneratedImages(
      currentUser,
      results.map((result) => ({
        modelId,
        productId,
        imageUrl: result.imageUrl,
        prompt: result.prompt,
        sourceType: "generated",
        generationMode: mode,
        variantLabel: result.label,
        referenceImageUrls: resolvedReferenceUrls,
      }))
    )

    revalidatePath("/workspace/resources")

    return NextResponse.json({
      success: true,
      mode,
      prompt,
      imageUrl: results[0]?.imageUrl ?? "",
      sourceImageUrl: results[0]?.sourceImageUrl ?? "",
      referenceImageUrls: resolvedReferenceUrls,
      results,
      warning: errors.length
        ? `部分方案生成失败，已保留成功结果：${errors.join("；")}`
        : "",
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "生成失败，请稍后重试。"

    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
