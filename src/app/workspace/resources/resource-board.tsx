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

interface GeneratedVariantResult {
  label: string
  imageUrl: string
  sourceImageUrl: string
  prompt: string
  mode: StudioMode
}

const IMAGE_CATEGORY_OPTIONS = [
  { value: "retouch", label: "精修图" },
  { value: "cover_candidate", label: "封面候选" },
  { value: "training", label: "训练图" },
  { value: "campaign", label: "商拍图" },
  { value: "discarded", label: "废弃图" },
]

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
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
          <TabsTrigger value="studio">生成工作台</TabsTrigger>
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
        <GenerationStudio
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
