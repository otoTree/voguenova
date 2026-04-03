import { NextResponse } from "next/server"

import {
  generateVideoWithCloubic,
  getVideoStatusWithCloubic,
} from "@/lib/ai-provider"
import { getCurrentUser } from "@/lib/auth"
import {
  createVideoGenerationRecord,
  getVideoProject,
  updateVideoGenerationRecord,
} from "@/lib/resource-system"
import { resolvePublicAssetUrl, uploadFileToS3 } from "@/lib/s3"

export const dynamic = "force-dynamic"

function normalizeVideoStatus(status: string) {
  const normalized = status.toLowerCase()

  if (["succeeded", "completed", "success"].includes(normalized)) {
    return "completed"
  }

  if (["failed", "error", "cancelled"].includes(normalized)) {
    return "failed"
  }

  return "processing"
}

function resolveAbsoluteUrl(input: string, request: Request) {
  const normalized = input.trim()

  if (!normalized) {
    return ""
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized
  }

  return new URL(normalized, request.url).toString()
}

export async function GET(request: Request) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ success: false, error: "未登录。" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const projectId = String(searchParams.get("projectId") ?? "").trim()
  const sceneId = String(searchParams.get("sceneId") ?? "").trim()
  const taskId = String(searchParams.get("taskId") ?? "").trim()

  if (!taskId) {
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "缺少 projectId。" },
        { status: 400 }
      )
    }

    const project = await getVideoProject(currentUser, projectId)

    return NextResponse.json({
      success: true,
      tasks: project.tasks,
    })
  }

  if (!projectId || !sceneId) {
    return NextResponse.json(
      { success: false, error: "缺少 projectId 或 sceneId。" },
      { status: 400 }
    )
  }

  try {
    const result = await getVideoStatusWithCloubic(taskId)
    const normalizedStatus = normalizeVideoStatus(String(result.status ?? ""))
    await updateVideoGenerationRecord(currentUser, {
      projectId,
      sceneId,
      taskId,
      status: normalizedStatus,
      progress: typeof result.progress === "number" ? result.progress : null,
      videoUrl: String(result.videoUrl ?? "").trim() || null,
      errorMessage: String(result.errorMessage ?? "").trim() || null,
    })

    return NextResponse.json({
      success: true,
      taskId,
      status: result.status,
      progress: result.progress ?? null,
      videoUrl: result.videoUrl ?? "",
      errorMessage: result.errorMessage ?? "",
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "视频状态查询失败，请稍后重试。"
    const project = await getVideoProject(currentUser, projectId)
    const savedTask = project.tasks.find(
      (item) => item.sceneId === sceneId && item.taskId === taskId
    )

    return savedTask
      ? NextResponse.json({
          success: true,
          taskId,
          status: savedTask.status,
          progress: savedTask.progress,
          videoUrl: savedTask.videoUrl ?? "",
          errorMessage: savedTask.errorMessage || message,
          stale: true,
        })
      : NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ success: false, error: "未登录。" }, { status: 401 })
  }

  if (!["admin", "operator"].includes(currentUser.role)) {
    return NextResponse.json(
      { success: false, error: "只有运营和 Admin 可以生成视频。" },
      { status: 403 }
    )
  }

  try {
    const formData = await request.formData()
    const prompt = String(formData.get("prompt") ?? "").trim()
    const duration = Number(formData.get("duration") ?? 5)
    const projectId = String(formData.get("projectId") ?? "").trim()
    const aspectRatio = String(formData.get("aspectRatio") ?? "9:16").trim() || "9:16"
    const soundMode = String(formData.get("soundMode") ?? "off").trim() || "off"
    const sceneId = String(formData.get("sceneId") ?? "").trim()
    const referenceUrls = JSON.parse(
      String(formData.get("referenceUrls") ?? "[]")
    ) as string[]
    const uploadedReferenceFiles = formData
      .getAll("referenceFiles")
      .filter((value): value is File => value instanceof File && value.size > 0)

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: "请输入视频生成提示词。" },
        { status: 400 }
      )
    }

    if (!projectId || !sceneId) {
      return NextResponse.json(
        { success: false, error: "缺少 projectId 或 sceneId。" },
        { status: 400 }
      )
    }

    const uploadedReferenceUrls = await Promise.all(
      uploadedReferenceFiles.map((file) => uploadFileToS3(file, "references/videos"))
    )
    const resolvedReferenceUrls = [
      ...referenceUrls.map((item) =>
        resolveAbsoluteUrl(resolvePublicAssetUrl(item), request)
      ),
      ...uploadedReferenceUrls.map((item) => resolvePublicAssetUrl(item)),
    ].filter(Boolean)

    if (!resolvedReferenceUrls.length) {
      return NextResponse.json(
        { success: false, error: "视频生成至少需要一张参考图。" },
        { status: 400 }
      )
    }

    const taskId = await generateVideoWithCloubic(
      prompt,
      resolvedReferenceUrls,
      Math.max(1, Math.min(12, Math.round(duration || 5))),
      soundMode,
      aspectRatio
    )

    await createVideoGenerationRecord(currentUser, {
      projectId,
      sceneId,
      taskId,
      prompt,
      duration: Math.max(1, Math.min(12, Math.round(duration || 5))),
      status: "processing",
    })

    return NextResponse.json({
      success: true,
      projectId,
      sceneId,
      taskId,
      prompt,
      duration,
      aspectRatio,
      soundMode,
      referenceUrls: resolvedReferenceUrls,
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "视频生成失败，请稍后重试。"

    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
