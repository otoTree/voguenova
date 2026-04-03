"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import type {
  ResourceGeneratedImage,
  ResourceInstruction,
  ResourceLibrarySnapshot,
  ResourceModel,
  ResourceProduct,
  ResourceVideoGeneration,
  ResourceVideoProject,
  ResourceVideoProjectSummary,
} from "@/lib/resource-system"
import {
  createInstructionAction,
  createModelAction,
  createProductAction,
  deleteInstructionAction,
  deleteModelAction,
  deleteProductAction,
  setGeneratedImageCategoryAction,
  setModelAvatarAction,
  updateInstructionAction,
  updateModelAction,
  updateProductAction,
} from "./actions"

const LIGHTING_PRESETS = [
  {
    id: "clean-softbox",
    label: "Clean Softbox",
    prompt:
      "灯光：主灯采用柔光箱正面偏上打光，辅以弱补光，阴影干净，皮肤通透，高级电商质感。",
  },
  {
    id: "editorial-side",
    label: "Editorial Side",
    prompt:
      "灯光：侧逆光塑造轮廓，高反差但不过曝，保留面部细节，强调时尚大片氛围。",
  },
  {
    id: "luxury-window",
    label: "Luxury Window",
    prompt:
      "灯光：模拟落地窗自然光，漫反射柔和，空间通透，整体高级、真实、克制。",
  },
]

const CAMERA_PRESETS = [
  {
    id: "ecommerce-85",
    label: "85mm 电商特写",
    prompt:
      "镜头：85mm 定焦，f/4，眼平视角，主体清晰，商品与人物同时具备商业可读性。",
  },
  {
    id: "editorial-50",
    label: "50mm 时尚平衡",
    prompt:
      "镜头：50mm 标准镜头，f/2.8，中景构图，比例自然，适合服饰与美妆风格呈现。",
  },
  {
    id: "campaign-35",
    label: "35mm 场景广告",
    prompt:
      "镜头：35mm 广角，f/5.6，轻微环境交代，保留空间层次，适合 campaign 画面。",
  },
]

type StudioMode = "text-to-image" | "image-to-image"
type BatchPlan = "single" | "triple" | "quad"
type StudioWorkspaceMode = "video" | "image"
type VideoSoundMode = "on" | "off"
type VideoAspectRatio = "16:9" | "9:16" | "1:1"

interface StoryboardScene {
  id: string
  title: string
  duration: number
  visualPrompt: string
  camera: string
  motion: string
  transition: string
  voiceover: string
  referenceUrls: string[]
  soundMode: VideoSoundMode
  aspectRatio: VideoAspectRatio
}

interface GeneratedVariantResult {
  label: string
  imageUrl: string
  sourceImageUrl: string
  prompt: string
  mode: StudioMode
}

interface VideoReferenceOption {
  id: string
  label: string
  url: string
  category: string
  isDefault: boolean
}

interface VideoGenerationTask {
  sceneId: string
  sceneTitle: string
  duration: number
  prompt: string
  taskId: string
  status: string
  progress: number | null
  videoUrl: string | null
  error: string | null
}

const IMAGE_CATEGORY_OPTIONS = [
  { value: "retouch", label: "精修图" },
  { value: "cover_candidate", label: "封面候选" },
  { value: "training", label: "训练图" },
  { value: "campaign", label: "商拍图" },
  { value: "discarded", label: "废弃图" },
]

const VIDEO_ASPECT_OPTIONS = [
  { value: "16:9", label: "16:9 横版" },
  { value: "9:16", label: "9:16 竖版" },
  { value: "1:1", label: "1:1 方版" },
]

const VIDEO_SOUND_OPTIONS = [
  { value: "on", label: "保留环境声" },
  { value: "off", label: "静音片段" },
]

function createSceneId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `scene-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function clampSceneDuration(value: number) {
  return Math.min(12, Math.max(1, Math.round(value || 0)))
}

function createStoryboardScene(
  index: number,
  overrides: Partial<StoryboardScene> = {}
): StoryboardScene {
  return {
    id: overrides.id ?? createSceneId(),
    title: overrides.title ?? `镜头 ${index + 1}`,
    duration: clampSceneDuration(overrides.duration ?? 4),
    visualPrompt: overrides.visualPrompt ?? "",
    camera: overrides.camera ?? "",
    motion: overrides.motion ?? "",
    transition: overrides.transition ?? "",
    voiceover: overrides.voiceover ?? "",
    referenceUrls: overrides.referenceUrls ?? [],
    soundMode: overrides.soundMode ?? "off",
    aspectRatio: overrides.aspectRatio ?? "9:16",
  }
}

function extractJsonPayload(input: string) {
  const fencedMatch = input.match(/```json\s*([\s\S]*?)```/i)
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim()
  }

  const firstBrace = input.indexOf("{")
  const lastBrace = input.lastIndexOf("}")

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return input.slice(firstBrace, lastBrace + 1)
  }

  return input.trim()
}

function parseStoryboardScenes(input: string) {
  const payload = JSON.parse(extractJsonPayload(input)) as {
    title?: string
    brief?: string
    shots?: Array<Partial<StoryboardScene> & { prompt?: string }>
  }
  const shots = Array.isArray(payload.shots) ? payload.shots : []

  if (!shots.length) {
    throw new Error("AI 未返回可用的分镜脚本。")
  }

  return {
    title: String(payload.title ?? "").trim(),
    brief: String(payload.brief ?? "").trim(),
    scenes: shots.map((shot, index) =>
      createStoryboardScene(index, {
        title: String(shot.title ?? "").trim() || `镜头 ${index + 1}`,
        duration: Number(shot.duration ?? 4),
        visualPrompt: String(shot.visualPrompt ?? shot.prompt ?? "").trim(),
        camera: String(shot.camera ?? "").trim(),
        motion: String(shot.motion ?? "").trim(),
        transition: String(shot.transition ?? "").trim(),
        voiceover: String(shot.voiceover ?? "").trim(),
        referenceUrls: [],
        soundMode:
          shot.soundMode === "on" || shot.soundMode === "off" ? shot.soundMode : "off",
        aspectRatio:
          shot.aspectRatio === "16:9" ||
          shot.aspectRatio === "9:16" ||
          shot.aspectRatio === "1:1"
            ? shot.aspectRatio
            : "9:16",
      })
    ),
  }
}

function buildStoryboardPrompt({
  title,
  brief,
  scenesCount,
  selectedModel,
  selectedProduct,
  selectedInstructions,
  referenceLabels,
}: {
  title: string
  brief: string
  scenesCount: number
  selectedModel?: ResourceModel
  selectedProduct?: ResourceProduct
  selectedInstructions: ResourceInstruction[]
  referenceLabels: string[]
}) {
  return joinPromptBlocks([
    `目标：为参考图驱动的视频生成设计 ${scenesCount} 个可直接执行的分镜镜头，输出镜头级脚本。`,
    title ? `项目名：${title}` : "",
    brief ? `视频需求：${brief}` : "",
    buildModelPrompt(selectedModel),
    buildProductPrompt(selectedProduct),
    buildInstructionPrompt(selectedInstructions),
    referenceLabels.length
      ? `可用参考素材：${referenceLabels.join("、")}。分镜内容必须围绕这些素材可表达的主体展开。`
      : "当前没有额外参考素材，请优先保证主体动作与商品表达简单明确。",
    [
      "请只返回 JSON，不要附加解释。",
      'JSON 结构：{"title":"", "brief":"", "shots":[{"title":"","duration":4,"visualPrompt":"","camera":"","motion":"","transition":"","voiceover":"","soundMode":"off","aspectRatio":"9:16"}]}',
      "duration 使用整数秒，建议 2-6 秒。",
      'soundMode 只允许 "on" 或 "off"。',
      'aspectRatio 只允许 "16:9"、"9:16"、"1:1"。',
      "visualPrompt 要适合视频模型直接生成，强调主体、场景、服装、商品、光线与风格。",
      "camera 描述机位与构图，motion 描述人物或镜头运动，transition 描述与下一镜头的连接方式。",
    ].join("\n"),
  ])
}

function buildSceneVideoPrompt({
  title,
  brief,
  scene,
  selectedModel,
  selectedProduct,
  selectedInstructions,
}: {
  title: string
  brief: string
  scene: StoryboardScene
  selectedModel?: ResourceModel
  selectedProduct?: ResourceProduct
  selectedInstructions: ResourceInstruction[]
}) {
  return joinPromptBlocks([
    "目标：基于参考图输出商业级视频镜头，保证主体与产品形象稳定，运动自然，细节干净。",
    title ? `项目名：${title}` : "",
    brief ? `总述：${brief}` : "",
    `镜头标题：${scene.title}`,
    `镜头时长：${scene.duration} 秒`,
    `声音开关：${scene.soundMode}`,
    `视频比例：${scene.aspectRatio}`,
    scene.visualPrompt ? `镜头提示：${scene.visualPrompt}` : "",
    scene.camera ? `机位构图：${scene.camera}` : "",
    scene.motion ? `镜头运动：${scene.motion}` : "",
    scene.transition ? `镜头衔接：${scene.transition}` : "",
    scene.voiceover ? `旁白节奏：${scene.voiceover}` : "",
    buildModelPrompt(selectedModel),
    buildProductPrompt(selectedProduct),
    buildInstructionPrompt(selectedInstructions),
  ])
}

function composeScenePromptInput(scene: StoryboardScene) {
  if (!scene.camera && !scene.motion && !scene.transition && !scene.voiceover) {
    return scene.visualPrompt
  }

  return joinPromptBlocks([
    scene.visualPrompt ? `画面提示：${scene.visualPrompt}` : "",
    scene.camera ? `机位构图：${scene.camera}` : "",
    scene.motion ? `运动描述：${scene.motion}` : "",
    scene.transition ? `转场：${scene.transition}` : "",
    scene.voiceover ? `旁白：${scene.voiceover}` : "",
  ])
}

function appendPromptBlock(base: string, block: string) {
  return joinPromptBlocks([base, block])
}

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

function mapProjectTaskToVideoTask(task: ResourceVideoGeneration): VideoGenerationTask {
  return {
    sceneId: task.sceneId,
    sceneTitle: "",
    duration: task.duration,
    prompt: String(task.prompt ?? ""),
    taskId: task.taskId,
    status: normalizeVideoStatus(task.status),
    progress: typeof task.progress === "number" ? Number(task.progress) : null,
    videoUrl: String(task.videoUrl ?? "").trim() || null,
    error: String(task.errorMessage ?? "").trim() || null,
  }
}

function buildProjectDraftSignature(input: {
  projectId: string | null
  title: string
  brief: string
  selectedModelId: string
  selectedProductId: string
  selectedInstructionIds: string[]
  externalReferenceUrls: string[]
  scenes: StoryboardScene[]
}) {
  return JSON.stringify({
    projectId: input.projectId,
    title: input.title.trim(),
    brief: input.brief.trim(),
    selectedModelId: input.selectedModelId,
    selectedProductId: input.selectedProductId,
    selectedInstructionIds: [...input.selectedInstructionIds].sort(),
    externalReferenceUrls: [...input.externalReferenceUrls].sort(),
    scenes: input.scenes.map((scene, index) => ({
      id: scene.id,
      sortOrder: index,
      title: scene.title.trim(),
      duration: scene.duration,
      visualPrompt: scene.visualPrompt.trim(),
      camera: scene.camera.trim(),
      motion: scene.motion.trim(),
      transition: scene.transition.trim(),
      voiceover: scene.voiceover.trim(),
      referenceUrls: [...scene.referenceUrls].sort(),
      soundMode: scene.soundMode,
      aspectRatio: scene.aspectRatio,
    })),
  })
}

const RESOURCE_DATE_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return RESOURCE_DATE_FORMATTER.format(date)
}

function formatRelativeTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000))

  if (diffMinutes < 1) {
    return "刚刚"
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} 分钟前`
  }

  const diffHours = Math.floor(diffMinutes / 60)

  if (diffHours < 24) {
    return `${diffHours} 小时前`
  }

  const diffDays = Math.floor(diffHours / 24)

  if (diffDays < 7) {
    return `${diffDays} 天前`
  }

  return formatDate(value)
}

function getProjectStatusLabel(status: string) {
  switch (status) {
    case "processing":
      return "生成中"
    case "ready":
      return "已就绪"
    case "needs_attention":
      return "待处理"
    default:
      return "草稿"
  }
}

function selectClassName() {
  return "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
}

function previewClassName(aspectClassName: string, imageUrl?: string | null) {
  return `${aspectClassName} overflow-hidden rounded-2xl border bg-muted ${
    imageUrl ? "bg-cover bg-center" : "bg-muted"
  }`
}

function joinPromptBlocks(blocks: Array<string | null | undefined>) {
  return blocks
    .map((block) => String(block ?? "").trim())
    .filter(Boolean)
    .join("\n\n")
}

