import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import { generateTextWithCloubic } from "@/lib/ai-provider"

export const dynamic = "force-dynamic"

interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") {
    return false
  }

  const message = value as Record<string, unknown>

  return (
    ["system", "user", "assistant"].includes(String(message.role ?? "")) &&
    typeof message.content === "string"
  )
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ success: false, error: "未登录。" }, { status: 401 })
  }

  try {
    const payload = await request.json()
    const messages = Array.isArray(payload.messages)
      ? payload.messages.filter(isChatMessage)
      : []
    const model = String(payload.model ?? "gpt-4o").trim() || "gpt-4o"

    if (!messages.length) {
      return NextResponse.json(
        { success: false, error: "请提供有效的聊天消息。" },
        { status: 400 }
      )
    }

    const text = await generateTextWithCloubic(messages, model)

    return NextResponse.json({
      success: true,
      text: String(text ?? ""),
      model,
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "LLM 响应失败，请稍后重试。"

    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
