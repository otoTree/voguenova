import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { v4 as uuidv4 } from "uuid"

const endpoint = process.env.S3_ENDPOINT || undefined
const region = process.env.S3_REGION || "us-east-1"
const accessKeyId = process.env.S3_ACCESS_KEY_ID || ""
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || ""
const bucketName = process.env.S3_BUCKET_NAME || "voguenova"
const publicUrlPrefix = process.env.S3_PUBLIC_URL_PREFIX || ""

export const storageBucketName = bucketName

function assertStorageConfigured() {
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("S3 未配置，无法上传真实文件。")
  }
}

export const s3Client = new S3Client({
  region,
  endpoint,
  forcePathStyle: Boolean(endpoint),
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
})

export async function uploadFileToS3(
  file: File,
  folder: string = "uploads"
): Promise<string> {
  assertStorageConfigured()

  const fileExtension = file.name.split(".").pop() || ""
  const fileName = `${uuidv4()}.${fileExtension}`
  const key = `${folder}/${fileName}`
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  await uploadBufferToS3({
    key,
    body: buffer,
    contentType: file.type,
  })

  return buildObjectAccessUrl(key)
}

export async function uploadRemoteFileToS3(
  sourceUrl: string,
  folder: string = "uploads"
) {
  assertStorageConfigured()

  const normalizedSource = sourceUrl.trim()
  const dataPayload = await resolveRemoteSource(normalizedSource)
  const extension = resolveExtensionFromContentType(dataPayload.contentType)
  const key = `${folder}/${uuidv4()}.${extension}`

  await uploadBufferToS3({
    key,
    body: dataPayload.body,
    contentType: dataPayload.contentType,
  })

  return buildObjectAccessUrl(key)
}

async function resolveRemoteSource(source: string) {
  if (source.startsWith("data:")) {
    const [header, content] = source.split(",", 2)

    if (!header || !content) {
      throw new Error("Data URL 格式无效。")
    }

    const contentType = header.match(/^data:(.*?);base64$/)?.[1] || "image/png"

    return {
      body: Buffer.from(content, "base64"),
      contentType,
    }
  }

  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source)

    if (!response.ok) {
      throw new Error("远程图片获取失败。")
    }

    return {
      body: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get("content-type") || "image/png",
    }
  }

  return {
    body: Buffer.from(source, "base64"),
    contentType: detectBase64ContentType(source),
  }
}

async function uploadBufferToS3({
  key,
  body,
  contentType,
}: {
  key: string
  body: Buffer
  contentType?: string
}) {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
  })

  await s3Client.send(command)
}

function resolveExtensionFromContentType(contentType: string) {
  if (contentType.includes("jpeg")) {
    return "jpg"
  }

  if (contentType.includes("webp")) {
    return "webp"
  }

  if (contentType.includes("gif")) {
    return "gif"
  }

  return "png"
}

function detectBase64ContentType(base64: string) {
  if (base64.startsWith("/9j/")) {
    return "image/jpeg"
  }

  if (base64.startsWith("iVBOR")) {
    return "image/png"
  }

  if (base64.startsWith("UklGR")) {
    return "image/webp"
  }

  if (base64.startsWith("R0lGOD")) {
    return "image/gif"
  }

  return "image/png"
}

function buildObjectAccessUrl(key: string) {
  if (publicUrlPrefix) {
    return `${publicUrlPrefix.replace(/\/$/, "")}/${key}`
  }

  if (endpoint) {
    const url = new URL(endpoint)
    return `${url.protocol}//${url.host}/${bucketName}/${key}`
  }

  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`
}

export function resolvePublicAssetUrl(input: string) {
  const normalized = input.trim()

  if (!normalized) {
    return ""
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized
  }

  if (!normalized.startsWith("/api/storage/")) {
    return normalized
  }

  const encodedKey = normalized.replace(/^\/api\/storage\//, "")
  const key = encodedKey
    .split("/")
    .map((segment) => decodeURIComponent(segment))
    .join("/")

  return buildObjectAccessUrl(key)
}
