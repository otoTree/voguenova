import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import { createUser, getUserSystemSnapshot } from "@/lib/user-system"

export async function GET() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json(
      { success: false, error: "未登录。" },
      { status: 401 }
    )
  }

  if (!["admin", "operator"].includes(currentUser.role)) {
    return NextResponse.json(
      { success: false, error: "没有访问权限。" },
      { status: 403 }
    )
  }

  const snapshot = await getUserSystemSnapshot()

  return NextResponse.json({
    success: true,
    source: snapshot.source,
    users: snapshot.users,
    requests: snapshot.requests,
    roleSummaries: snapshot.roleSummaries,
    totals: snapshot.totals,
  })
}

export async function POST(req: Request) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json(
      { success: false, error: "未登录。" },
      { status: 401 }
    )
  }

  if (currentUser.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "只有 admin 可以创建平台账号。" },
      { status: 403 }
    )
  }

  try {
    const body = await req.json()
    const user = await createUser({
      name: body.name,
      email: body.email,
      role: body.role,
      company: body.company,
      status: body.status,
      password: body.password,
    })

    return NextResponse.json({ success: true, user }, { status: 201 })
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "创建用户失败。"
    const status =
      errorMessage.includes("已存在") || errorMessage.includes("unique")
        ? 409
        : 400

    return NextResponse.json({ success: false, error: errorMessage }, { status })
  }
}
