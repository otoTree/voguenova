import Link from "next/link"
import { logout } from "@/app/actions/auth"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { WorkspaceNav } from "@/components/workspace-nav"
import { requireUser } from "@/lib/auth"
import { getResourceLibrarySnapshot } from "@/lib/resource-system"
import { getRoleMeta } from "@/lib/user-system"
import { ResourceBoard } from "./resource-board"

type PageSearchParams = Promise<{
  section?: string | string[]
  tone?: string | string[]
  message?: string | string[]
}>

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? ""
}

function sectionDescription(role: "admin" | "operator" | "user") {
  if (role === "user") {
    return "你可以整理商品与提示词资源，为运营提供可复用的创作素材。"
  }
  if (role === "operator") {
    return "你可以组合模特、产品与提示词，通过文生图和图生图优化商业视觉。"
  }
  return "你可以统筹模特、产品、提示词与生成工作台，构建完整的视觉生产链路。"
}

export default async function ResourceLibraryPage({
  searchParams,
}: {
  searchParams: PageSearchParams
}) {
  const currentUser = await requireUser()
  const snapshot = await getResourceLibrarySnapshot(currentUser)
  const resolvedSearchParams = await searchParams
  const activeSection = getStringParam(resolvedSearchParams.section) || "studio"
  const tone = getStringParam(resolvedSearchParams.tone)
  const message = getStringParam(resolvedSearchParams.message)
  const canManageAll = currentUser.role !== "user"
  const canWriteProducts = snapshot.source === "database"

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-sans">
              Resource Library
            </p>
            <h1 className="mt-1 text-2xl font-heading tracking-tight">
              资源库
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/workspace" />}
              nativeButton={false}
            >
              返回工作台
            </Button>
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/" />}
              nativeButton={false}
            >
              返回首页
            </Button>
            <form action={logout}>
              <Button type="submit" size="sm">
                退出登录
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 lg:px-10">
        <WorkspaceNav current="resources" role={currentUser.role} />

        <section className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-3">
              <h2 className="text-4xl font-heading tracking-tight">
                {currentUser.name}
              </h2>
              <Badge variant="outline" className="uppercase tracking-widest text-xs">
                {getRoleMeta(currentUser.role).label}
              </Badge>
            </div>
            <p className="text-lg leading-relaxed text-muted-foreground font-sans">
              {sectionDescription(currentUser.role)}
            </p>
          </div>
          
          <div className="flex gap-4">
            <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-4 min-w-24 shadow-sm">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">模特</span>
              <span className="text-2xl font-heading mt-1">{snapshot.models.length}</span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-4 min-w-24 shadow-sm">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">产品</span>
              <span className="text-2xl font-heading mt-1">{snapshot.products.length}</span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-4 min-w-24 shadow-sm">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">提示词</span>
              <span className="text-2xl font-heading mt-1">{snapshot.instructions.length}</span>
            </div>
          </div>
        </section>

        {message ? (
          <div
            className={`rounded-lg border px-4 py-3 text-sm font-sans ${
              tone === "error"
                ? "border-destructive/50 bg-destructive/10 text-destructive"
                : "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400"
            }`}
          >
            {message}
          </div>
        ) : null}

        {snapshot.source === "unavailable" ? (
          <div className="rounded-xl border border-destructive bg-destructive/5 p-6 text-destructive">
            <h3 className="font-heading text-lg">资源库暂不可写</h3>
            <p className="mt-2 text-sm">当前未配置 DATABASE_URL，页面结构已就绪，但资源数据无法持久化。</p>
          </div>
        ) : null}

        <ResourceBoard 
          snapshot={snapshot}
          canManageAll={canManageAll}
          canWriteProducts={canWriteProducts}
          initialTab={activeSection}
        />
      </main>
    </div>
  )
}