function buildModelPrompt(model?: ResourceModel) {
  if (!model) {
    return ""
  }

  return joinPromptBlocks([
    `模特设定：${model.name}`,
    `风格标签：${model.style}`,
    model.backstory ? `人设描述：${model.backstory}` : "",
  ])
}

function buildProductPrompt(product?: ResourceProduct) {
  if (!product) {
    return ""
  }

  return joinPromptBlocks([
    `商品名称：${product.name}`,
    product.brand ? `品牌：${product.brand}` : "",
    product.sku ? `SKU：${product.sku}` : "",
    product.description ? `商品卖点：${product.description}` : "",
  ])
}

function buildInstructionPrompt(instructions: ResourceInstruction[]) {
  return instructions
    .map((instruction) =>
      joinPromptBlocks([
        `提示词模块：${instruction.title}`,
        `分类：${instruction.category}`,
        instruction.content,
      ])
    )
    .join("\n\n")
}

function canEditInstruction(
  instruction: ResourceInstruction,
  canManageAll: boolean
) {
  return canManageAll || Boolean(instruction.creatorUserId)
}

function getImageCategoryLabel(category: string) {
  return (
    IMAGE_CATEGORY_OPTIONS.find((item) => item.value === category)?.label ??
    "未分类"
  )
}

function getLightingPreset(id: string) {
  return LIGHTING_PRESETS.find((item) => item.id === id) ?? LIGHTING_PRESETS[0]
}

function getCameraPreset(id: string) {
  return CAMERA_PRESETS.find((item) => item.id === id) ?? CAMERA_PRESETS[0]
}

function buildVariantPlans({
  basePrompt,
  lightingId,
  cameraId,
  batchPlan,
}: {
  basePrompt: string
  lightingId: string
  cameraId: string
  batchPlan: BatchPlan
}) {
  const selectedLighting = getLightingPreset(lightingId)
  const selectedCamera = getCameraPreset(cameraId)
  const selectedLightingIndex = LIGHTING_PRESETS.findIndex(
    (item) => item.id === selectedLighting.id
  )
  const selectedCameraIndex = CAMERA_PRESETS.findIndex(
    (item) => item.id === selectedCamera.id
  )
  const lightingOptions = [
    selectedLighting,
    ...LIGHTING_PRESETS.filter((item) => item.id !== selectedLighting.id),
  ]
  const cameraOptions = [
    selectedCamera,
    ...CAMERA_PRESETS.filter((item) => item.id !== selectedCamera.id),
  ]
  const combos = [
    {
      label: "Hero 主方案",
      lighting: selectedLighting,
      camera: selectedCamera,
    },
    {
      label: "Light Shift 01",
      lighting:
        LIGHTING_PRESETS[(selectedLightingIndex + 1) % LIGHTING_PRESETS.length],
      camera: selectedCamera,
    },
    {
      label: "Camera Shift 01",
      lighting: selectedLighting,
      camera:
        CAMERA_PRESETS[(selectedCameraIndex + 1) % CAMERA_PRESETS.length],
    },
    {
      label: "Campaign Alt 01",
      lighting: lightingOptions[1] ?? selectedLighting,
      camera: cameraOptions[1] ?? selectedCamera,
    },
  ]
  const targetSize =
    batchPlan === "quad" ? 4 : batchPlan === "triple" ? 3 : 1

  return combos.slice(0, targetSize).map((combo) => ({
    label: combo.label,
    prompt: joinPromptBlocks([
      basePrompt,
      combo.lighting?.prompt,
      combo.camera?.prompt,
    ]),
  }))
}

function HistoryCard({
  item,
  canManageAll,
}: {
  item: ResourceGeneratedImage
  canManageAll: boolean
}) {
  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4">
      <AssetPreview
        imageUrl={item.imageUrl}
        aspectClassName="aspect-square"
        fallback="HISTORY"
      />
      <div className="space-y-2">
        <GeneratedImageActionBar item={item} canManageAll={canManageAll} />
        <p className="text-sm text-muted-foreground">
          {item.modelName || item.productName
            ? [item.modelName, item.productName].filter(Boolean).join(" · ")
            : "未绑定资源"}
        </p>
        <p className="line-clamp-4 text-xs text-muted-foreground">
          {item.prompt ?? "无提示词记录"}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{item.creatorName ?? "系统"}</span>
          <span>{formatDate(item.createdAt)}</span>
        </div>
      </div>
    </div>
  )
}

