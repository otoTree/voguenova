import { and, desc, eq, inArray } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

import { db } from "@/lib/db"
import {
  appUsers,
  images,
  models,
  resourceInstructions,
  resourceProducts,
  videoGenerations,
  videoProjectScenes,
  videoProjects,
} from "@/lib/schema"
import { USER_ROLES, type AppUser, type UserRole } from "@/lib/user-system"

export interface ResourceUserOption {
  id: string
  name: string
  email: string
  role: UserRole
}

export interface ResourceModel {
  id: string
  name: string
  style: string
  backstory: string | null
  avatarUrl: string | null
  creatorName: string | null
  assignedOperatorId: string | null
  assignedOperatorName: string | null
  createdAt: string
}

export interface ResourceProduct {
  id: string
  name: string
  brand: string | null
  sku: string | null
  imageUrl: string | null
  description: string | null
  ownerUserId: string
  ownerName: string | null
  createdAt: string
  updatedAt: string
}

export interface ResourceInstruction {
  id: string
  title: string
  category: string
  content: string
  creatorUserId: string | null
  creatorName: string | null
  createdAt: string
  updatedAt: string
}

export interface ResourceGeneratedImage {
  id: string
  modelId: string | null
  modelName: string | null
  productId: string | null
  productName: string | null
  imageUrl: string
  prompt: string | null
  sourceType: string
  generationMode: string
  assetCategory: string
  variantLabel: string | null
  referenceImageUrls: string[]
  creatorName: string | null
  createdAt: string
}

export interface ResourceVideoProjectSummary {
  id: string
  title: string
  status: string
  sceneCount: number
  taskCount: number
  updatedAt: string
}

export interface ResourceVideoProjectScene {
  id: string
  sortOrder: number
  title: string
  duration: number
  visualPrompt: string
  camera: string
  motion: string
  transition: string
  voiceover: string
  referenceUrls: string[]
  soundMode: string
  aspectRatio: string
  createdAt: string
  updatedAt: string
}

export interface ResourceVideoGeneration {
  id: string
  projectId: string
  sceneId: string
  taskId: string
  prompt: string | null
  duration: number
  status: string
  progress: number | null
  videoUrl: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface ResourceVideoProject {
  id: string
  title: string
  brief: string | null
  status: string
  selectedModelId: string | null
  selectedProductId: string | null
  selectedInstructionIds: string[]
  externalReferenceUrls: string[]
  scenes: ResourceVideoProjectScene[]
  tasks: ResourceVideoGeneration[]
  createdAt: string
  updatedAt: string
}

export interface ResourceLibrarySnapshot {
  source: "database" | "unavailable"
  models: ResourceModel[]
  products: ResourceProduct[]
  instructions: ResourceInstruction[]
  generatedImages: ResourceGeneratedImage[]
  operators: ResourceUserOption[]
  productOwners: ResourceUserOption[]
}

interface UserOptionRecord {
  id: string
  name: string
  email: string
  role: string
}

interface ResourceModelRecord {
  id: string
  name: string
  style: string
  backstory: string | null
  avatarUrl: string | null
  creatorName: string | null
  assignedOperatorId: string | null
  assignedOperatorName: string | null
  createdAt: string | Date
}

interface ResourceProductRecord {
  id: string
  name: string
  brand: string | null
  sku: string | null
  imageUrl: string | null
  description: string | null
  ownerUserId: string
  ownerName: string | null
  createdAt: string | Date
  updatedAt: string | Date
}

interface ResourceVideoProjectRecord {
  id: string
  title: string
  brief: string | null
  status: string
  selectedModelId: string | null
  selectedProductId: string | null
  selectedInstructionIds: string | null
  externalReferenceUrls: string | null
  createdAt: string | Date
  updatedAt: string | Date
}

interface ResourceVideoProjectSceneRecord {
  id: string
  sortOrder: number
  title: string
  duration: number
  visualPrompt: string | null
  camera: string | null
  motion: string | null
  transition: string | null
  voiceover: string | null
  referenceUrls: string | null
  soundMode: string
  aspectRatio: string
  createdAt: string | Date
  updatedAt: string | Date
}

interface ResourceVideoGenerationRecord {
  id: string
  projectId: string
  sceneId: string
  taskId: string
  prompt: string | null
  duration: number
  status: string
  progress: number | null
  videoUrl: string | null
  errorMessage: string | null
  createdAt: string | Date
  updatedAt: string | Date
}

interface ResourceInstructionRecord {
  id: string
  title: string
  category: string
  content: string
  creatorUserId: string | null
  creatorName: string | null
  createdAt: string | Date
  updatedAt: string | Date
}

interface ResourceGeneratedImageRecord {
  id: string
  modelId: string | null
  modelName: string | null
  productId: string | null
  productName: string | null
  imageUrl: string
  prompt: string | null
  sourceType: string
  generationMode: string
  assetCategory: string
  variantLabel: string | null
  referenceImageUrls: string | null
  creatorName: string | null
  createdAt: string | Date
}

interface CreateModelInput {
  name: string
  style: string
  backstory?: string | null
  avatarUrl?: string | null
  assignedOperatorId?: string | null
}

interface UpdateModelInput extends CreateModelInput {
  id: string
}

interface CreateProductInput {
  name: string
  brand?: string | null
  sku?: string | null
  imageUrl?: string | null
  description?: string | null
  ownerUserId?: string | null
}

interface UpdateProductInput extends CreateProductInput {
  id: string
}

interface CreateInstructionInput {
  title: string
  category?: string | null
  content: string
}

interface UpdateInstructionInput extends CreateInstructionInput {
  id: string
}

interface CreateGeneratedImageInput {
  modelId?: string | null
  productId?: string | null
  imageUrl: string
  prompt?: string | null
  sourceType?: string | null
  generationMode?: string | null
  assetCategory?: string | null
  variantLabel?: string | null
  referenceImageUrls?: string[] | null
}

export interface SaveVideoProjectSceneInput {
  id?: string
  sortOrder: number
  title: string
  duration: number
  visualPrompt?: string | null
  camera?: string | null
  motion?: string | null
  transition?: string | null
  voiceover?: string | null
  referenceUrls?: string[]
  soundMode?: string | null
  aspectRatio?: string | null
}

export interface SaveVideoProjectInput {
  id?: string
  title: string
  brief?: string | null
  status?: string | null
  selectedModelId?: string | null
  selectedProductId?: string | null
  selectedInstructionIds?: string[]
  externalReferenceUrls?: string[]
  scenes?: SaveVideoProjectSceneInput[]
}

export interface CreateVideoGenerationInput {
  projectId: string
  sceneId: string
  taskId: string
  prompt?: string | null
  duration?: number | null
  status?: string | null
}

export interface UpdateVideoGenerationInput {
  projectId: string
  sceneId: string
  taskId: string
  status: string
  progress?: number | null
  videoUrl?: string | null
  errorMessage?: string | null
}

export interface RenameVideoProjectInput {
  projectId: string
  title: string
}

export interface CopyVideoProjectInput {
  projectId: string
  title?: string | null
}

function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL)
}

