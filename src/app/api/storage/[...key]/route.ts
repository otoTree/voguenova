import { GetObjectCommand } from "@aws-sdk/client-s3"
import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth"
import { s3Client, storageBucketName } from "@/lib/s3"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return new NextResponse("未登录。", { status: 401 })
  }

  const { key: segments } = await params
  const key = segments.map((segment) => decodeURIComponent(segment)).join("/")

  if (!key) {
    return new NextResponse("文件路径无效。", { status: 400 })
  }

  try {
    const result = await s3Client.send(
      new GetObjectCommand({
        Bucket: storageBucketName,
        Key: key,
      })
    )

    if (!result.Body) {
      return new NextResponse("文件不存在。", { status: 404 })
    }

    const body = Buffer.from(await result.Body.transformToByteArray())

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": result.ContentType || "application/octet-stream",
        "Cache-Control": "private, max-age=300",
      },
    })
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.name === "NoSuchKey" || error.name === "NotFound")
    ) {
      return new NextResponse("文件不存在。", { status: 404 })
    }

    return new NextResponse("文件读取失败。", { status: 500 })
  }
}