function GeneratedImageActionBar({
  item,
  canManageAll,
}: {
  item: ResourceGeneratedImage
  canManageAll: boolean
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{getImageCategoryLabel(item.assetCategory)}</Badge>
        {item.variantLabel ? <Badge>{item.variantLabel}</Badge> : null}
        <Badge variant="outline">
          {item.generationMode === "image-to-image" ? "图生图" : "文生图"}
        </Badge>
      </div>
      {canManageAll && item.modelId ? (
        <div className="grid gap-2">
          <form action={setModelAvatarAction}>
            <input type="hidden" name="modelId" value={item.modelId} />
            <input type="hidden" name="imageUrl" value={item.imageUrl} />
            <Button type="submit" size="sm" variant="outline" className="w-full">
              设为模特封面
            </Button>
          </form>
          <form action={setGeneratedImageCategoryAction} className="grid gap-2">
            <input type="hidden" name="imageId" value={item.id} />
            <select
              name="category"
              defaultValue={item.assetCategory}
              className={selectClassName()}
            >
              {IMAGE_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm" variant="outline" className="w-full">
              更新分类
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  )
}

function ModelPortfolioDialog({
  model,
  images,
  canManageAll,
  onContinueWithReferences,
}: {
  model: ResourceModel
  images: ResourceGeneratedImage[]
  canManageAll: boolean
  onContinueWithReferences: (imageUrls: string[]) => void
}) {
  const [selectedCategory, setSelectedCategory] = React.useState("all")
  const [selectedImageUrls, setSelectedImageUrls] = React.useState<string[]>([])

  const filteredImages = React.useMemo(
    () =>
      selectedCategory === "all"
        ? images
        : images.filter((item) => item.assetCategory === selectedCategory),
    [images, selectedCategory]
  )

  function toggleImageSelection(imageUrl: string) {
    setSelectedImageUrls((current) =>
      current.includes(imageUrl)
        ? current.filter((item) => item !== imageUrl)
        : [...current, imageUrl]
    )
  }

  return (
    <Dialog>
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
        查看作品集
      </DialogTrigger>
      <DialogContent className="h-[88vh] w-[96vw] max-w-[96vw] p-0 xl:max-w-7xl">
        <div className="border-b p-6">
          <DialogTitle>{model.name} · 模特详情</DialogTitle>
          <DialogDescription className="mt-2">
            模特档案与作品集分离管理，封面图只是入口，生成图会持续沉淀为该模特的视觉资产。
          </DialogDescription>
        </div>

        <div className="grid h-[calc(88vh-89px)] gap-6 overflow-y-auto p-6">
          <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-4">
              <AssetPreview
                imageUrl={model.avatarUrl}
                aspectClassName="aspect-[4/5]"
                fallback="MODEL"
              />
              <div className="space-y-2 rounded-2xl border bg-muted/20 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-heading">{model.name}</h3>
                  <Badge variant="secondary">{model.style}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {model.backstory ?? "暂无人设描述"}
                </p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>负责人：{model.assignedOperatorName ?? "未分配"}</p>
                  <p>累计作品：{images.length} 张</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={selectedCategory === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory("all")}
                  >
                    全部
                  </Button>
                  {IMAGE_CATEGORY_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={selectedCategory === option.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onContinueWithReferences(selectedImageUrls)}
                  disabled={selectedImageUrls.length === 0}
                >
                  选中 {selectedImageUrls.length} 张继续图生图
                </Button>
              </div>

              {filteredImages.length ? (
                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {filteredImages.map((item) => {
                    const isSelected = selectedImageUrls.includes(item.imageUrl)

                    return (
                      <div
                        key={item.id}
                        className={`space-y-3 rounded-2xl border p-3 ${
                          isSelected ? "border-primary bg-primary/5" : "bg-card"
                        }`}
                      >
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => toggleImageSelection(item.imageUrl)}
                        >
                          <AssetPreview
                            imageUrl={item.imageUrl}
                            aspectClassName="aspect-square"
                            fallback="SHOT"
                          />
                        </button>
                        <GeneratedImageActionBar
                          item={item}
                          canManageAll={canManageAll}
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{item.creatorName ?? "系统"}</span>
                          <span>{formatDate(item.createdAt)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
                  当前分类下暂无作品。
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function AssetPreview({
  imageUrl,
  aspectClassName,
  fallback,
}: {
  imageUrl?: string | null
  aspectClassName: string
  fallback: string
}) {
  return (
    <div
      className={previewClassName(aspectClassName, imageUrl)}
      style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
    >
      {!imageUrl ? (
        <div className="flex h-full items-center justify-center text-xs tracking-[0.2em] text-muted-foreground uppercase">
          {fallback}
        </div>
      ) : null}
    </div>
  )
}

function VideoStudio({
  snapshot,
  canGenerate,
  externalReferenceUrls,
  selectedModelId,
  selectedProductId,
  selectedInstructionIds,
  onSelectModel,
  onSelectProduct,
  onSetExternalReferenceUrls,
  onSetSelectedInstructionIds,
}: {
  snapshot: ResourceLibrarySnapshot
  canGenerate: boolean
  externalReferenceUrls: string[]
  selectedModelId: string
  selectedProductId: string
  selectedInstructionIds: string[]
  onSelectModel: (value: string) => void
  onSelectProduct: (value: string) => void
  onSetExternalReferenceUrls: (value: string[]) => void
  onSetSelectedInstructionIds: (value: string[]) => void
}) {
  const selectedModel = React.useMemo(
    () => snapshot.models.find((item) => item.id === selectedModelId),
    [snapshot.models, selectedModelId]
  )
  const selectedProduct = React.useMemo(
    () => snapshot.products.find((item) => item.id === selectedProductId),
    [snapshot.products, selectedProductId]
  )
  const selectedInstructions = React.useMemo(
    () =>
      snapshot.instructions.filter((instruction) =>
        selectedInstructionIds.includes(instruction.id)
      ),
    [selectedInstructionIds, snapshot.instructions]
  )
  const availableReferences = React.useMemo<VideoReferenceOption[]>(() => {
    const items: VideoReferenceOption[] = []
    const pushReference = (
      url: string | null | undefined,
      label: string,
      category: string,
      isDefault: boolean
    ) => {
      const normalized = String(url ?? "").trim()
      if (!normalized || items.some((item) => item.url === normalized)) {
        return
      }
      items.push({
        id: `${category}-${items.length + 1}`,
        label,
        url: normalized,
        category,
        isDefault,
      })
    }

    pushReference(selectedModel?.avatarUrl, selectedModel?.name || "模特参考", "model", true)
    pushReference(
      selectedProduct?.imageUrl,
      selectedProduct?.name || "产品参考",
      "product",
      true
    )
    externalReferenceUrls.forEach((item, index) => {
      pushReference(item, `作品参考 ${index + 1}`, "portfolio", true)
    })
    snapshot.generatedImages.slice(0, 8).forEach((item, index) => {
      pushReference(
        item.imageUrl,
        item.variantLabel || item.modelName || item.productName || `历史参考 ${index + 1}`,
        "history",
        false
      )
    })

    return items
  }, [
    externalReferenceUrls,
    selectedModel?.avatarUrl,
    selectedModel?.name,
    selectedProduct?.imageUrl,
    selectedProduct?.name,
    snapshot.generatedImages,
  ])
  const defaultReferenceUrls = React.useMemo(
    () =>
      availableReferences
        .filter((item) => item.isDefault)
        .map((item) => item.url),
    [availableReferences]
  )
  const [uploadedReferenceFiles, setUploadedReferenceFiles] = React.useState<File[]>([])
  const [projectTitle, setProjectTitle] = React.useState("")
  const [creativeBrief, setCreativeBrief] = React.useState("")
  const [projectSummaries, setProjectSummaries] = React.useState<ResourceVideoProjectSummary[]>([])
  const [projectStatusFilter, setProjectStatusFilter] = React.useState<
    "all" | "draft" | "processing" | "ready" | "needs_attention"
  >("all")
  const [currentProjectId, setCurrentProjectId] = React.useState<string | null>(null)
  const [storyboardScenes, setStoryboardScenes] = React.useState<StoryboardScene[]>([])
  const [activeSceneId, setActiveSceneId] = React.useState<string | null>(null)
  const [draggingSceneId, setDraggingSceneId] = React.useState<string | null>(null)
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = React.useState(false)
  const [isLoadingProject, setIsLoadingProject] = React.useState(false)
  const [isSavingProject, setIsSavingProject] = React.useState(false)
  const [autoSaveMessage, setAutoSaveMessage] = React.useState("")
  const [lastAutoSavedAt, setLastAutoSavedAt] = React.useState<string | null>(null)
  const [storyboardError, setStoryboardError] = React.useState("")
  const [storyboardNotice, setStoryboardNotice] = React.useState("")
  const [videoTasks, setVideoTasks] = React.useState<VideoGenerationTask[]>([])
  const [videoError, setVideoError] = React.useState("")
  const [isSubmittingVideos, setIsSubmittingVideos] = React.useState(false)
  const totalDuration = React.useMemo(
    () => storyboardScenes.reduce((sum, item) => sum + item.duration, 0),
    [storyboardScenes]
  )
  const projectReferenceLabels = React.useMemo(
    () => availableReferences.map((item) => item.label),
    [availableReferences]
  )
  const promptLibraryItems = React.useMemo(
    () => (selectedInstructions.length ? selectedInstructions : snapshot.instructions),
    [selectedInstructions, snapshot.instructions]
  )
  const completedTasks = React.useMemo(
    () =>
      storyboardScenes
        .map((scene) => videoTasks.find((item) => item.sceneId === scene.id))
        .filter((item): item is VideoGenerationTask => Boolean(item?.videoUrl)),
    [storyboardScenes, videoTasks]
  )
  const filteredProjectSummaries = React.useMemo(
    () =>
      projectStatusFilter === "all"
        ? projectSummaries
        : projectSummaries.filter((item) => item.status === projectStatusFilter),
    [projectStatusFilter, projectSummaries]
  )
  const currentProjectSummary = React.useMemo(
    () => projectSummaries.find((item) => item.id === currentProjectId) ?? null,
    [currentProjectId, projectSummaries]
  )
  const currentDraftSignature = React.useMemo(
    () =>
      buildProjectDraftSignature({
        projectId: currentProjectId,
        title: projectTitle,
        brief: creativeBrief,
        selectedModelId,
        selectedProductId,
        selectedInstructionIds,
        externalReferenceUrls,
        scenes: storyboardScenes,
      }),
    [
      creativeBrief,
      currentProjectId,
      externalReferenceUrls,
      projectTitle,
      selectedInstructionIds,
      selectedModelId,
      selectedProductId,
      storyboardScenes,
    ]
  )
  const [activePreviewSceneId, setActivePreviewSceneId] = React.useState<string | null>(null)
  const hasSeededDefaultSceneReferences = React.useRef(false)
  const shouldSkipNextAutosaveRef = React.useRef(true)
  const lastSavedDraftSignatureRef = React.useRef("")

  const refreshProjectSummaries = React.useCallback(async () => {
    const response = await fetch("/api/resources/video-projects", {
      method: "GET",
    })
    const payload = await response.json()

    if (response.ok && payload.success && Array.isArray(payload.projects)) {
      setProjectSummaries(payload.projects as ResourceVideoProjectSummary[])
    }
  }, [])

  const applyProject = React.useCallback(
    (project: ResourceVideoProject) => {
      shouldSkipNextAutosaveRef.current = true
      setCurrentProjectId(project.id)
      setProjectTitle(project.title)
      setCreativeBrief(project.brief ?? "")
      const nextScenes = project.scenes
        .slice()
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((scene) =>
          createStoryboardScene(scene.sortOrder, {
            id: scene.id,
            title: scene.title,
            duration: scene.duration,
            visualPrompt: scene.visualPrompt,
            camera: scene.camera,
            motion: scene.motion,
            transition: scene.transition,
            voiceover: scene.voiceover,
            referenceUrls: scene.referenceUrls,
            soundMode: scene.soundMode === "on" ? "on" : "off",
            aspectRatio:
              scene.aspectRatio === "16:9" || scene.aspectRatio === "1:1"
                ? scene.aspectRatio
                : "9:16",
          })
        )
      setStoryboardScenes(nextScenes)
      setVideoTasks(
        project.tasks.map((task) => {
          const mappedTask = mapProjectTaskToVideoTask(task)
          const scene = nextScenes.find((item) => item.id === task.sceneId)

          return {
            ...mappedTask,
            sceneTitle: scene?.title ?? mappedTask.sceneTitle,
          }
        })
      )
      lastSavedDraftSignatureRef.current = buildProjectDraftSignature({
        projectId: project.id,
        title: project.title,
        brief: project.brief ?? "",
        selectedModelId: project.selectedModelId ?? "",
        selectedProductId: project.selectedProductId ?? "",
        selectedInstructionIds: project.selectedInstructionIds,
        externalReferenceUrls: project.externalReferenceUrls,
        scenes: nextScenes,
      })
      setLastAutoSavedAt(project.updatedAt)
      setAutoSaveMessage("")
      onSelectModel(project.selectedModelId ?? "")
      onSelectProduct(project.selectedProductId ?? "")
      onSetSelectedInstructionIds(project.selectedInstructionIds)
      onSetExternalReferenceUrls(project.externalReferenceUrls)
    },
    [
      onSelectModel,
      onSelectProduct,
      onSetExternalReferenceUrls,
      onSetSelectedInstructionIds,
    ]
  )

  const saveCurrentProject = React.useCallback(
    async (overrides?: {
      title?: string
      brief?: string
      scenes?: StoryboardScene[]
    }) => {
      const payload = {
        id: currentProjectId ?? undefined,
        title: (overrides?.title ?? projectTitle).trim() || "未命名项目",
        brief: (overrides?.brief ?? creativeBrief).trim(),
        status: "draft",
        selectedModelId: selectedModelId || null,
        selectedProductId: selectedProductId || null,
        selectedInstructionIds,
        externalReferenceUrls,
        scenes: (overrides?.scenes ?? storyboardScenes).map((scene, index) => ({
          id: scene.id,
          sortOrder: index,
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
      }

      setIsSavingProject(true)

      try {
        const response = await fetch("/api/resources/video-projects", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })
        const result = await response.json()

        if (!response.ok || !result.success || !result.project) {
          throw new Error(result.error || "项目保存失败。")
        }

        const project = result.project as ResourceVideoProject
        applyProject(project)
        setStoryboardNotice("项目与分镜已保存。")
        setLastAutoSavedAt(project.updatedAt)
        setAutoSaveMessage("")
        await refreshProjectSummaries()

        return project
      } catch (error) {
        setAutoSaveMessage(error instanceof Error ? error.message : "项目保存失败。")
        throw error
      } finally {
        setIsSavingProject(false)
      }
    },
    [
      applyProject,
      creativeBrief,
      currentProjectId,
      externalReferenceUrls,
      projectTitle,
      selectedInstructionIds,
      selectedModelId,
      selectedProductId,
      storyboardScenes,
      refreshProjectSummaries,
    ]
  )

  React.useEffect(() => {
    setStoryboardScenes((current) =>
      current.map((scene) => ({
        ...scene,
        referenceUrls: scene.referenceUrls.filter((url) =>
          availableReferences.some((item) => item.url === url)
        ),
      }))
    )
  }, [availableReferences, defaultReferenceUrls])

  React.useEffect(() => {
    if (hasSeededDefaultSceneReferences.current || !defaultReferenceUrls.length) {
      return
    }

    hasSeededDefaultSceneReferences.current = true
    setStoryboardScenes((current) =>
      current.map((scene) =>
        scene.referenceUrls.length
          ? scene
          : {
              ...scene,
              referenceUrls: defaultReferenceUrls,
            }
      )
    )
  }, [defaultReferenceUrls])

  React.useEffect(() => {
    if (!storyboardScenes.length) {
      setActiveSceneId(null)
      return
    }

    if (!activeSceneId || !storyboardScenes.some((scene) => scene.id === activeSceneId)) {
      setActiveSceneId(storyboardScenes[0]?.id ?? null)
    }
  }, [activeSceneId, storyboardScenes])

  React.useEffect(() => {
    if (!completedTasks.length) {
      setActivePreviewSceneId(null)
      return
    }

    if (
      !activePreviewSceneId ||
      !completedTasks.some((item) => item.sceneId === activePreviewSceneId)
    ) {
      setActivePreviewSceneId(completedTasks[0]?.sceneId ?? null)
    }
  }, [activePreviewSceneId, completedTasks])

  React.useEffect(() => {
    let isCancelled = false

    async function loadProjects() {
      try {
        setIsLoadingProject(true)

        const response = await fetch("/api/resources/video-projects", {
          method: "GET",
        })
        const payload = await response.json()

        if (!response.ok || !payload.success || !Array.isArray(payload.projects) || isCancelled) {
          return
        }

        const projects = payload.projects as ResourceVideoProjectSummary[]
        setProjectSummaries(projects)

        const firstProjectId = projects[0]?.id

        if (!firstProjectId) {
          return
        }

        const detailResponse = await fetch(
          `/api/resources/video-projects?projectId=${encodeURIComponent(firstProjectId)}`,
          {
            method: "GET",
          }
        )
        const detailPayload = await detailResponse.json()

        if (!detailResponse.ok || !detailPayload.success || !detailPayload.project || isCancelled) {
          return
        }

        applyProject(detailPayload.project as ResourceVideoProject)
      } catch {
        // Ignore project restore failures and keep the studio usable with local state only.
      } finally {
        if (!isCancelled) {
          setIsLoadingProject(false)
        }
      }
    }

    void loadProjects()

    return () => {
      isCancelled = true
    }
  }, [applyProject])

  React.useEffect(() => {
    if (isLoadingProject || isSavingProject || isSubmittingVideos) {
      return
    }

    if (shouldSkipNextAutosaveRef.current) {
      shouldSkipNextAutosaveRef.current = false
      return
    }

    if (currentDraftSignature === lastSavedDraftSignatureRef.current) {
      return
    }

    setAutoSaveMessage("草稿待保存...")

    const timer = window.setTimeout(() => {
      void saveCurrentProject().catch(() => undefined)
    }, 1500)

    return () => window.clearTimeout(timer)
  }, [
    currentDraftSignature,
    isLoadingProject,
    isSavingProject,
    isSubmittingVideos,
    saveCurrentProject,
  ])

  React.useEffect(() => {
    if (!currentProjectId) {
      return
    }

    const pendingTasks = videoTasks.filter((task) => task.status === "processing")

    if (!pendingTasks.length) {
      return
    }

    const timer = window.setInterval(async () => {
      const responses = await Promise.all(
        pendingTasks.map(async (task) => {
          try {
            const response = await fetch(
              `/api/resources/generate-video?projectId=${encodeURIComponent(
                currentProjectId
              )}&sceneId=${encodeURIComponent(task.sceneId)}&taskId=${encodeURIComponent(
                task.taskId
              )}`,
              {
                method: "GET",
              }
            )
            const payload = await response.json()

            if (!response.ok || !payload.success) {
              throw new Error(payload.error || "视频状态查询失败。")
            }

            return {
              sceneId: task.sceneId,
              status: normalizeVideoStatus(String(payload.status ?? "")),
              progress:
                typeof payload.progress === "number" ? Number(payload.progress) : null,
              videoUrl: String(payload.videoUrl ?? "").trim() || null,
              error:
                String(payload.errorMessage ?? "").trim() ||
                (normalizeVideoStatus(String(payload.status ?? "")) === "failed"
                  ? "视频任务执行失败，建议检查参考图公网可访问性、比例和声音参数。"
                  : ""),
            }
          } catch (error: unknown) {
            return {
              sceneId: task.sceneId,
              status: "failed",
              progress: null,
              videoUrl: null,
              error: error instanceof Error ? error.message : "视频状态查询失败。",
            }
          }
        })
      )

      setVideoTasks((current) =>
        current.map((task) => {
          const matched = responses.find((item) => item.sceneId === task.sceneId)
          if (!matched) {
            return task
          }

          return {
            ...task,
            status: matched.status,
            progress: matched.progress,
            videoUrl: matched.videoUrl ?? task.videoUrl,
            error: matched.error || task.error,
          }
        })
      )
    }, 30000)

    return () => window.clearInterval(timer)
  }, [currentProjectId, videoTasks])

  const activeScene = React.useMemo(
    () => storyboardScenes.find((item) => item.id === activeSceneId) ?? null,
    [activeSceneId, storyboardScenes]
  )
  const activeSceneIndex = React.useMemo(
    () => storyboardScenes.findIndex((item) => item.id === activeSceneId),
    [activeSceneId, storyboardScenes]
  )
  const activePreviewTask = React.useMemo(
    () => completedTasks.find((item) => item.sceneId === activePreviewSceneId) ?? null,
    [activePreviewSceneId, completedTasks]
  )
  const activeSceneTask = React.useMemo(
    () => videoTasks.find((item) => item.sceneId === activeScene?.id) ?? null,
    [activeScene?.id, videoTasks]
  )

  const activeSceneReferenceLabels = React.useMemo(
    () =>
      availableReferences
        .filter((item) => activeScene?.referenceUrls.includes(item.url))
        .map((item) => item.label),
    [activeScene?.referenceUrls, availableReferences]
  )

  function updateScene(sceneId: string, updates: Partial<StoryboardScene>) {
    setStoryboardScenes((current) =>
      current.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              ...updates,
              duration:
                typeof updates.duration === "number"
                  ? clampSceneDuration(updates.duration)
                  : scene.duration,
            }
          : scene
      )
    )
  }

  function reorderScenes(sourceId: string, targetId: string) {
    if (!sourceId || !targetId || sourceId === targetId) {
      return
    }

    setStoryboardScenes((current) => {
      const sourceIndex = current.findIndex((item) => item.id === sourceId)
      const targetIndex = current.findIndex((item) => item.id === targetId)

      if (sourceIndex < 0 || targetIndex < 0) {
        return current
      }

      const next = [...current]
      const [moved] = next.splice(sourceIndex, 1)
      next.splice(targetIndex, 0, moved)
      return next
    })
  }

  function removeScene(sceneId: string) {
    setStoryboardScenes((current) => current.filter((scene) => scene.id !== sceneId))
    setVideoTasks((current) => current.filter((task) => task.sceneId !== sceneId))
  }

  function addScene() {
    setStoryboardScenes((current) => [
      ...current,
      createStoryboardScene(current.length, {
        title: `镜头 ${current.length + 1}`,
        referenceUrls: defaultReferenceUrls,
      }),
    ])
  }

  function toggleReferenceForScene(sceneId: string, url: string) {
    setStoryboardScenes((current) =>
      current.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              referenceUrls: scene.referenceUrls.includes(url)
                ? scene.referenceUrls.filter((item) => item !== url)
                : [...scene.referenceUrls, url],
            }
          : scene
      )
    )
  }

  async function handleGenerateStoryboard() {
    setIsGeneratingStoryboard(true)
    setStoryboardError("")
    setStoryboardNotice("")

    try {
      const response = await fetch("/api/llm/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content:
                "你是专业广告导演与分镜师，必须根据用户提供的提示词模块和素材约束输出可执行的 JSON 分镜脚本。",
            },
            {
              role: "user",
              content: buildStoryboardPrompt({
                title: projectTitle,
                brief: creativeBrief,
                scenesCount: storyboardScenes.length || 3,
                selectedModel,
                selectedProduct,
                selectedInstructions,
                referenceLabels: projectReferenceLabels,
              }),
            },
          ],
        }),
      })
      const payload = await response.json()

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "AI 分镜生成失败。")
      }

      const parsed = parseStoryboardScenes(String(payload.text ?? ""))
      const nextScenes = parsed.scenes.map((scene) => ({
        ...scene,
        referenceUrls: defaultReferenceUrls,
      }))
      const nextTitle = parsed.title || projectTitle
      const nextBrief = parsed.brief || creativeBrief

      setStoryboardScenes(nextScenes)
      if (parsed.title) {
        setProjectTitle(parsed.title)
      }
      if (parsed.brief) {
        setCreativeBrief(parsed.brief)
      }
      await saveCurrentProject({
        title: nextTitle,
        brief: nextBrief,
        scenes: nextScenes,
      })
      setStoryboardNotice("AI 已根据当前提示词库与参考素材更新分镜脚本。")
    } catch (error: unknown) {
      setStoryboardError(
        error instanceof Error ? error.message : "AI 分镜生成失败，请稍后重试。"
      )
    } finally {
      setIsGeneratingStoryboard(false)
    }
  }

  async function generateVideosForScenes(targetScenes: StoryboardScene[]) {
    if (!canGenerate || !targetScenes.length) {
      return
    }

    const sceneWithoutReferences = targetScenes.find(
      (scene) => scene.referenceUrls.length === 0 && uploadedReferenceFiles.length === 0
    )

    if (sceneWithoutReferences) {
      setVideoError(`请先为「${sceneWithoutReferences.title}」选择参考图。`)
      return
    }

    setIsSubmittingVideos(true)
    setVideoError("")

    try {
      const savedProject = await saveCurrentProject()

      for (const scene of targetScenes) {
        const formData = new FormData()
        formData.set(
          "prompt",
          buildSceneVideoPrompt({
            title: projectTitle,
            brief: creativeBrief,
            scene,
            selectedModel,
            selectedProduct,
            selectedInstructions,
          })
        )
        formData.set("duration", String(scene.duration))
        formData.set("projectId", savedProject.id)
        formData.set("aspectRatio", scene.aspectRatio)
        formData.set("soundMode", scene.soundMode)
        formData.set("sceneId", scene.id)
        formData.set("sceneTitle", scene.title)
        formData.set("sceneOrder", String(storyboardScenes.findIndex((item) => item.id === scene.id)))
        formData.set("visualPrompt", scene.visualPrompt)
        formData.set("camera", scene.camera)
        formData.set("motion", scene.motion)
        formData.set("transition", scene.transition)
        formData.set("voiceover", scene.voiceover)
        formData.set("referenceUrls", JSON.stringify(scene.referenceUrls))
        uploadedReferenceFiles.forEach((file) => {
          formData.append("referenceFiles", file)
        })

        const response = await fetch("/api/resources/generate-video", {
          method: "POST",
          body: formData,
        })
        const payload = await response.json()

        if (!response.ok || !payload.success) {
          throw new Error(payload.error || `${scene.title} 生成失败。`)
        }

        const nextTask: VideoGenerationTask = {
          sceneId: scene.id,
          sceneTitle: scene.title,
          duration: scene.duration,
          prompt: String(payload.prompt ?? ""),
          taskId: String(payload.taskId ?? ""),
          status: "processing",
          progress: null,
          videoUrl: null,
          error: null,
        }

        setVideoTasks((current) => [
          ...current.filter((item) => item.sceneId !== scene.id),
          nextTask,
        ])
      }
    } catch (error: unknown) {
      setVideoError(
        error instanceof Error ? error.message : "视频生成失败，请稍后重试。"
      )
    } finally {
      setIsSubmittingVideos(false)
    }
  }

  async function handleSelectProject(projectId: string) {
    if (!projectId) {
      return
    }

    setIsLoadingProject(true)
    setStoryboardError("")

    try {
      const response = await fetch(
        `/api/resources/video-projects?projectId=${encodeURIComponent(projectId)}`,
        {
          method: "GET",
        }
      )
      const payload = await response.json()

      if (!response.ok || !payload.success || !payload.project) {
        throw new Error(payload.error || "项目加载失败。")
      }

      applyProject(payload.project as ResourceVideoProject)
    } catch (error: unknown) {
      setStoryboardError(error instanceof Error ? error.message : "项目加载失败，请稍后重试。")
    } finally {
      setIsLoadingProject(false)
    }
  }

  async function handleRenameProject() {
    if (!currentProjectId) {
      setStoryboardError("请先选择一个已保存项目。")
      return
    }

    const nextTitle = window.prompt("请输入新的项目名称", projectTitle)?.trim()

    if (!nextTitle || nextTitle === projectTitle.trim()) {
      return
    }

    setIsSavingProject(true)

    try {
      const response = await fetch("/api/resources/video-projects", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: currentProjectId,
          title: nextTitle,
        }),
      })
      const payload = await response.json()

      if (!response.ok || !payload.success || !payload.project) {
        throw new Error(payload.error || "项目重命名失败。")
      }

      applyProject(payload.project as ResourceVideoProject)
      setStoryboardNotice("项目名称已更新。")
      setLastAutoSavedAt(String(payload.project.updatedAt ?? ""))
      setAutoSaveMessage("")
      await refreshProjectSummaries()
    } catch (error: unknown) {
      setStoryboardError(
        error instanceof Error ? error.message : "项目重命名失败，请稍后重试。"
      )
    } finally {
      setIsSavingProject(false)
    }
  }

  async function handleCopyProject(projectId?: string) {
    const targetProjectId = projectId ?? currentProjectId

    if (!targetProjectId) {
      setStoryboardError("请先选择一个已保存项目。")
      return
    }

    setIsSavingProject(true)

    try {
      const response = await fetch("/api/resources/video-projects", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: targetProjectId,
        }),
      })
      const payload = await response.json()

      if (!response.ok || !payload.success || !payload.project) {
        throw new Error(payload.error || "项目复制失败。")
      }

      applyProject(payload.project as ResourceVideoProject)
      setStoryboardNotice("项目副本已创建。")
      await refreshProjectSummaries()
    } catch (error: unknown) {
      setStoryboardError(
        error instanceof Error ? error.message : "项目复制失败，请稍后重试。"
      )
    } finally {
      setIsSavingProject(false)
    }
  }

  async function handleDeleteProject() {
    if (!currentProjectId) {
      setStoryboardError("当前没有可删除的已保存项目。")
      return
    }

    const confirmed = window.confirm(
      `确认删除项目「${projectTitle || "未命名项目"}」吗？\n分镜 ${currentProjectSummary?.sceneCount ?? 0} 个，任务 ${currentProjectSummary?.taskCount ?? 0} 条。`
    )

    if (!confirmed) {
      return
    }

    setIsLoadingProject(true)

    try {
      const response = await fetch(
        `/api/resources/video-projects?projectId=${encodeURIComponent(currentProjectId)}`,
        {
          method: "DELETE",
        }
      )
      const payload = await response.json()

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "项目删除失败。")
      }

      const removedProjectId = currentProjectId
      const nextSummaries = projectSummaries.filter((item) => item.id !== removedProjectId)
      setProjectSummaries(nextSummaries)
      setAutoSaveMessage("")
      setStoryboardNotice("项目已删除。")

      if (nextSummaries[0]?.id) {
        await handleSelectProject(nextSummaries[0].id)
      } else {
        handleCreateProject()
      }
    } catch (error: unknown) {
      setStoryboardError(
        error instanceof Error ? error.message : "项目删除失败，请稍后重试。"
      )
    } finally {
      setIsLoadingProject(false)
    }
  }

  function handleCreateProject() {
    shouldSkipNextAutosaveRef.current = true
    lastSavedDraftSignatureRef.current = ""
    setCurrentProjectId(null)
    setProjectTitle("未命名项目")
    setCreativeBrief("")
    setStoryboardScenes([])
    setVideoTasks([])
    setActiveSceneId(null)
    setActivePreviewSceneId(null)
    onSetExternalReferenceUrls([])
    onSetSelectedInstructionIds([])
    setAutoSaveMessage("")
    setLastAutoSavedAt(null)
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6 rounded-3xl border bg-card p-6 shadow-sm">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>影棚视频</Badge>
            <Badge variant="secondary">参考图驱动</Badge>
            <Badge variant="secondary">AI 分镜</Badge>
            <Badge variant="secondary">时间轴拖拽</Badge>
          </div>
          <h2 className="text-2xl font-heading tracking-tight">影棚</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            以参考图和提示词库为中心，先生成分镜，再按镜头批量发起视频任务，完成预览、播放与下载。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
          <div className="space-y-2">
            <Label>项目切换</Label>
            <select
              value={currentProjectId ?? ""}
              onChange={(event) => void handleSelectProject(event.target.value)}
              className={selectClassName()}
              disabled={isLoadingProject}
            >
              <option value="">新建未保存项目</option>
              {filteredProjectSummaries.map((project) => (
                <option key={project.id} value={project.id}>
                  {`${project.title} · ${formatDate(project.updatedAt)}`}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>
                最近更新：
                {currentProjectSummary
                  ? formatRelativeTime(currentProjectSummary.updatedAt)
                  : "未保存"}
              </span>
              <span>
                {autoSaveMessage ||
                  (lastAutoSavedAt
                    ? `自动保存：${formatRelativeTime(lastAutoSavedAt)}`
                    : "自动保存已开启")}
              </span>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={handleCreateProject}>
            新建项目
          </Button>
          <Button
            type="button"
            onClick={() => void saveCurrentProject().catch(() => undefined)}
            disabled={isSavingProject}
          >
            {isSavingProject ? "保存中..." : "保存项目"}
          </Button>
        </div>

        <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-medium">项目面板</h3>
              <p className="text-xs text-muted-foreground">
                支持筛选、打开、复制、重命名和删除影棚项目。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "all", label: "全部" },
                { value: "draft", label: "草稿" },
                { value: "processing", label: "生成中" },
                { value: "ready", label: "已就绪" },
                { value: "needs_attention", label: "待处理" },
              ].map((item) => (
                <Button
                  key={item.value}
                  type="button"
                  variant={projectStatusFilter === item.value ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setProjectStatusFilter(
                      item.value as "all" | "draft" | "processing" | "ready" | "needs_attention"
                    )
                  }
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          {filteredProjectSummaries.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredProjectSummaries.map((project) => (
                <div
                  key={project.id}
                  className={`space-y-3 rounded-2xl border p-4 ${
                    currentProjectId === project.id ? "border-primary bg-primary/5" : "bg-background"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium">{project.title}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{getProjectStatusLabel(project.status)}</span>
                        <span>{project.sceneCount} 个分镜</span>
                        <span>{project.taskCount} 条任务</span>
                      </div>
                    </div>
                    {currentProjectId === project.id ? <Badge>当前项目</Badge> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    最近更新 {formatRelativeTime(project.updatedAt)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={currentProjectId === project.id ? "default" : "outline"}
                      onClick={() => void handleSelectProject(project.id)}
                    >
                      打开
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void handleCopyProject(project.id)}
                    >
                      复制
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
              当前筛选下暂无项目。
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleRenameProject()}
            disabled={!currentProjectId || isSavingProject}
          >
            重命名项目
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleDeleteProject()}
            disabled={!currentProjectId || isLoadingProject}
          >
            删除项目
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>项目名称</Label>
            <Input
              value={projectTitle}
              onChange={(event) => setProjectTitle(event.target.value)}
              placeholder="例如：香水新品竖版短片"
            />
          </div>
          <div className="space-y-2">
            <Label>总时长</Label>
            <div className="flex h-10 items-center rounded-md border px-3 text-sm">
              {totalDuration} 秒 / {storyboardScenes.length} 个镜头
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label>项目提示词</Label>
              <span className="text-xs text-muted-foreground">
                可从提示词库插入，也可直接手动补充
              </span>
            </div>
            <Textarea
              value={creativeBrief}
              onChange={(event) => setCreativeBrief(event.target.value)}
              className="min-h-32"
              placeholder="描述视频节奏、卖点、场景、风格、人物动作与镜头要求。"
            />
          </div>
          <div className="space-y-3 rounded-2xl border bg-background/80 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">从提示词库添加到项目提示词</p>
              <span className="text-xs text-muted-foreground">
                {selectedInstructions.length ? "优先显示已启用提示词" : "当前显示全部提示词"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {promptLibraryItems.length ? (
                promptLibraryItems.map((instruction) => (
                  <Button
                    key={`project-${instruction.id}`}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCreativeBrief((current) =>
                        appendPromptBlock(
                          current,
                          `提示词库：${instruction.title}\n${instruction.content}`
                        )
                      )
                    }
                  >
                    添加 {instruction.title}
                  </Button>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">
                  暂无可插入的提示词，请先在提示词库中创建内容。
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">提示词库驱动的 AI 分镜</p>
              <p className="text-xs text-muted-foreground">
                分镜不走独立路由，直接通过通用 LLM 聊天接口生成。
              </p>
            </div>
            <Button
              type="button"
              onClick={handleGenerateStoryboard}
              disabled={isGeneratingStoryboard}
            >
              {isGeneratingStoryboard ? "AI 生成中..." : "AI 生成分镜"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            AI 会结合项目提示词、提示词库内容、模特/产品设定和参考图一起生成分镜。
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label>当前镜头参考图</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                每个分镜可独立选择不同参考图，当前操作仅作用于已选镜头。
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              已选 {activeScene?.referenceUrls.length ?? 0} 张
            </span>
          </div>

          {availableReferences.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {availableReferences.map((reference) => {
                const isActive = Boolean(activeScene?.referenceUrls.includes(reference.url))

                return (
                  <button
                    key={reference.id}
                    type="button"
                    onClick={() =>
                      activeScene ? toggleReferenceForScene(activeScene.id, reference.url) : null
                    }
                    disabled={!activeScene}
                    className={`space-y-3 rounded-2xl border p-3 text-left ${
                      isActive ? "border-primary bg-primary/5" : "bg-background"
                    }`}
                  >
                    <AssetPreview
                      imageUrl={reference.url}
                      aspectClassName="aspect-square"
                      fallback="REF"
                    />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={isActive ? "default" : "outline"}>
                          {reference.label}
                        </Badge>
                        <Badge variant="secondary">{reference.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {isActive ? "已加入当前镜头" : "点击加入当前镜头"}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed px-4 py-5 text-sm text-muted-foreground">
              当前没有可用参考图，可先在图片工作台生成视觉素材或从模特作品集中挑选。
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>补充上传参考图</Label>
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) =>
              setUploadedReferenceFiles(Array.from(event.target.files ?? []))
            }
          />
          {uploadedReferenceFiles.length ? (
            <div className="flex flex-wrap gap-2">
              {uploadedReferenceFiles.map((file) => (
                <Badge key={`${file.name}-${file.size}`} variant="outline">
                  {file.name}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-4 rounded-2xl border bg-muted/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-medium">分镜时间轴</h3>
              <p className="text-xs text-muted-foreground">
                拖动镜头条目可调整先后顺序，时长会同步影响时间轴比例。
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addScene}>
              新增镜头
            </Button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1">
            {storyboardScenes.map((scene, index) => {
              const task = videoTasks.find((item) => item.sceneId === scene.id)

              return (
                <button
                  key={scene.id}
                  type="button"
                  draggable
                  onDragStart={() => setDraggingSceneId(scene.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (draggingSceneId) {
                      reorderScenes(draggingSceneId, scene.id)
                    }
                    setDraggingSceneId(null)
                  }}
                  onDragEnd={() => setDraggingSceneId(null)}
                  onClick={() => setActiveSceneId(scene.id)}
                  className={`min-w-[180px] rounded-2xl border p-4 text-left ${
                    activeSceneId === scene.id ? "border-primary bg-primary/5" : "bg-background"
                  }`}
                  style={{ flexBasis: `${Math.max(scene.duration * 14, 180)}px` }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline">#{index + 1}</Badge>
                    <span className="text-xs text-muted-foreground">{scene.duration}s</span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm font-medium">{scene.title}</p>
                  <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">
                    {scene.visualPrompt}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {task?.videoUrl ? (
                      <Badge>已完成</Badge>
                    ) : task?.status === "processing" ? (
                      <Badge variant="secondary">生成中</Badge>
                    ) : null}
                    <Badge variant="outline">{scene.soundMode}</Badge>
                    <Badge variant="outline">{scene.aspectRatio}</Badge>
                    <Badge variant="outline">参考 {scene.referenceUrls.length}</Badge>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-medium">分镜脚本管理</h3>
            <div className="flex gap-2">
              {activeScene ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => generateVideosForScenes([activeScene])}
                  disabled={
                    !canGenerate ||
                    isSubmittingVideos ||
                    (activeScene.referenceUrls.length === 0 &&
                      uploadedReferenceFiles.length === 0)
                  }
                >
                  生成当前镜头
                </Button>
              ) : null}
              <Button
                type="button"
                onClick={() => generateVideosForScenes(storyboardScenes)}
                disabled={!canGenerate || isSubmittingVideos || storyboardScenes.length === 0}
              >
                {isSubmittingVideos ? "提交中..." : "生成全部镜头"}
              </Button>
            </div>
          </div>

          {storyboardScenes.length ? (
            activeScene ? (
              <div className="space-y-4 rounded-2xl border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">镜头 {activeSceneIndex + 1}</Badge>
                    {activeSceneTask?.status === "processing" ? (
                      <Badge variant="secondary">
                        生成中
                        {typeof activeSceneTask.progress === "number"
                          ? ` ${activeSceneTask.progress}%`
                          : ""}
                      </Badge>
                    ) : null}
                    {activeSceneTask?.videoUrl ? <Badge>可预览</Badge> : null}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setActiveSceneId(
                          storyboardScenes[Math.max(0, activeSceneIndex - 1)]?.id ?? activeScene.id
                        )
                      }
                      disabled={activeSceneIndex <= 0}
                    >
                      上一镜头
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setActiveSceneId(
                          storyboardScenes[
                            Math.min(storyboardScenes.length - 1, activeSceneIndex + 1)
                          ]?.id ?? activeScene.id
                        )
                      }
                      disabled={activeSceneIndex >= storyboardScenes.length - 1}
                    >
                      下一镜头
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setStoryboardScenes((current) => [
                          ...current,
                          createStoryboardScene(current.length, {
                            ...activeScene,
                            id: createSceneId(),
                            title: `${activeScene.title} 复制`,
                          }),
                        ])
                      }
                    >
                      复制
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeScene(activeScene.id)}
                      disabled={storyboardScenes.length === 1}
                    >
                      删除
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>镜头标题</Label>
                    <Input
                      value={activeScene.title}
                      onChange={(event) =>
                        updateScene(activeScene.id, { title: event.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>镜头时长（秒）</Label>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={activeScene.duration}
                      onChange={(event) =>
                        updateScene(activeScene.id, {
                          duration: Number(event.target.value || 4),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>声音开关</Label>
                    <select
                      value={activeScene.soundMode}
                      onChange={(event) =>
                        updateScene(activeScene.id, {
                          soundMode: event.target.value as VideoSoundMode,
                        })
                      }
                      className={selectClassName()}
                    >
                      {VIDEO_SOUND_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.value}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>视频比例</Label>
                    <select
                      value={activeScene.aspectRatio}
                      onChange={(event) =>
                        updateScene(activeScene.id, {
                          aspectRatio: event.target.value as VideoAspectRatio,
                        })
                      }
                      className={selectClassName()}
                    >
                      {VIDEO_ASPECT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.value}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>镜头提示词</Label>
                    <span className="text-xs text-muted-foreground">
                      可直接补充，也可从提示词库插入
                    </span>
                  </div>
                  <Textarea
                    value={composeScenePromptInput(activeScene)}
                    onChange={(event) =>
                      updateScene(activeScene.id, {
                        visualPrompt: event.target.value,
                        camera: "",
                        motion: "",
                        transition: "",
                        voiceover: "",
                      })
                    }
                    className="min-h-36"
                  />
                </div>

                <div className="space-y-3 rounded-2xl border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">当前镜头已选参考图</p>
                    <span className="text-xs text-muted-foreground">
                      {activeSceneReferenceLabels.length
                        ? activeSceneReferenceLabels.join("、")
                        : "尚未为当前镜头选择参考图"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeScene.referenceUrls.length ? (
                      activeScene.referenceUrls.map((url, index) => (
                        <Badge key={`${activeScene.id}-${url}-${index}`} variant="outline">
                          参考图 {index + 1}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        当前镜头还没有参考图。
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">从提示词库添加</p>
                    <span className="text-xs text-muted-foreground">
                      {selectedInstructions.length
                        ? "优先显示已启用提示词"
                        : "当前显示全部提示词"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {promptLibraryItems.length ? (
                      promptLibraryItems.map((instruction) => (
                        <Button
                          key={`${activeScene.id}-${instruction.id}`}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateScene(activeScene.id, {
                              visualPrompt: appendPromptBlock(
                                composeScenePromptInput(activeScene),
                                `提示词库：${instruction.title}\n${instruction.content}`
                              ),
                              camera: "",
                              motion: "",
                              transition: "",
                              voiceover: "",
                            })
                          }
                        >
                          添加 {instruction.title}
                        </Button>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        暂无可插入的提示词，请先在提示词库中创建内容。
                      </span>
                    )}
                  </div>
                </div>

                {activeSceneTask?.error ? (
                  <div className="rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {activeSceneTask.error}
                  </div>
                ) : null}
              </div>
            ) : null
          ) : (
            <div className="rounded-2xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
              暂无分镜，请先新增镜头或使用 AI 自动生成。
            </div>
          )}
        </div>

        {storyboardError ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {storyboardError}
          </div>
        ) : null}
        {storyboardNotice ? (
          <div className="rounded-2xl border border-green-500/40 bg-green-500/5 px-4 py-3 text-sm text-green-700 dark:text-green-300">
            {storyboardNotice}
          </div>
        ) : null}
        {videoError ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {videoError}
          </div>
        ) : null}
        {!canGenerate ? (
          <div className="rounded-2xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
            当前账号只能查看影棚结构，视频生成仅对运营和 Admin 开放。
          </div>
        ) : null}
        {canGenerate &&
        activeScene &&
        activeScene.referenceUrls.length === 0 &&
        uploadedReferenceFiles.length === 0 ? (
          <div className="rounded-2xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
            请先为当前镜头选择参考图后再发起视频生成。
          </div>
        ) : null}
      </div>

      <div className="space-y-6 rounded-3xl border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <h3 className="text-xl font-heading tracking-tight">视频预览与下载</h3>
          <p className="text-sm text-muted-foreground">
            每个镜头独立生成与回看，便于快速验证动作、质感和镜头顺序。
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-medium">项目详情</h4>
            <Badge variant={currentProjectSummary ? "default" : "outline"}>
              {getProjectStatusLabel(currentProjectSummary?.status ?? "draft")}
            </Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border bg-background p-3">
              <p className="text-xs text-muted-foreground">项目名称</p>
              <p className="mt-1 font-medium">{projectTitle || "未命名项目"}</p>
            </div>
            <div className="rounded-2xl border bg-background p-3">
              <p className="text-xs text-muted-foreground">最近保存</p>
              <p className="mt-1 font-medium">
                {lastAutoSavedAt ? formatRelativeTime(lastAutoSavedAt) : "尚未保存"}
              </p>
            </div>
            <div className="rounded-2xl border bg-background p-3">
              <p className="text-xs text-muted-foreground">分镜 / 任务</p>
              <p className="mt-1 font-medium">
                {storyboardScenes.length} / {videoTasks.length}
              </p>
            </div>
            <div className="rounded-2xl border bg-background p-3">
              <p className="text-xs text-muted-foreground">绑定资源</p>
              <p className="mt-1 font-medium">
                模特 {selectedModel ? "1" : "0"} / 产品 {selectedProduct ? "1" : "0"}
              </p>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">分镜概览</p>
              {storyboardScenes.length ? (
                <div className="space-y-2">
                  {storyboardScenes.slice(0, 4).map((scene, index) => (
                    <div
                      key={scene.id}
                      className="flex items-center justify-between rounded-2xl border bg-background px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          #{index + 1} {scene.title}
                        </p>
                        <p className="text-xs text-muted-foreground">{scene.duration} 秒</p>
                      </div>
                      <Badge variant="outline">{scene.aspectRatio}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed px-3 py-4 text-sm text-muted-foreground">
                  暂无分镜。
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">任务概览</p>
              {videoTasks.length ? (
                <div className="space-y-2">
                  {videoTasks.slice(0, 4).map((task) => (
                    <div
                      key={task.taskId}
                      className="flex items-center justify-between rounded-2xl border bg-background px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{task.sceneTitle || "未命名镜头"}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.videoUrl
                            ? "已生成可预览"
                            : task.status === "processing"
                              ? typeof task.progress === "number"
                                ? `进度 ${task.progress}%`
                                : "生成中"
                              : task.status === "failed"
                                ? task.error || "生成失败"
                                : "待生成"}
                        </p>
                      </div>
                      <Badge
                        variant={
                          task.status === "failed"
                            ? "destructive"
                            : task.status === "processing"
                              ? "secondary"
                              : task.videoUrl
                                ? "default"
                                : "outline"
                        }
                      >
                        {task.status === "failed"
                          ? "失败"
                          : task.status === "processing"
                            ? "处理中"
                            : task.videoUrl
                              ? "已完成"
                              : "待生成"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed px-3 py-4 text-sm text-muted-foreground">
                  暂无任务。
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-medium">主预览窗</h4>
            {activePreviewTask?.videoUrl ? (
              <a
                href={activePreviewTask.videoUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="text-sm text-primary underline-offset-4 hover:underline"
              >
                下载当前片段
              </a>
            ) : null}
          </div>
          {activePreviewTask?.videoUrl ? (
            <div className="space-y-3">
              <video
                key={activePreviewTask.videoUrl}
                src={activePreviewTask.videoUrl}
                controls
                playsInline
                className="aspect-[9/16] w-full rounded-2xl border bg-black object-cover"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge>{activePreviewTask.sceneTitle}</Badge>
                  <Badge variant="outline">{activePreviewTask.duration}s</Badge>
                </div>
                <p className="line-clamp-4 text-xs text-muted-foreground">
                  {activePreviewTask.prompt}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed px-4 py-10 text-sm text-muted-foreground">
              生成完成后，视频会出现在这里供播放与下载。
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">镜头任务面板</h4>
            <span className="text-xs text-muted-foreground">
              已完成 {completedTasks.length} / {storyboardScenes.length}
            </span>
          </div>
          {storyboardScenes.length ? (
            <div className="grid gap-3">
              {storyboardScenes.map((scene, index) => {
                const task = videoTasks.find((item) => item.sceneId === scene.id)

                return (
                  <button
                    key={scene.id}
                    type="button"
                    onClick={() => {
                      setActiveSceneId(scene.id)
                      if (task?.videoUrl) {
                        setActivePreviewSceneId(scene.id)
                      }
                    }}
                    className={`space-y-3 rounded-2xl border p-4 text-left ${
                      activeSceneId === scene.id ? "border-primary bg-primary/5" : "bg-background"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <span className="text-sm font-medium">{scene.title}</span>
                      </div>
                      {task?.videoUrl ? (
                        <Badge>已生成</Badge>
                      ) : task?.status === "processing" ? (
                        <Badge variant="secondary">排队 / 渲染中</Badge>
                      ) : task?.status === "failed" ? (
                        <Badge variant="destructive">生成失败</Badge>
                      ) : (
                        <Badge variant="outline">待生成</Badge>
                      )}
                    </div>
                    <p className="line-clamp-3 text-xs text-muted-foreground">
                      {scene.visualPrompt}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{scene.duration} 秒</span>
                      {task?.videoUrl ? (
                        <span>点击切换主预览</span>
                      ) : task?.status === "processing" ? (
                        <span>
                          {typeof task.progress === "number"
                            ? `进度 ${task.progress}%`
                            : "已提交视频任务"}
                        </span>
                      ) : null}
                    </div>
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <h4 className="font-medium">当前绑定资源</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <AssetPreview
                imageUrl={selectedModel?.avatarUrl}
                aspectClassName="aspect-[4/5]"
                fallback="MODEL"
              />
              <div className="space-y-1">
                <p className="font-medium">{selectedModel?.name ?? "尚未绑定模特"}</p>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {selectedModel?.backstory ?? "可从模特库带入人设与人物一致性约束。"}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <AssetPreview
                imageUrl={selectedProduct?.imageUrl}
                aspectClassName="aspect-[4/5]"
                fallback="PRODUCT"
              />
              <div className="space-y-1">
                <p className="font-medium">{selectedProduct?.name ?? "尚未绑定产品"}</p>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {selectedProduct?.description ?? "可从产品库带入卖点、材质与拍摄重点。"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StudioWorkspace({
  snapshot,
  canGenerate,
  canManageAll,
  externalReferenceUrls,
  forcedMode,
  onClearExternalReferenceUrls,
  selectedModelId,
  selectedProductId,
  selectedInstructionIds,
  onSelectModel,
  onSelectProduct,
  onSetExternalReferenceUrls,
  onSetSelectedInstructionIds,
  onToggleInstruction,
}: {
  snapshot: ResourceLibrarySnapshot
  canGenerate: boolean
  canManageAll: boolean
  externalReferenceUrls: string[]
  forcedMode?: StudioMode | null
  onClearExternalReferenceUrls: () => void
  selectedModelId: string
  selectedProductId: string
  selectedInstructionIds: string[]
  onSelectModel: (value: string) => void
  onSelectProduct: (value: string) => void
  onSetExternalReferenceUrls: (value: string[]) => void
  onSetSelectedInstructionIds: (value: string[]) => void
  onToggleInstruction: (value: string) => void
}) {
  const [workspaceMode, setWorkspaceMode] =
    React.useState<StudioWorkspaceMode>("video")

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border bg-card p-4 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-2xl font-heading tracking-tight">影棚工作流</h2>
          <p className="text-sm text-muted-foreground">
            先在影棚管理分镜与视频，再切换到图片工作台补充参考图和素材。
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={workspaceMode === "video" ? "default" : "outline"}
            onClick={() => setWorkspaceMode("video")}
          >
            影棚视频
          </Button>
          <Button
            type="button"
            variant={workspaceMode === "image" ? "default" : "outline"}
            onClick={() => setWorkspaceMode("image")}
          >
            图片工作台
          </Button>
        </div>
      </div>

      {workspaceMode === "video" ? (
        <VideoStudio
          snapshot={snapshot}
          canGenerate={canGenerate}
          externalReferenceUrls={externalReferenceUrls}
          selectedModelId={selectedModelId}
          selectedProductId={selectedProductId}
          selectedInstructionIds={selectedInstructionIds}
          onSelectModel={onSelectModel}
          onSelectProduct={onSelectProduct}
          onSetExternalReferenceUrls={onSetExternalReferenceUrls}
          onSetSelectedInstructionIds={onSetSelectedInstructionIds}
        />
      ) : (
        <GenerationStudio
          snapshot={snapshot}
          canGenerate={canGenerate}
          canManageAll={canManageAll}
          externalReferenceUrls={externalReferenceUrls}
          forcedMode={forcedMode}
          onClearExternalReferenceUrls={onClearExternalReferenceUrls}
          selectedModelId={selectedModelId}
          selectedProductId={selectedProductId}
          selectedInstructionIds={selectedInstructionIds}
          onSelectModel={onSelectModel}
          onSelectProduct={onSelectProduct}
          onToggleInstruction={onToggleInstruction}
        />
      )}
    </div>
  )
}

function GenerationStudio({
  snapshot,
  canGenerate,
  canManageAll,
  externalReferenceUrls,
  forcedMode,
  onClearExternalReferenceUrls,
  selectedModelId,
  selectedProductId,
  selectedInstructionIds,
  onSelectModel,
  onSelectProduct,
  onToggleInstruction,
}: {
  snapshot: ResourceLibrarySnapshot
  canGenerate: boolean
  canManageAll: boolean
  externalReferenceUrls: string[]
  forcedMode?: StudioMode | null
  onClearExternalReferenceUrls: () => void
  selectedModelId: string
  selectedProductId: string
  selectedInstructionIds: string[]
  onSelectModel: (value: string) => void
  onSelectProduct: (value: string) => void
  onToggleInstruction: (value: string) => void
}) {
  const router = useRouter()
  const [mode, setMode] = React.useState<StudioMode>("image-to-image")
  const [batchPlan, setBatchPlan] = React.useState<BatchPlan>("single")
  const [lightingId, setLightingId] = React.useState(LIGHTING_PRESETS[0]?.id ?? "")
  const [cameraId, setCameraId] = React.useState(CAMERA_PRESETS[0]?.id ?? "")
  const [referenceFiles, setReferenceFiles] = React.useState<File[]>([])
  const [customPrompt, setCustomPrompt] = React.useState("")
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [generateError, setGenerateError] = React.useState("")
  const [generateNotice, setGenerateNotice] = React.useState("")
  const [results, setResults] = React.useState<GeneratedVariantResult[]>([])

  React.useEffect(() => {
    if (forcedMode) {
      setMode(forcedMode)
    }
  }, [forcedMode])

  const selectedModel = React.useMemo(
    () => snapshot.models.find((item) => item.id === selectedModelId),
    [snapshot.models, selectedModelId]
  )
  const selectedProduct = React.useMemo(
    () => snapshot.products.find((item) => item.id === selectedProductId),
    [snapshot.products, selectedProductId]
  )
  const selectedInstructions = React.useMemo(
    () =>
      snapshot.instructions.filter((instruction) =>
        selectedInstructionIds.includes(instruction.id)
      ),
    [selectedInstructionIds, snapshot.instructions]
  )
  const promptBase = React.useMemo(
    () =>
      joinPromptBlocks([
        "目标：输出可直接用于商业视觉优化的高质量图像，保证人物与商品信息一致，避免低级 AI 痕迹。",
        buildModelPrompt(selectedModel),
        buildProductPrompt(selectedProduct),
        buildInstructionPrompt(selectedInstructions),
        customPrompt,
      ]),
    [customPrompt, selectedInstructions, selectedModel, selectedProduct]
  )
  const variants = React.useMemo(
    () =>
      buildVariantPlans({
        basePrompt: promptBase,
        lightingId,
        cameraId,
        batchPlan,
      }),
    [batchPlan, cameraId, lightingId, promptBase]
  )
  const prompt = variants[0]?.prompt ?? promptBase

  const referenceUrls = React.useMemo(
    () =>
      [...externalReferenceUrls, selectedModel?.avatarUrl, selectedProduct?.imageUrl]
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    [externalReferenceUrls, selectedModel?.avatarUrl, selectedProduct?.imageUrl]
  )

  async function handleGenerate() {
    if (!canGenerate || !prompt) {
      return
    }

    setIsGenerating(true)
    setGenerateError("")
    setGenerateNotice("")

    try {
      const formData = new FormData()
      formData.set("mode", mode)
      formData.set("modelId", selectedModelId)
      formData.set("productId", selectedProductId)
      formData.set("prompt", prompt)
      formData.set("referenceUrls", JSON.stringify(referenceUrls))
      formData.set("variants", JSON.stringify(variants))
      referenceFiles.forEach((file) => {
        formData.append("referenceFiles", file)
      })

      const response = await fetch("/api/resources/generate-image", {
        method: "POST",
        body: formData,
      })
      const payload = await response.json()

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "生成失败，请稍后重试。")
      }

      setResults(
        Array.isArray(payload.results)
          ? payload.results.map((item: GeneratedVariantResult) => ({
              imageUrl: item.imageUrl,
              sourceImageUrl: item.sourceImageUrl,
              prompt: item.prompt,
              mode: item.mode,
              label: item.label,
            }))
          : []
      )
      setGenerateNotice(String(payload.warning ?? "").trim())
      router.refresh()
    } catch (error: unknown) {
      setGenerateError(
        error instanceof Error ? error.message : "生成失败，请稍后重试。"
      )
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-6 rounded-3xl border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">文生图 / 图生图</Badge>
            <Badge variant="secondary">批量出图</Badge>
            <Badge variant="secondary">预制灯光</Badge>
            <Badge variant="secondary">预制相机</Badge>
          </div>
          <h2 className="text-2xl font-heading tracking-tight">生成工作台</h2>
          <p className="text-sm text-muted-foreground leading-6">
            将模特库、产品库与提示词库联动，快速生成商业视觉。用户负责沉淀提示词，运营与
            Admin 通过组合式提示词完成图像优化。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>生成模式</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === "text-to-image" ? "default" : "outline"}
                onClick={() => setMode("text-to-image")}
              >
                文生图
              </Button>
              <Button
                type="button"
                variant={mode === "image-to-image" ? "default" : "outline"}
                onClick={() => setMode("image-to-image")}
              >
                图生图
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>批量方案</Label>
            <select
              value={batchPlan}
              onChange={(event) => setBatchPlan(event.target.value as BatchPlan)}
              className={selectClassName()}
            >
              <option value="single">单张精修</option>
              <option value="triple">三版对比</option>
              <option value="quad">四版探索</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>模特资源</Label>
            <select
              value={selectedModelId}
              onChange={(event) => onSelectModel(event.target.value)}
              className={selectClassName()}
            >
              <option value="">不绑定模特</option>
              {snapshot.models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} · {model.style}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>产品资源</Label>
            <select
              value={selectedProductId}
              onChange={(event) => onSelectProduct(event.target.value)}
              className={selectClassName()}
            >
              <option value="">不绑定产品</option>
              {snapshot.products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>灯光预设</Label>
            <select
              value={lightingId}
              onChange={(event) => setLightingId(event.target.value)}
              className={selectClassName()}
            >
              {LIGHTING_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>相机预设</Label>
            <select
              value={cameraId}
              onChange={(event) => setCameraId(event.target.value)}
              className={selectClassName()}
            >
              {CAMERA_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>参考图上传</Label>
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) =>
              setReferenceFiles(Array.from(event.target.files ?? []))
            }
          />
          <p className="text-xs text-muted-foreground">
            额外参考图采用上传方式；模特图与产品图会自动作为参考输入。
          </p>
          {referenceFiles.length ? (
            <div className="flex flex-wrap gap-2">
              {referenceFiles.map((file) => (
                <Badge key={`${file.name}-${file.size}`} variant="outline">
                  {file.name}
                </Badge>
              ))}
            </div>
          ) : null}
          {externalReferenceUrls.length ? (
            <div className="space-y-2 rounded-2xl border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">来自作品集的参考图</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClearExternalReferenceUrls}
                >
                  清空
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {externalReferenceUrls.map((item, index) => (
                  <Badge key={`${item}-${index}`} variant="secondary">
                    作品图 {index + 1}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <Label>提示词模块</Label>
          <div className="flex flex-wrap gap-2">
            {snapshot.instructions.length ? (
              snapshot.instructions.map((instruction) => {
                const isActive = selectedInstructionIds.includes(instruction.id)

                return (
                  <Button
                    key={instruction.id}
                    type="button"
                    size="sm"
                    variant={isActive ? "default" : "outline"}
                    onClick={() => onToggleInstruction(instruction.id)}
                  >
                    {instruction.title}
                  </Button>
                )
              })
            ) : (
              <div className="rounded-2xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                暂无提示词模块，可先去提示词库创建灯光、镜头、妆容、背景等模板。
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>额外创作要求</Label>
          <Textarea
            value={customPrompt}
            onChange={(event) => setCustomPrompt(event.target.value)}
            className="min-h-28"
            placeholder="例如：输出更适合美妆电商主图，保留真实皮肤纹理，避免过度磨皮。"
          />
        </div>

        <div className="space-y-2">
          <Label>组合后的提示词</Label>
          <Textarea value={prompt} readOnly className="min-h-52 font-mono text-xs" />
        </div>

        <div className="space-y-3 rounded-2xl border bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <Label>批量生成方案</Label>
            <span className="text-xs text-muted-foreground">
              本次输出 {variants.length} 个版本
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {variants.map((variant) => (
              <div key={variant.label} className="rounded-2xl border bg-background p-3">
                <div className="flex items-center gap-2">
                  <Badge>{variant.label}</Badge>
                </div>
                <p className="mt-2 line-clamp-5 text-xs text-muted-foreground">
                  {variant.prompt}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating || !prompt}
          >
            {isGenerating ? "批量生成中..." : "开始生成优化图"}
          </Button>
          <p className="text-xs text-muted-foreground">
            {mode === "image-to-image"
              ? `当前图生图参考数：${referenceUrls.length + referenceFiles.length}`
              : "当前为文生图，可不提供参考图。"}
          </p>
        </div>

        {generateError ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {generateError}
          </div>
        ) : null}

        {generateNotice ? (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
            {generateNotice}
          </div>
        ) : null}

        {!canGenerate ? (
          <div className="rounded-2xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
            当前账号可浏览素材与沉淀提示词，生成工作台仅对运营和 Admin 开放。
          </div>
        ) : null}
      </div>

      <div className="space-y-6 rounded-3xl border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <h3 className="text-xl font-heading tracking-tight">当前参考组合</h3>
          <p className="text-sm text-muted-foreground">
            以模特、产品、提示词模块作为统一输入，减少反复整理 prompt 的成本。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <AssetPreview
              imageUrl={selectedModel?.avatarUrl}
              aspectClassName="aspect-[4/5]"
              fallback="MODEL"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">
                  {selectedModel?.name ?? "尚未绑定模特"}
                </p>
                {selectedModel?.style ? (
                  <Badge variant="secondary">{selectedModel.style}</Badge>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {selectedModel?.backstory ?? "选择模特后，这里会显示模特人设与风格。"}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <AssetPreview
              imageUrl={selectedProduct?.imageUrl}
              aspectClassName="aspect-[4/5]"
              fallback="PRODUCT"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">
                  {selectedProduct?.name ?? "尚未绑定产品"}
                </p>
                {selectedProduct?.brand ? (
                  <Badge variant="secondary">{selectedProduct.brand}</Badge>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {selectedProduct?.description ??
                  "选择产品后，这里会显示品牌、卖点和适配拍摄方向。"}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium">已启用提示词模块</h4>
          <div className="flex flex-wrap gap-2">
            {selectedInstructions.length ? (
              selectedInstructions.map((instruction) => (
                <Badge key={instruction.id} variant="outline">
                  {instruction.title}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">
                暂未启用提示词模块
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">本次生成结果</h4>
            {results.length ? (
              <span className="text-xs text-muted-foreground">
                已入库 {results.length} 张
              </span>
            ) : null}
          </div>
          {results.length ? (
            <div className="grid gap-4">
              {results.map((result) => (
                <div key={`${result.label}-${result.imageUrl}`} className="space-y-3 rounded-2xl border bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      <Badge>{result.label}</Badge>
                      <Badge variant="outline">
                        {result.mode === "image-to-image" ? "图生图" : "文生图"}
                      </Badge>
                    </div>
                    <a
                      href={result.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary underline-offset-4 hover:underline"
                    >
                      打开原图
                    </a>
                  </div>
                  <AssetPreview
                    imageUrl={result.imageUrl}
                    aspectClassName="aspect-square"
                    fallback="RESULT"
                  />
                  <p className="line-clamp-4 text-xs text-muted-foreground">
                    {result.prompt}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
              生成后的图片会展示在这里，并正式写入历史库。
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">可追溯历史</h4>
            <span className="text-xs text-muted-foreground">
              最近 {snapshot.generatedImages.length} 条
            </span>
          </div>
          {snapshot.generatedImages.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {snapshot.generatedImages.map((item) => (
                <HistoryCard
                  key={item.id}
                  item={item}
                  canManageAll={canManageAll}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
              暂无历史记录，首次生成后会自动沉淀到这里。
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function ResourceBoard({
  snapshot,
  canManageAll,
  canWriteProducts,
  initialTab = "studio",
}: {
  snapshot: ResourceLibrarySnapshot
  canManageAll: boolean
  canWriteProducts: boolean
  initialTab?: string
}) {
  const defaultModelId = snapshot.models[0]?.id ?? ""
  const defaultProductId = snapshot.products[0]?.id ?? ""
  const [activeTab, setActiveTab] = React.useState(initialTab || "studio")
  const [selectedModelId, setSelectedModelId] = React.useState(defaultModelId)
  const [selectedProductId, setSelectedProductId] = React.useState(defaultProductId)
  const [externalReferenceUrls, setExternalReferenceUrls] = React.useState<string[]>(
    []
  )
  const [forcedStudioMode, setForcedStudioMode] =
    React.useState<StudioMode | null>(null)
  const [selectedInstructionIds, setSelectedInstructionIds] = React.useState<
    string[]
  >([])

  function toggleInstruction(instructionId: string) {
    setSelectedInstructionIds((current) =>
      current.includes(instructionId)
        ? current.filter((item) => item !== instructionId)
        : [...current, instructionId]
    )
  }

  function openStudioWithSelection(options: {
    modelId?: string
    productId?: string
    instructionId?: string
    referenceUrls?: string[]
    mode?: StudioMode
  }) {
    if (options.modelId) {
      setSelectedModelId(options.modelId)
    }

    if (options.productId) {
      setSelectedProductId(options.productId)
    }

    if (
      options.instructionId &&
      !selectedInstructionIds.includes(options.instructionId)
    ) {
      setSelectedInstructionIds((current) => [...current, options.instructionId!])
    }

    setExternalReferenceUrls(options.referenceUrls ?? [])
    setForcedStudioMode(options.mode ?? null)

    setActiveTab("studio")
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(String(value))}
      className="w-full space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="studio">影棚</TabsTrigger>
          <TabsTrigger value="models">模特库</TabsTrigger>
          <TabsTrigger value="products">产品库</TabsTrigger>
          <TabsTrigger value="instructions">提示词库</TabsTrigger>
        </TabsList>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>模特 {snapshot.models.length}</span>
          <span>产品 {snapshot.products.length}</span>
          <span>提示词 {snapshot.instructions.length}</span>
        </div>
      </div>

      <TabsContent value="studio" className="space-y-6">
        <StudioWorkspace
          snapshot={snapshot}
          canGenerate={canManageAll}
          canManageAll={canManageAll}
          externalReferenceUrls={externalReferenceUrls}
          forcedMode={forcedStudioMode}
          onClearExternalReferenceUrls={() => setExternalReferenceUrls([])}
          selectedModelId={selectedModelId}
          selectedProductId={selectedProductId}
          selectedInstructionIds={selectedInstructionIds}
          onSelectModel={setSelectedModelId}
          onSelectProduct={setSelectedProductId}
          onSetExternalReferenceUrls={setExternalReferenceUrls}
          onSetSelectedInstructionIds={setSelectedInstructionIds}
          onToggleInstruction={toggleInstruction}
        />
      </TabsContent>

      <TabsContent value="models" className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-heading tracking-tight">模特库</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              面向高频图片生成优化的模特资产池，可直接进入文生图 / 图生图工作台作为视觉主体。
            </p>
          </div>
          {canManageAll && snapshot.source === "database" ? (
            <Dialog>
              <DialogTrigger render={<Button />}>新增模特资源</DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>新增模特</DialogTitle>
                  <DialogDescription>
                    填写模特基础信息、头像与人设，作为后续图像生成的核心主体。
                  </DialogDescription>
                </DialogHeader>
                <form action={createModelAction} className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="model-name">模特名称</Label>
                      <Input id="model-name" name="name" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="model-style">风格标签</Label>
                      <Input id="model-style" name="style" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model-avatar-file">头像文件</Label>
                    <Input
                      id="model-avatar-file"
                      name="avatarFile"
                      type="file"
                      accept="image/*"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model-avatar-url">或头像 URL</Label>
                    <Input id="model-avatar-url" name="avatarUrl" placeholder="https://..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model-operator">负责人</Label>
                    <select
                      id="model-operator"
                      name="assignedOperatorId"
                      defaultValue=""
                      className={selectClassName()}
                    >
                      <option value="">暂不分配</option>
                      {snapshot.operators.map((operator) => (
                        <option key={operator.id} value={operator.id}>
                          {operator.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model-backstory">人设描述</Label>
                    <Textarea id="model-backstory" name="backstory" className="min-h-28" />
                  </div>
                  <Button type="submit">保存模特</Button>
                </form>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.models.length ? (
            snapshot.models.map((model) => {
              const allModelImages = snapshot.generatedImages.filter(
                (item) => item.modelId === model.id
              )
              const relatedImages = allModelImages.slice(0, 3)
              const categorySummary = IMAGE_CATEGORY_OPTIONS.map((option) => ({
                ...option,
                count: allModelImages.filter(
                  (item) => item.assetCategory === option.value
                ).length,
              })).filter((item) => item.count > 0)

              return (
                <div key={model.id} className="space-y-4 rounded-3xl border bg-card p-5 shadow-sm">
                  <AssetPreview
                    imageUrl={model.avatarUrl}
                    aspectClassName="aspect-[4/5]"
                    fallback="MODEL"
                  />
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-heading">{model.name}</h3>
                      <Badge variant="secondary">{model.style}</Badge>
                    </div>
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {model.backstory ?? "暂无模特描述"}
                    </p>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>负责人：{model.assignedOperatorName ?? "未分配"}</p>
                      <p>创建时间：{formatDate(model.createdAt)}</p>
                      <p>关联作品：{allModelImages.length} 张</p>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border bg-muted/20 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">模特作品集</p>
                      <span className="text-xs text-muted-foreground">
                        封面仅是主展示图
                      </span>
                    </div>
                    {categorySummary.length ? (
                      <div className="flex flex-wrap gap-2">
                        {categorySummary.map((item) => (
                          <Badge key={item.value} variant="outline">
                            {item.label} {item.count}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    {relatedImages.length ? (
                      <div className="grid grid-cols-3 gap-2">
                        {relatedImages.map((item) => (
                          <div
                            key={item.id}
                            className="space-y-2 rounded-xl border bg-background p-2"
                          >
                            <AssetPreview
                              imageUrl={item.imageUrl}
                              aspectClassName="aspect-square"
                              fallback="SHOT"
                            />
                            <Badge variant="secondary" className="justify-center">
                              {getImageCategoryLabel(item.assetCategory)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        这个模特还没有关联生成图。后续每次绑定该模特出图，结果都会沉淀在这里。
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 border-t pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        openStudioWithSelection({
                          modelId: model.id,
                          mode: "text-to-image",
                        })
                      }
                    >
                      文生图工作台
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        openStudioWithSelection({
                          modelId: model.id,
                          mode: "image-to-image",
                        })
                      }
                    >
                      图生图工作台
                    </Button>
                    <ModelPortfolioDialog
                      model={model}
                      images={allModelImages}
                      canManageAll={canManageAll}
                      onContinueWithReferences={(imageUrls: string[]) =>
                        openStudioWithSelection({
                          modelId: model.id,
                          referenceUrls: imageUrls,
                          mode: "image-to-image",
                        })
                      }
                    />
                    {canManageAll && snapshot.source === "database" ? (
                      <Dialog>
                        <DialogTrigger render={<Button variant="outline" size="sm" />}>
                          编辑
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                          <DialogHeader>
                            <DialogTitle>编辑模特</DialogTitle>
                          </DialogHeader>
                          <form action={updateModelAction} className="grid gap-4 py-4">
                            <input type="hidden" name="id" value={model.id} />
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor={`model-name-${model.id}`}>模特名称</Label>
                                <Input
                                  id={`model-name-${model.id}`}
                                  name="name"
                                  defaultValue={model.name}
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`model-style-${model.id}`}>风格标签</Label>
                                <Input
                                  id={`model-style-${model.id}`}
                                  name="style"
                                  defaultValue={model.style}
                                  required
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`model-avatar-file-${model.id}`}>重新上传头像</Label>
                              <Input
                                id={`model-avatar-file-${model.id}`}
                                name="avatarFile"
                                type="file"
                                accept="image/*"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`model-avatar-url-${model.id}`}>头像 URL</Label>
                              <Input
                                id={`model-avatar-url-${model.id}`}
                                name="avatarUrl"
                                defaultValue={model.avatarUrl ?? ""}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`model-operator-${model.id}`}>负责人</Label>
                              <select
                                id={`model-operator-${model.id}`}
                                name="assignedOperatorId"
                                defaultValue={model.assignedOperatorId ?? ""}
                                className={selectClassName()}
                              >
                                <option value="">暂不分配</option>
                                {snapshot.operators.map((operator) => (
                                  <option key={operator.id} value={operator.id}>
                                    {operator.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`model-backstory-${model.id}`}>人设描述</Label>
                              <Textarea
                                id={`model-backstory-${model.id}`}
                                name="backstory"
                                defaultValue={model.backstory ?? ""}
                                className="min-h-28"
                              />
                            </div>
                            <Button type="submit">保存更改</Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    ) : null}
                    {canManageAll && snapshot.source === "database" ? (
                      <form action={deleteModelAction}>
                        <input type="hidden" name="id" value={model.id} />
                        <Button type="submit" variant="destructive" size="sm">
                          删除
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="rounded-3xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
              暂无模特资源。
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="products" className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-heading tracking-tight">产品库</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              产品资源以图像生成适配为目标，支持直接进入文生图 / 图生图工作台，作为参考图与约束信息。
            </p>
          </div>
          {canWriteProducts && snapshot.source === "database" ? (
            <Dialog>
              <DialogTrigger render={<Button />}>新增商品资源</DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>新增商品</DialogTitle>
                  <DialogDescription>
                    填写商品信息、图像与卖点，用于生成工作台快速拼装提示词。
                  </DialogDescription>
                </DialogHeader>
                <form action={createProductAction} className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="product-name">商品名称</Label>
                      <Input id="product-name" name="name" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="product-brand">品牌</Label>
                      <Input id="product-brand" name="brand" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="product-sku">SKU</Label>
                      <Input id="product-sku" name="sku" />
                    </div>
                    {canManageAll ? (
                      <div className="space-y-2">
                        <Label htmlFor="product-owner">所属用户</Label>
                        <select
                          id="product-owner"
                          name="ownerUserId"
                          defaultValue=""
                          className={selectClassName()}
                        >
                          <option value="">请选择归属用户</option>
                          {snapshot.productOwners.map((owner) => (
                            <option key={owner.id} value={owner.id}>
                              {owner.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product-image-file">商品图片</Label>
                    <Input
                      id="product-image-file"
                      name="imageFile"
                      type="file"
                      accept="image/*"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product-image-url">或图片 URL</Label>
                    <Input id="product-image-url" name="imageUrl" placeholder="https://..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product-description">商品描述</Label>
                    <Textarea id="product-description" name="description" className="min-h-28" />
                  </div>
                  <Button type="submit">保存商品</Button>
                </form>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.products.length ? (
            snapshot.products.map((product) => (
              <div key={product.id} className="space-y-4 rounded-3xl border bg-card p-5 shadow-sm">
                <AssetPreview
                  imageUrl={product.imageUrl}
                  aspectClassName="aspect-[4/5]"
                  fallback="PRODUCT"
                />
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-heading">{product.name}</h3>
                    {product.brand ? <Badge variant="secondary">{product.brand}</Badge> : null}
                  </div>
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {product.description ?? "暂无商品描述"}
                  </p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>SKU：{product.sku ?? "未填写"}</p>
                    <p>所属用户：{product.ownerName ?? "未知"}</p>
                    <p>更新时间：{formatDate(product.updatedAt)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      openStudioWithSelection({
                        productId: product.id,
                        mode: "text-to-image",
                      })
                    }
                  >
                    文生图工作台
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      openStudioWithSelection({
                        productId: product.id,
                        mode: "image-to-image",
                      })
                    }
                  >
                    图生图工作台
                  </Button>
                  {snapshot.source === "database" ? (
                    <Dialog>
                      <DialogTrigger render={<Button variant="outline" size="sm" />}>
                        编辑
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                          <DialogTitle>编辑商品</DialogTitle>
                        </DialogHeader>
                        <form action={updateProductAction} className="grid gap-4 py-4">
                          <input type="hidden" name="id" value={product.id} />
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`product-name-${product.id}`}>商品名称</Label>
                              <Input
                                id={`product-name-${product.id}`}
                                name="name"
                                defaultValue={product.name}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`product-brand-${product.id}`}>品牌</Label>
                              <Input
                                id={`product-brand-${product.id}`}
                                name="brand"
                                defaultValue={product.brand ?? ""}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`product-sku-${product.id}`}>SKU</Label>
                              <Input
                                id={`product-sku-${product.id}`}
                                name="sku"
                                defaultValue={product.sku ?? ""}
                              />
                            </div>
                            {canManageAll ? (
                              <div className="space-y-2">
                                <Label htmlFor={`product-owner-${product.id}`}>所属用户</Label>
                                <select
                                  id={`product-owner-${product.id}`}
                                  name="ownerUserId"
                                  defaultValue={product.ownerUserId}
                                  className={selectClassName()}
                                >
                                  {snapshot.productOwners.map((owner) => (
                                    <option key={owner.id} value={owner.id}>
                                      {owner.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <input type="hidden" name="ownerUserId" value={product.ownerUserId} />
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`product-image-file-${product.id}`}>重新上传图片</Label>
                            <Input
                              id={`product-image-file-${product.id}`}
                              name="imageFile"
                              type="file"
                              accept="image/*"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`product-image-url-${product.id}`}>或图片 URL</Label>
                            <Input
                              id={`product-image-url-${product.id}`}
                              name="imageUrl"
                              defaultValue={product.imageUrl ?? ""}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`product-description-${product.id}`}>商品描述</Label>
                            <Textarea
                              id={`product-description-${product.id}`}
                              name="description"
                              defaultValue={product.description ?? ""}
                              className="min-h-28"
                            />
                          </div>
                          <Button type="submit">保存更改</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  ) : null}
                  {snapshot.source === "database" ? (
                    <form action={deleteProductAction}>
                      <input type="hidden" name="id" value={product.id} />
                      <Button type="submit" variant="destructive" size="sm">
                        删除
                      </Button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
              暂无产品资源。
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="instructions" className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-heading tracking-tight">提示词库</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              用户负责沉淀提示词模板，运营与 Admin 组合灯光、镜头、画面、精修提示词进行高频图像优化。
            </p>
          </div>
          {snapshot.source === "database" ? (
            <Dialog>
              <DialogTrigger render={<Button />}>新增提示词</DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>新增提示词</DialogTitle>
                  <DialogDescription>
                    建议按 lighting、camera、styling、composition、retouch 等分类维护。
                  </DialogDescription>
                </DialogHeader>
                <form action={createInstructionAction} className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="instruction-title">标题</Label>
                      <Input id="instruction-title" name="title" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instruction-category">分类</Label>
                      <Input id="instruction-category" name="category" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instruction-content">提示词内容</Label>
                    <Textarea
                      id="instruction-content"
                      name="content"
                      required
                      className="min-h-40"
                    />
                  </div>
                  <Button type="submit">保存提示词</Button>
                </form>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.instructions.length ? (
            snapshot.instructions.map((instruction) => (
              <div key={instruction.id} className="space-y-4 rounded-3xl border bg-card p-5 shadow-sm">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-heading">{instruction.title}</h3>
                    <Badge variant="secondary">{instruction.category}</Badge>
                  </div>
                  <p className="rounded-2xl bg-muted/50 p-4 font-mono text-xs leading-6 text-muted-foreground">
                    {instruction.content}
                  </p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>创建人：{instruction.creatorName ?? "系统"}</p>
                    <p>更新时间：{formatDate(instruction.updatedAt)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openStudioWithSelection({ instructionId: instruction.id })}
                  >
                    用于工作台
                  </Button>
                  {snapshot.source === "database" && canEditInstruction(instruction, canManageAll) ? (
                    <Dialog>
                      <DialogTrigger render={<Button variant="outline" size="sm" />}>
                        编辑
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                          <DialogTitle>编辑提示词</DialogTitle>
                        </DialogHeader>
                        <form action={updateInstructionAction} className="grid gap-4 py-4">
                          <input type="hidden" name="id" value={instruction.id} />
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`instruction-title-${instruction.id}`}>标题</Label>
                              <Input
                                id={`instruction-title-${instruction.id}`}
                                name="title"
                                defaultValue={instruction.title}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`instruction-category-${instruction.id}`}>分类</Label>
                              <Input
                                id={`instruction-category-${instruction.id}`}
                                name="category"
                                defaultValue={instruction.category}
                                required
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`instruction-content-${instruction.id}`}>提示词内容</Label>
                            <Textarea
                              id={`instruction-content-${instruction.id}`}
                              name="content"
                              defaultValue={instruction.content}
                              required
                              className="min-h-40"
                            />
                          </div>
                          <Button type="submit">保存更改</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  ) : null}
                  {snapshot.source === "database" && canEditInstruction(instruction, canManageAll) ? (
                    <form action={deleteInstructionAction}>
                      <input type="hidden" name="id" value={instruction.id} />
                      <Button type="submit" variant="destructive" size="sm">
                        删除
                      </Button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
              暂无提示词，可先创建灯光、镜头、背景、妆容等模板。
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  )
}