function isUserRole(value: string): value is UserRole {
  return USER_ROLES.includes(value as UserRole)
}

function toIsoString(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function normalizeText(value: string) {
  return value.trim()
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = String(value ?? "").trim()
  return normalized ? normalized : null
}

function resolveActorUserId(actor: AppUser) {
  return actor.role === "admin" ? null : actor.id
}

function mapUserOption(row: UserOptionRecord): ResourceUserOption {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: isUserRole(row.role) ? row.role : "user",
  }
}

function mapResourceModel(row: ResourceModelRecord): ResourceModel {
  return {
    id: row.id,
    name: row.name,
    style: row.style,
    backstory: row.backstory,
    avatarUrl: row.avatarUrl,
    creatorName: row.creatorName,
    assignedOperatorId: row.assignedOperatorId,
    assignedOperatorName: row.assignedOperatorName,
    createdAt: toIsoString(row.createdAt),
  }
}

function mapResourceProduct(row: ResourceProductRecord): ResourceProduct {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    sku: row.sku,
    imageUrl: row.imageUrl,
    description: row.description,
    ownerUserId: row.ownerUserId,
    ownerName: row.ownerName,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  }
}

function mapResourceInstruction(
  row: ResourceInstructionRecord
): ResourceInstruction {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    content: row.content,
    creatorUserId: row.creatorUserId,
    creatorName: row.creatorName,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  }
}

function mapResourceGeneratedImage(
  row: ResourceGeneratedImageRecord
): ResourceGeneratedImage {
  let referenceImageUrls: string[] = []

  if (row.referenceImageUrls) {
    try {
      const parsed = JSON.parse(row.referenceImageUrls)
      referenceImageUrls = Array.isArray(parsed)
        ? parsed.map((item) => String(item ?? "")).filter(Boolean)
        : []
    } catch {
      referenceImageUrls = []
    }
  }

  return {
    id: row.id,
    modelId: row.modelId,
    modelName: row.modelName,
    productId: row.productId,
    productName: row.productName,
    imageUrl: row.imageUrl,
    prompt: row.prompt,
    sourceType: row.sourceType,
    generationMode: row.generationMode,
    assetCategory: row.assetCategory,
    variantLabel: row.variantLabel,
    referenceImageUrls,
    creatorName: row.creatorName,
    createdAt: toIsoString(row.createdAt),
  }
}

function parseStringArray(value: string | null | undefined) {
  if (!value) {
    return [] as string[]
  }

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.map((item) => String(item ?? "").trim()).filter(Boolean)
      : []
  } catch {
    return []
  }
}

function mapResourceVideoProjectSummary(
  row: ResourceVideoProjectRecord & {
    sceneCount?: number
    taskCount?: number
  }
): ResourceVideoProjectSummary {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    sceneCount: row.sceneCount ?? 0,
    taskCount: row.taskCount ?? 0,
    updatedAt: toIsoString(row.updatedAt),
  }
}

function mapResourceVideoProjectScene(
  row: ResourceVideoProjectSceneRecord
): ResourceVideoProjectScene {
  return {
    id: row.id,
    sortOrder: row.sortOrder,
    title: row.title,
    duration: row.duration,
    visualPrompt: row.visualPrompt ?? "",
    camera: row.camera ?? "",
    motion: row.motion ?? "",
    transition: row.transition ?? "",
    voiceover: row.voiceover ?? "",
    referenceUrls: parseStringArray(row.referenceUrls),
    soundMode: row.soundMode,
    aspectRatio: row.aspectRatio,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  }
}

function mapResourceVideoGeneration(
  row: ResourceVideoGenerationRecord
): ResourceVideoGeneration {
  return {
    id: row.id,
    projectId: row.projectId,
    sceneId: row.sceneId,
    taskId: row.taskId,
    prompt: row.prompt,
    duration: row.duration,
    status: row.status,
    progress: row.progress,
    videoUrl: row.videoUrl,
    errorMessage: row.errorMessage,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  }
}

function buildUnavailableSnapshot(): ResourceLibrarySnapshot {
  return {
    source: "unavailable",
    models: [],
    products: [],
    instructions: [],
    generatedImages: [],
    operators: [],
    productOwners: [],
  }
}

function normalizeStringArray(values: string[] | null | undefined) {
  return (values ?? []).map((item) => String(item ?? "").trim()).filter(Boolean)
}

function normalizeVideoProjectSceneInput(
  input: SaveVideoProjectSceneInput
): SaveVideoProjectSceneInput {
  const title = normalizeText(input.title || "")

  if (!title) {
    throw new Error("镜头标题不能为空。")
  }

  return {
    id: normalizeOptionalText(input.id) ?? undefined,
    sortOrder: Number.isFinite(input.sortOrder) ? Math.max(0, Math.round(input.sortOrder)) : 0,
    title,
    duration: Math.max(1, Math.min(12, Math.round(input.duration || 4))),
    visualPrompt: normalizeOptionalText(input.visualPrompt),
    camera: normalizeOptionalText(input.camera),
    motion: normalizeOptionalText(input.motion),
    transition: normalizeOptionalText(input.transition),
    voiceover: normalizeOptionalText(input.voiceover),
    referenceUrls: normalizeStringArray(input.referenceUrls),
    soundMode: normalizeOptionalText(input.soundMode) ?? "off",
    aspectRatio: normalizeOptionalText(input.aspectRatio) ?? "9:16",
  }
}

