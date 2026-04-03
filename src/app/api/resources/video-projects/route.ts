import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import {
  copyVideoProject,
  deleteVideoProject,
  getVideoProject,
  listVideoProjects,
  renameVideoProject,
  type CopyVideoProjectInput,
  saveVideoProject,
  type RenameVideoProjectInput,
  type SaveVideoProjectInput,
} from "@/lib/resource-system"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ success: false, error: "未登录。" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const projectId = String(searchParams.get("projectId") ?? "").trim()

  try {
    if (projectId) {
      const project = await getVideoProject(currentUser, projectId)

      return NextResponse.json({
        success: true,
        project,
      })
    }

    const projects = await listVideoProjects(currentUser)

    return NextResponse.json({
      success: true,
      projects,
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "视频项目读取失败，请稍后重试。"

    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ success: false, error: "未登录。" }, { status: 401 })
  }

  if (!["admin", "operator"].includes(currentUser.role)) {
    return NextResponse.json(
      { success: false, error: "只有运营和 Admin 可以管理视频项目。" },
      { status: 403 }
    )
  }

  try {
    const payload = (await request.json()) as SaveVideoProjectInput
    const project = await saveVideoProject(currentUser, payload)

    return NextResponse.json({
      success: true,
      project,
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "视频项目保存失败，请稍后重试。"

    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ success: false, error: "未登录。" }, { status: 401 })
  }

  if (!["admin", "operator"].includes(currentUser.role)) {
    return NextResponse.json(
      { success: false, error: "只有运营和 Admin 可以管理视频项目。" },
      { status: 403 }
    )
  }

  try {
    const payload = (await request.json()) as RenameVideoProjectInput
    const project = await renameVideoProject(currentUser, payload)

    return NextResponse.json({
      success: true,
      project,
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "视频项目重命名失败，请稍后重试。"

    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ success: false, error: "未登录。" }, { status: 401 })
  }

  if (!["admin", "operator"].includes(currentUser.role)) {
    return NextResponse.json(
      { success: false, error: "只有运营和 Admin 可以管理视频项目。" },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const projectId = String(searchParams.get("projectId") ?? "").trim()

  try {
    await deleteVideoProject(currentUser, projectId)

    return NextResponse.json({
      success: true,
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "视频项目删除失败，请稍后重试。"

    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ success: false, error: "未登录。" }, { status: 401 })
  }

  if (!["admin", "operator"].includes(currentUser.role)) {
    return NextResponse.json(
      { success: false, error: "只有运营和 Admin 可以管理视频项目。" },
      { status: 403 }
    )
  }

  try {
    const payload = (await request.json()) as CopyVideoProjectInput
    const project = await copyVideoProject(currentUser, payload)

    return NextResponse.json({
      success: true,
      project,
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "视频项目复制失败，请稍后重试。"

    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