function normalizeVideoProjectInput(input: SaveVideoProjectInput) {
  const title = normalizeText(input.title || "")

  if (!title) {
    throw new Error("项目标题不能为空。")
  }

  return {
    id: normalizeOptionalText(input.id),
    title,
    brief: normalizeOptionalText(input.brief),
    status: normalizeOptionalText(input.status) ?? "draft",
    selectedModelId: normalizeOptionalText(input.selectedModelId),
    selectedProductId: normalizeOptionalText(input.selectedProductId),
    selectedInstructionIds: normalizeStringArray(input.selectedInstructionIds),
    externalReferenceUrls: normalizeStringArray(input.externalReferenceUrls),
    scenes: (input.scenes ?? []).map(normalizeVideoProjectSceneInput),
  }
}

function normalizeVideoGenerationStatus(status: string | null | undefined) {
  const normalized = String(status ?? "").trim().toLowerCase()

  if (["completed", "succeeded", "success", "ready"].includes(normalized)) {
    return "completed"
  }

  if (["failed", "error", "cancelled", "needs_attention"].includes(normalized)) {
    return "failed"
  }

  if (["processing", "pending", "queued", "running"].includes(normalized)) {
    return "processing"
  }

  return normalized || "draft"
}

function resolveProjectStatusFromTaskStatuses(
  taskStatuses: string[],
  fallbackStatus = "draft"
) {
  if (!taskStatuses.length) {
    return fallbackStatus
  }

  const normalizedStatuses = taskStatuses.map(normalizeVideoGenerationStatus)

  if (normalizedStatuses.some((status) => status === "processing")) {
    return "processing"
  }

  if (normalizedStatuses.some((status) => status === "failed")) {
    return "needs_attention"
  }

  if (normalizedStatuses.every((status) => status === "completed")) {
    return "ready"
  }

  return fallbackStatus
}

async function refreshVideoProjectStatus(projectId: string, fallbackStatus = "draft") {
  const taskRows = await db
    .select({
      status: videoGenerations.status,
    })
    .from(videoGenerations)
    .where(eq(videoGenerations.projectId, projectId))

  const nextStatus = resolveProjectStatusFromTaskStatuses(
    taskRows.map((row) => row.status),
    fallbackStatus
  )

  await db
    .update(videoProjects)
    .set({
      status: nextStatus,
      updatedAt: new Date(),
    })
    .where(eq(videoProjects.id, projectId))

  return nextStatus
}

async function requireVideoProject(actor: AppUser, projectId: string) {
  const [project] = await db
    .select({
      id: videoProjects.id,
      ownerUserId: videoProjects.ownerUserId,
      title: videoProjects.title,
      brief: videoProjects.brief,
      status: videoProjects.status,
      selectedModelId: videoProjects.selectedModelId,
      selectedProductId: videoProjects.selectedProductId,
      selectedInstructionIds: videoProjects.selectedInstructionIds,
      externalReferenceUrls: videoProjects.externalReferenceUrls,
      createdAt: videoProjects.createdAt,
      updatedAt: videoProjects.updatedAt,
    })
    .from(videoProjects)
    .where(eq(videoProjects.id, projectId))
    .limit(1)

  if (!project) {
    throw new Error("项目不存在。")
  }

  if (actor.role !== "admin" && actor.id !== project.ownerUserId) {
    throw new Error("无权访问该项目。")
  }

  return project
}

export async function listVideoProjects(actor: AppUser) {
  if (!isDatabaseConfigured()) {
    return [] as ResourceVideoProjectSummary[]
  }

  const baseQuery = db
    .select({
      id: videoProjects.id,
      title: videoProjects.title,
      brief: videoProjects.brief,
      status: videoProjects.status,
      selectedModelId: videoProjects.selectedModelId,
      selectedProductId: videoProjects.selectedProductId,
      selectedInstructionIds: videoProjects.selectedInstructionIds,
      externalReferenceUrls: videoProjects.externalReferenceUrls,
      createdAt: videoProjects.createdAt,
      updatedAt: videoProjects.updatedAt,
    })
    .from(videoProjects)

  const rows =
    actor.role === "admin"
      ? await baseQuery.orderBy(desc(videoProjects.updatedAt))
      : await baseQuery
          .where(eq(videoProjects.ownerUserId, actor.id))
          .orderBy(desc(videoProjects.updatedAt))
  const projectIds = rows.map((row) => row.id)
  const [sceneRows, taskRows] = projectIds.length
    ? await Promise.all([
        db
          .select({
            projectId: videoProjectScenes.projectId,
          })
          .from(videoProjectScenes)
          .where(inArray(videoProjectScenes.projectId, projectIds)),
        db
          .select({
            projectId: videoGenerations.projectId,
          })
          .from(videoGenerations)
          .where(inArray(videoGenerations.projectId, projectIds)),
      ])
    : [[], []]
  const sceneCountByProject = new Map<string, number>()
  const taskCountByProject = new Map<string, number>()

  sceneRows.forEach((row) => {
    sceneCountByProject.set(row.projectId, (sceneCountByProject.get(row.projectId) ?? 0) + 1)
  })
  taskRows.forEach((row) => {
    taskCountByProject.set(row.projectId, (taskCountByProject.get(row.projectId) ?? 0) + 1)
  })

  return rows.map((row) =>
    mapResourceVideoProjectSummary({
      ...row,
      sceneCount: sceneCountByProject.get(row.id) ?? 0,
      taskCount: taskCountByProject.get(row.id) ?? 0,
    })
  )
}

export async function getVideoProject(actor: AppUser, projectId: string) {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL 未配置，当前环境无法读取视频项目。")
  }

  const baseProject = await requireVideoProject(actor, projectId)
  const [sceneRows, generationRows] = await Promise.all([
    db
      .select({
        id: videoProjectScenes.id,
        sortOrder: videoProjectScenes.sortOrder,
        title: videoProjectScenes.title,
        duration: videoProjectScenes.duration,
        visualPrompt: videoProjectScenes.visualPrompt,
        camera: videoProjectScenes.camera,
        motion: videoProjectScenes.motion,
        transition: videoProjectScenes.transition,
        voiceover: videoProjectScenes.voiceover,
        referenceUrls: videoProjectScenes.referenceUrls,
        soundMode: videoProjectScenes.soundMode,
        aspectRatio: videoProjectScenes.aspectRatio,
        createdAt: videoProjectScenes.createdAt,
        updatedAt: videoProjectScenes.updatedAt,
      })
      .from(videoProjectScenes)
      .where(eq(videoProjectScenes.projectId, projectId))
      .orderBy(videoProjectScenes.sortOrder, videoProjectScenes.createdAt),
    db
      .select({
        id: videoGenerations.id,
        projectId: videoGenerations.projectId,
        sceneId: videoGenerations.sceneId,
        taskId: videoGenerations.taskId,
        prompt: videoGenerations.prompt,
        duration: videoGenerations.duration,
        status: videoGenerations.status,
        progress: videoGenerations.progress,
        videoUrl: videoGenerations.videoUrl,
        errorMessage: videoGenerations.errorMessage,
        createdAt: videoGenerations.createdAt,
        updatedAt: videoGenerations.updatedAt,
      })
      .from(videoGenerations)
      .where(eq(videoGenerations.projectId, projectId))
      .orderBy(desc(videoGenerations.createdAt)),
  ])

  return {
    id: baseProject.id,
    title: baseProject.title,
    brief: baseProject.brief,
    status: baseProject.status,
    selectedModelId: baseProject.selectedModelId,
    selectedProductId: baseProject.selectedProductId,
    selectedInstructionIds: parseStringArray(baseProject.selectedInstructionIds),
    externalReferenceUrls: parseStringArray(baseProject.externalReferenceUrls),
    scenes: sceneRows.map(mapResourceVideoProjectScene),
    tasks: generationRows.map(mapResourceVideoGeneration),
    createdAt: toIsoString(baseProject.createdAt),
    updatedAt: toIsoString(baseProject.updatedAt),
  } satisfies ResourceVideoProject
}

export async function saveVideoProject(actor: AppUser, input: SaveVideoProjectInput) {
  assertCanManageAllResources(actor)

  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL 未配置，当前环境无法写入视频项目。")
  }

  const normalized = normalizeVideoProjectInput(input)
  const now = new Date()
  let projectId = normalized.id
  let nextProjectStatus = normalized.status

  if (normalized.selectedModelId) {
    await requireModel(normalized.selectedModelId)
  }

  if (normalized.selectedProductId) {
    await requireProductForMutation(normalized.selectedProductId)
  }

  if (normalized.id) {
    await requireVideoProject(actor, normalized.id)
    const existingTaskRows = await db
      .select({
        status: videoGenerations.status,
      })
      .from(videoGenerations)
      .where(eq(videoGenerations.projectId, normalized.id))
    nextProjectStatus = resolveProjectStatusFromTaskStatuses(
      existingTaskRows.map((row) => row.status),
      normalized.status
    )

    await db
      .update(videoProjects)
      .set({
        title: normalized.title,
        brief: normalized.brief,
        status: nextProjectStatus,
        selectedModelId: normalized.selectedModelId,
        selectedProductId: normalized.selectedProductId,
        selectedInstructionIds: JSON.stringify(normalized.selectedInstructionIds),
        externalReferenceUrls: JSON.stringify(normalized.externalReferenceUrls),
        updatedAt: now,
      })
      .where(eq(videoProjects.id, normalized.id))
  } else {
    const [insertedProject] = await db
      .insert(videoProjects)
      .values({
        ownerUserId: resolveActorUserId(actor),
        title: normalized.title,
        brief: normalized.brief,
        status: nextProjectStatus,
        selectedModelId: normalized.selectedModelId,
        selectedProductId: normalized.selectedProductId,
        selectedInstructionIds: JSON.stringify(normalized.selectedInstructionIds),
        externalReferenceUrls: JSON.stringify(normalized.externalReferenceUrls),
        updatedAt: now,
      })
      .returning({
        id: videoProjects.id,
      })

    projectId = insertedProject?.id ?? null
  }

  if (!projectId) {
    throw new Error("视频项目保存失败。")
  }

  const existingScenes = await db
    .select({
      id: videoProjectScenes.id,
    })
    .from(videoProjectScenes)
    .where(eq(videoProjectScenes.projectId, projectId))

  const incomingSceneIds = normalized.scenes
    .map((scene) => scene.id)
    .filter((value): value is string => Boolean(value))

  const removableSceneIds = existingScenes
    .map((scene) => scene.id)
    .filter((id) => !incomingSceneIds.includes(id))

  if (removableSceneIds.length) {
    await db
      .delete(videoProjectScenes)
      .where(
        and(
          eq(videoProjectScenes.projectId, projectId),
          inArray(videoProjectScenes.id, removableSceneIds)
        )
      )
  }

  for (const [index, scene] of normalized.scenes.entries()) {
    const payload = {
      projectId,
      sortOrder: scene.sortOrder ?? index,
      title: scene.title,
      duration: scene.duration,
      visualPrompt: scene.visualPrompt ?? null,
      camera: scene.camera ?? null,
      motion: scene.motion ?? null,
      transition: scene.transition ?? null,
      voiceover: scene.voiceover ?? null,
      referenceUrls: JSON.stringify(scene.referenceUrls ?? []),
      soundMode: scene.soundMode ?? "off",
      aspectRatio: scene.aspectRatio ?? "9:16",
      updatedAt: now,
    }

    if (scene.id && existingScenes.some((item) => item.id === scene.id)) {
      await db
        .update(videoProjectScenes)
        .set(payload)
        .where(
          and(
            eq(videoProjectScenes.id, scene.id),
            eq(videoProjectScenes.projectId, projectId)
          )
        )
    } else {
      await db.insert(videoProjectScenes).values({
        id: scene.id,
        ...payload,
      })
    }
  }

  await refreshVideoProjectStatus(projectId, nextProjectStatus)

  return getVideoProject(actor, projectId)
}

export async function createVideoGenerationRecord(
  actor: AppUser,
  input: CreateVideoGenerationInput
) {
  assertCanManageAllResources(actor)

  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL 未配置，当前环境无法写入视频任务。")
  }

  const project = await requireVideoProject(actor, input.projectId)
  const [scene] = await db
    .select({
      id: videoProjectScenes.id,
    })
    .from(videoProjectScenes)
    .where(
      and(
        eq(videoProjectScenes.id, input.sceneId),
        eq(videoProjectScenes.projectId, project.id)
      )
    )
    .limit(1)

  if (!scene) {
    throw new Error("镜头不存在。")
  }

  const [record] = await db
    .insert(videoGenerations)
    .values({
      projectId: input.projectId,
      sceneId: input.sceneId,
      taskId: normalizeText(input.taskId),
      prompt: normalizeOptionalText(input.prompt),
      duration: Math.max(1, Math.min(12, Math.round(input.duration || 4))),
      status: normalizeOptionalText(input.status) ?? "processing",
      createdByUserId: resolveActorUserId(actor),
    })
    .returning({
      id: videoGenerations.id,
      projectId: videoGenerations.projectId,
      sceneId: videoGenerations.sceneId,
      taskId: videoGenerations.taskId,
      prompt: videoGenerations.prompt,
      duration: videoGenerations.duration,
      status: videoGenerations.status,
      progress: videoGenerations.progress,
      videoUrl: videoGenerations.videoUrl,
      errorMessage: videoGenerations.errorMessage,
      createdAt: videoGenerations.createdAt,
      updatedAt: videoGenerations.updatedAt,
    })

  await refreshVideoProjectStatus(input.projectId, "processing")

  return mapResourceVideoGeneration(record)
}

export async function updateVideoGenerationRecord(
  actor: AppUser,
  input: UpdateVideoGenerationInput
) {
  assertCanManageAllResources(actor)

  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL 未配置，当前环境无法写入视频任务。")
  }

  await requireVideoProject(actor, input.projectId)

  const [record] = await db
    .update(videoGenerations)
    .set({
      status: normalizeText(input.status),
      progress:
        typeof input.progress === "number" ? Math.max(0, Math.min(100, Math.round(input.progress))) : null,
      videoUrl: normalizeOptionalText(input.videoUrl),
      errorMessage: normalizeOptionalText(input.errorMessage),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(videoGenerations.projectId, input.projectId),
        eq(videoGenerations.sceneId, input.sceneId),
        eq(videoGenerations.taskId, input.taskId)
      )
    )
    .returning({
      id: videoGenerations.id,
      projectId: videoGenerations.projectId,
      sceneId: videoGenerations.sceneId,
      taskId: videoGenerations.taskId,
      prompt: videoGenerations.prompt,
      duration: videoGenerations.duration,
      status: videoGenerations.status,
      progress: videoGenerations.progress,
      videoUrl: videoGenerations.videoUrl,
      errorMessage: videoGenerations.errorMessage,
      createdAt: videoGenerations.createdAt,
      updatedAt: videoGenerations.updatedAt,
    })

  if (!record) {
    throw new Error("视频任务不存在。")
  }

  await refreshVideoProjectStatus(input.projectId, "processing")

  return mapResourceVideoGeneration(record)
}

export async function listVideoGenerationsByProject(actor: AppUser, projectId: string) {
  const project = await getVideoProject(actor, projectId)
  return project.tasks
}

export async function renameVideoProject(actor: AppUser, input: RenameVideoProjectInput) {
  assertCanManageAllResources(actor)

  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL 未配置，当前环境无法写入视频项目。")
  }

  const projectId = normalizeOptionalText(input.projectId)
  const title = normalizeText(input.title || "")

  if (!projectId) {
    throw new Error("缺少项目 ID。")
  }

  if (!title) {
    throw new Error("项目标题不能为空。")
  }

  await requireVideoProject(actor, projectId)

  await db
    .update(videoProjects)
    .set({
      title,
      updatedAt: new Date(),
    })
    .where(eq(videoProjects.id, projectId))

  return getVideoProject(actor, projectId)
}

export async function deleteVideoProject(actor: AppUser, projectId: string) {
  assertCanManageAllResources(actor)

  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL 未配置，当前环境无法写入视频项目。")
  }

  const normalizedProjectId = normalizeOptionalText(projectId)

  if (!normalizedProjectId) {
    throw new Error("缺少项目 ID。")
  }

  await requireVideoProject(actor, normalizedProjectId)

  await db.delete(videoProjects).where(eq(videoProjects.id, normalizedProjectId))
}

export async function copyVideoProject(actor: AppUser, input: CopyVideoProjectInput) {
  assertCanManageAllResources(actor)

  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL 未配置，当前环境无法写入视频项目。")
  }

  const projectId = normalizeOptionalText(input.projectId)

  if (!projectId) {
    throw new Error("缺少项目 ID。")
  }

  const sourceProject = await getVideoProject(actor, projectId)
  const title =
    normalizeOptionalText(input.title) ||
    `${sourceProject.title} 副本`

  return saveVideoProject(actor, {
    title,
    brief: sourceProject.brief,
    status: "draft",
    selectedModelId: sourceProject.selectedModelId,
    selectedProductId: sourceProject.selectedProductId,
    selectedInstructionIds: sourceProject.selectedInstructionIds,
    externalReferenceUrls: sourceProject.externalReferenceUrls,
    scenes: sourceProject.scenes.map((scene) => ({
      sortOrder: scene.sortOrder,
      title: scene.title,
      duration: scene.duration,
      visualPrompt: scene.visualPrompt,
      camera: scene.camera,
      motion: scene.motion,
      transition: scene.transition,
      voiceover: scene.voiceover,
      referenceUrls: scene.referenceUrls,
      soundMode: scene.soundMode,
      aspectRatio: scene.aspectRatio,
    })),
  })
}

function assertCanManageAllResources(actor: AppUser) {
  if (!["admin", "operator"].includes(actor.role)) {
    throw new Error("当前角色不能配置该资源。")
  }
}

async function getAssignableUsers() {
  const rows = await db
    .select({
      id: appUsers.id,
      name: appUsers.name,
      email: appUsers.email,
      role: appUsers.role,
    })
    .from(appUsers)
    .orderBy(desc(appUsers.createdAt))

  const users = rows.map(mapUserOption)

  return {
    operators: users.filter((user) => user.role === "operator"),
    productOwners: users.filter((user) => user.role !== "admin"),
  }
}

async function requireAssignableOwner(ownerUserId: string) {
  const [owner] = await db
    .select({
      id: appUsers.id,
      name: appUsers.name,
      email: appUsers.email,
      role: appUsers.role,
    })
    .from(appUsers)
    .where(eq(appUsers.id, ownerUserId))
    .limit(1)

  if (!owner) {
    throw new Error("商品归属用户不存在。")
  }

  const mappedOwner = mapUserOption(owner)

  if (mappedOwner.role === "admin") {
    throw new Error("商品不能归属给 admin 账号。")
  }

  return mappedOwner
}

async function requireOperator(operatorId: string) {
  const [operator] = await db
    .select({
      id: appUsers.id,
      name: appUsers.name,
      email: appUsers.email,
      role: appUsers.role,
    })
    .from(appUsers)
    .where(eq(appUsers.id, operatorId))
    .limit(1)

  if (!operator) {
    throw new Error("所选运营账号不存在。")
  }

  const mappedOperator = mapUserOption(operator)

  if (mappedOperator.role !== "operator") {
    throw new Error("模特负责人必须为运营角色。")
  }

  return mappedOperator
}

function validateModelInput(input: CreateModelInput) {
  const name = normalizeText(input.name)
  const style = normalizeText(input.style)
  const backstory = normalizeOptionalText(input.backstory)
  const avatarUrl = normalizeOptionalText(input.avatarUrl)
  const assignedOperatorId = normalizeOptionalText(input.assignedOperatorId)

  if (!name) {
    throw new Error("模特名称不能为空。")
  }

  if (!style) {
    throw new Error("模特风格不能为空。")
  }

  return {
    name,
    style,
    backstory,
    avatarUrl,
    assignedOperatorId,
  }
}

function validateProductInput(input: CreateProductInput) {
  const name = normalizeText(input.name)
  const brand = normalizeOptionalText(input.brand)
  const sku = normalizeOptionalText(input.sku)
  const imageUrl = normalizeOptionalText(input.imageUrl)
  const description = normalizeOptionalText(input.description)
  const ownerUserId = normalizeOptionalText(input.ownerUserId)

  if (!name) {
    throw new Error("商品名称不能为空。")
  }

  return {
    name,
    brand,
    sku,
    imageUrl,
    description,
    ownerUserId,
  }
}

function validateInstructionInput(input: CreateInstructionInput) {
  const title = normalizeText(input.title)
  const category = normalizeOptionalText(input.category) ?? "general"
  const content = normalizeText(input.content)

  if (!title) {
    throw new Error("指令标题不能为空。")
  }

  if (!content) {
    throw new Error("指令内容不能为空。")
  }

  return {
    title,
    category,
    content,
  }
}

async function requireProductForMutation(productId: string) {
  const [product] = await db
    .select({
      id: resourceProducts.id,
      ownerUserId: resourceProducts.ownerUserId,
    })
    .from(resourceProducts)
    .where(eq(resourceProducts.id, productId))
    .limit(1)

  if (!product) {
    throw new Error("商品资源不存在。")
  }

  return product
}

async function requireModel(modelId: string) {
  const [model] = await db
    .select({
      id: models.id,
    })
    .from(models)
    .where(eq(models.id, modelId))
    .limit(1)

  if (!model) {
    throw new Error("模特资源不存在。")
  }
}

async function requireInstruction(instructionId: string) {
  const [instruction] = await db
    .select({
      id: resourceInstructions.id,
      createdByUserId: resourceInstructions.createdByUserId,
    })
    .from(resourceInstructions)
    .where(eq(resourceInstructions.id, instructionId))
    .limit(1)

  if (!instruction) {
    throw new Error("指令资源不存在。")
  }

  return instruction
}

export async function getResourceLibrarySnapshot(
  actor: AppUser
): Promise<ResourceLibrarySnapshot> {
  if (!isDatabaseConfigured()) {
    return buildUnavailableSnapshot()
  }

  const modelCreator = alias(appUsers, "resource_model_creator")
  const modelOperator = alias(appUsers, "resource_model_operator")
  const productOwner = alias(appUsers, "resource_product_owner")
  const instructionCreator = alias(appUsers, "resource_instruction_creator")
  const generatedImageCreator = alias(appUsers, "generated_image_creator")
  const generatedImageModel = alias(models, "generated_image_model")
  const generatedImageProduct = alias(resourceProducts, "generated_image_product")

  try {
    const [
      { operators, productOwners },
      modelRows,
      productRows,
      instructionRows,
      generatedImageRows,
    ] = await Promise.all([
        getAssignableUsers(),
        db
          .select({
            id: models.id,
            name: models.name,
            style: models.style,
            backstory: models.backstory,
            avatarUrl: models.avatarUrl,
            creatorName: modelCreator.name,
            assignedOperatorId: models.assignedOperatorId,
            assignedOperatorName: modelOperator.name,
            createdAt: models.createdAt,
          })
          .from(models)
          .leftJoin(modelCreator, eq(modelCreator.id, models.createdByUserId))
          .leftJoin(modelOperator, eq(modelOperator.id, models.assignedOperatorId))
          .orderBy(desc(models.createdAt)),
        actor.role === "user"
          ? db
              .select({
                id: resourceProducts.id,
                name: resourceProducts.name,
                brand: resourceProducts.brand,
                sku: resourceProducts.sku,
                imageUrl: resourceProducts.imageUrl,
                description: resourceProducts.description,
                ownerUserId: resourceProducts.ownerUserId,
                ownerName: productOwner.name,
                createdAt: resourceProducts.createdAt,
                updatedAt: resourceProducts.updatedAt,
              })
              .from(resourceProducts)
              .leftJoin(productOwner, eq(productOwner.id, resourceProducts.ownerUserId))
              .where(eq(resourceProducts.ownerUserId, actor.id))
              .orderBy(desc(resourceProducts.updatedAt))
          : db
              .select({
                id: resourceProducts.id,
                name: resourceProducts.name,
                brand: resourceProducts.brand,
                sku: resourceProducts.sku,
                imageUrl: resourceProducts.imageUrl,
                description: resourceProducts.description,
                ownerUserId: resourceProducts.ownerUserId,
                ownerName: productOwner.name,
                createdAt: resourceProducts.createdAt,
                updatedAt: resourceProducts.updatedAt,
              })
              .from(resourceProducts)
              .leftJoin(productOwner, eq(productOwner.id, resourceProducts.ownerUserId))
              .orderBy(desc(resourceProducts.updatedAt)),
        actor.role === "user"
          ? db
              .select({
                id: resourceInstructions.id,
                title: resourceInstructions.title,
                category: resourceInstructions.category,
                content: resourceInstructions.content,
                creatorUserId: resourceInstructions.createdByUserId,
                creatorName: instructionCreator.name,
                createdAt: resourceInstructions.createdAt,
                updatedAt: resourceInstructions.updatedAt,
              })
              .from(resourceInstructions)
              .leftJoin(
                instructionCreator,
                eq(instructionCreator.id, resourceInstructions.createdByUserId)
              )
              .where(eq(resourceInstructions.createdByUserId, actor.id))
              .orderBy(desc(resourceInstructions.updatedAt))
          : db
              .select({
                id: resourceInstructions.id,
                title: resourceInstructions.title,
                category: resourceInstructions.category,
                content: resourceInstructions.content,
                creatorUserId: resourceInstructions.createdByUserId,
                creatorName: instructionCreator.name,
                createdAt: resourceInstructions.createdAt,
                updatedAt: resourceInstructions.updatedAt,
              })
              .from(resourceInstructions)
              .leftJoin(
                instructionCreator,
                eq(instructionCreator.id, resourceInstructions.createdByUserId)
              )
              .orderBy(desc(resourceInstructions.updatedAt)),
        actor.role === "user"
          ? db
              .select({
                id: images.id,
                modelId: images.modelId,
                modelName: generatedImageModel.name,
                productId: images.productId,
                productName: generatedImageProduct.name,
                imageUrl: images.imageUrl,
                prompt: images.prompt,
                sourceType: images.sourceType,
                generationMode: images.generationMode,
                assetCategory: images.assetCategory,
                variantLabel: images.variantLabel,
                referenceImageUrls: images.referenceImageUrls,
                creatorName: generatedImageCreator.name,
                createdAt: images.createdAt,
              })
              .from(images)
              .leftJoin(generatedImageModel, eq(generatedImageModel.id, images.modelId))
              .leftJoin(
                generatedImageProduct,
                eq(generatedImageProduct.id, images.productId)
              )
              .leftJoin(
                generatedImageCreator,
                eq(generatedImageCreator.id, images.createdByUserId)
              )
              .where(eq(images.createdByUserId, actor.id))
              .orderBy(desc(images.createdAt))
              .limit(60)
          : db
              .select({
                id: images.id,
                modelId: images.modelId,
                modelName: generatedImageModel.name,
                productId: images.productId,
                productName: generatedImageProduct.name,
                imageUrl: images.imageUrl,
                prompt: images.prompt,
                sourceType: images.sourceType,
                generationMode: images.generationMode,
                assetCategory: images.assetCategory,
                variantLabel: images.variantLabel,
                referenceImageUrls: images.referenceImageUrls,
                creatorName: generatedImageCreator.name,
                createdAt: images.createdAt,
              })
              .from(images)
              .leftJoin(generatedImageModel, eq(generatedImageModel.id, images.modelId))
              .leftJoin(
                generatedImageProduct,
                eq(generatedImageProduct.id, images.productId)
              )
              .leftJoin(
                generatedImageCreator,
                eq(generatedImageCreator.id, images.createdByUserId)
              )
              .where(eq(images.sourceType, "generated"))
              .orderBy(desc(images.createdAt))
              .limit(60),
      ])

    return {
      source: "database",
      models: modelRows.map(mapResourceModel),
      products: productRows.map(mapResourceProduct),
      instructions: instructionRows.map(mapResourceInstruction),
      generatedImages: generatedImageRows.map(mapResourceGeneratedImage),
      operators: actor.role === "user" ? [] : operators,
      productOwners: actor.role === "user" ? [] : productOwners,
    }
  } catch {
    return buildUnavailableSnapshot()
  }
}

export async function createResourceModel(actor: AppUser, input: CreateModelInput) {
  assertCanManageAllResources(actor)

  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL 未配置，当前环境无法写入资源库。")
  }

  const validatedInput = validateModelInput(input)

  if (validatedInput.assignedOperatorId) {
    await requireOperator(validatedInput.assignedOperatorId)
  }

  await db.insert(models).values({
    name: validatedInput.name,
    style: validatedInput.style,
    backstory: validatedInput.backstory,
    avatarUrl: validatedInput.avatarUrl,
    assignedOperatorId: validatedInput.assignedOperatorId,
    createdByUserId: resolveActorUserId(actor),
  })
}

export async function updateResourceModel(actor: AppUser, input: UpdateModelInput) {
  assertCanManageAllResources(actor)

  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL 未配置，当前环境无法写入资源库。")
  }

  await requireModel(input.id)

  const validatedInput = validateModelInput(input)

  if (validatedInput.assignedOperatorId) {
    await requireOperator(validatedInput.assignedOperatorId)
  }

  await db
    .update(models)
    .set({
      name: validatedInput.name,
      style: validatedInput.style,
      backstory: validatedInput.backstory,
      avatarUrl: validatedInput.avatarUrl,
      assignedOperatorId: validatedInput.assignedOperatorId,
    })
    .where(eq(models.id, input.id))
}

export async function deleteResourceModel(actor: AppUser, modelId: string) {
  assertCanManageAllResources(actor)

  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL 未配置，当前环境无法写入资源库。")
  }

  await requireModel(modelId)

  await db.delete(models).where(eq(models.id, modelId))
}

export async function setResourceModelAvatar(
  actor: AppUser,
  input: {
    modelId: string
    avatarUrl: string
  }
) {
  assertCanManageAllResources(actor)

  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL 未配置，当前环境无法写入资源库。")
  }

  await requireModel(input.modelId)

  await db
    .update(models)
    .set({
      avatarUrl: normalizeOptionalText(input.avatarUrl),
    })
    .where(eq(models.id, input.modelId))
}

export async function createResourceProduct(
  actor: AppUser,
  input: CreateProductInput
) {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL 未配置，当前环境无法写入资源库。")
  }

  const validatedInput = validateProductInput(input)
  const ownerUserId =
    actor.role === "user"
      ? actor.id
      : validatedInput.ownerUserId ?? (() => {
          throw new Error("请选择商品所属用户。")
        })()

  await requireAssignableOwner(ownerUserId)

  await db.insert(resourceProducts).values({
    name: validatedInput.name,
    brand: validatedInput.brand,
    sku: validatedInput.sku,
    imageUrl: validatedInput.imageUrl,
    description: validatedInput.description,
    ownerUserId,
    updatedAt: new Date(),
  })
}

export async function updateResourceProduct(
  actor: AppUser,
  input: UpdateProductInput
) {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL 未配置，当前环境无法写入资源库。")
  }

  const product = await requireProductForMutation(input.id)
  const validatedInput = validateProductInput(input)

  if (actor.role === "user" && product.ownerUserId !== actor.id) {
    throw new Error("你只能维护自己的商品资源。")
  }

  const ownerUserId =
    actor.role === "user"
      ? actor.id
      : validatedInput.ownerUserId ?? product.ownerUserId

  await requireAssignableOwner(ownerUserId)

  await db
    .update(resourceProducts)
    .set({
      name: validatedInput.name,
      brand: validatedInput.brand,
      sku: validatedInput.sku,
      imageUrl: validatedInput.imageUrl,
      description: validatedInput.description,
      ownerUserId,
      updatedAt: new Date(),
    })
    .where(
      actor.role === "user"
        ? and(
            eq(resourceProducts.id, input.id),
            eq(resourceProducts.ownerUserId, actor.id)
          )
        : eq(resourceProducts.id, input.id)
    )
}

export async function deleteResourceProduct(actor: AppUser, productId: string) {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL 未配置，当前环境无法写入资源库。")
  }

  const product = await requireProductForMutation(productId)

  if (actor.role === "user" && product.ownerUserId !== actor.id) {
    throw new Error("你只能删除自己的商品资源。")
  }

  await db
    .delete(resourceProducts)
    .where(
      actor.role === "user"
        ? and(
            eq(resourceProducts.id, productId),
            eq(resourceProducts.ownerUserId, actor.id)
          )
        : eq(resourceProducts.id, productId)
    )
}

export async function createResourceInstruction(
  actor: AppUser,
  input: CreateInstructionInput
) {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL 未配置，当前环境无法写入资源库。")
  }

  const validatedInput = validateInstructionInput(input)

  await db.insert(resourceInstructions).values({
    title: validatedInput.title,
    category: validatedInput.category,
    content: validatedInput.content,
    createdByUserId: resolveActorUserId(actor),
    updatedAt: new Date(),
  })
}

export async function updateResourceInstruction(
  actor: AppUser,
  input: UpdateInstructionInput
) {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL 未配置，当前环境无法写入资源库。")
  }

  const instruction = await requireInstruction(input.id)

  if (
    actor.role === "user" &&
    instruction.createdByUserId !== actor.id
  ) {
    throw new Error("你只能编辑自己创建的提示词。")
  }

  const validatedInput = validateInstructionInput(input)

  await db
    .update(resourceInstructions)
    .set({
      title: validatedInput.title,
      category: validatedInput.category,
      content: validatedInput.content,
      updatedAt: new Date(),
    })
    .where(eq(resourceInstructions.id, input.id))
}

export async function deleteResourceInstruction(
  actor: AppUser,
  instructionId: string
) {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL 未配置，当前环境无法写入资源库。")
  }

  const instruction = await requireInstruction(instructionId)

  if (
    actor.role === "user" &&
    instruction.createdByUserId !== actor.id
  ) {
    throw new Error("你只能删除自己创建的提示词。")
  }

  await db
    .delete(resourceInstructions)
    .where(eq(resourceInstructions.id, instructionId))
}

export async function createGeneratedImages(
  actor: AppUser,
  inputs: CreateGeneratedImageInput[]
) {
  assertCanManageAllResources(actor)

  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL 未配置，当前环境无法写入生成记录。")
  }

  if (!inputs.length) {
    return []
  }

  for (const input of inputs) {
    if (input.modelId) {
      await requireModel(input.modelId)
    }

    if (input.productId) {
      await requireProductForMutation(input.productId)
    }
  }

  return db
    .insert(images)
    .values(
      inputs.map((input) => ({
        modelId: input.modelId ?? null,
        productId: input.productId ?? null,
        imageUrl: input.imageUrl,
        prompt: normalizeOptionalText(input.prompt),
        sourceType: normalizeOptionalText(input.sourceType) ?? "generated",
        generationMode:
          normalizeOptionalText(input.generationMode) ?? "text-to-image",
        assetCategory:
          normalizeOptionalText(input.assetCategory) ?? "retouch",
        variantLabel: normalizeOptionalText(input.variantLabel),
        referenceImageUrls: JSON.stringify(input.referenceImageUrls ?? []),
        createdByUserId: resolveActorUserId(actor),
      }))
    )
    .returning({
      id: images.id,
      imageUrl: images.imageUrl,
    })
}

export async function setGeneratedImageCategory(
  actor: AppUser,
  input: {
    imageId: string
    category: string
  }
) {
  assertCanManageAllResources(actor)

  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL 未配置，当前环境无法写入生成记录。")
  }

  const category = normalizeOptionalText(input.category)

  if (!category) {
    throw new Error("请选择作品分类。")
  }

  await db
    .update(images)
    .set({
      assetCategory: category,
    })
    .where(eq(images.id, input.imageId))
}
