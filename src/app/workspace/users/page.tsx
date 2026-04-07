import Link from "next/link"

import { logout } from "@/app/actions/auth"
import {
  createManagedUserAction,
  updateManagedUserAction,
} from "@/app/workspace/users/actions"
import { DeleteUserButton } from "@/app/workspace/users/delete-user-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { WorkspaceNav } from "@/components/workspace-nav"
import { requireRole } from "@/lib/auth"
import {
  getAdminLoginHint,
  getRoleMeta,
  getUserManagementSnapshot,
  type AppUser,
} from "@/lib/user-system"

type PageSearchParams = Promise<{
  tone?: string | string[]
  message?: string | string[]
  q?: string | string[]
  role?: string | string[]
  status?: string | string[]
  page?: string | string[]
}>

const PAGE_SIZE = 6

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? ""
}

function normalizePositiveInteger(value: string) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function selectClassName() {
  return "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50"
}

function countUsers(
  users: AppUser[],
  role: "operator" | "user",
  status?: "active" | "invited" | "disabled"
) {
  return users.filter((user) => {
    if (user.role !== role) {
      return false
    }

    return status ? user.status === status : true
  }).length
}

function buildUsersHref({
  q,
  role,
  status,
  page,
}: {
  q: string
  role: string
  status: string
  page: number
}) {
  const params = new URLSearchParams()

  if (q) {
    params.set("q", q)
  }

  if (role && role !== "all") {
    params.set("role", role)
  }

  if (status && status !== "all") {
    params.set("status", status)
  }

  if (page > 1) {
    params.set("page", String(page))
  }

  const query = params.toString()
  return query ? `/workspace/users?${query}` : "/workspace/users"
}

export default async function UserManagementPage({
  searchParams,
}: {
  searchParams: PageSearchParams
}) {
  const currentUser = await requireRole(["admin"])
  const snapshot = await getUserManagementSnapshot()
  const resolvedSearchParams = await searchParams
  const tone = getStringParam(resolvedSearchParams.tone)
  const message = getStringParam(resolvedSearchParams.message)
  const keyword = getStringParam(resolvedSearchParams.q).trim()
  const selectedRole = getStringParam(resolvedSearchParams.role) || "all"
  const selectedStatus = getStringParam(resolvedSearchParams.status) || "all"
  const requestedPage = normalizePositiveInteger(
    getStringParam(resolvedSearchParams.page)
  )
  const adminLoginHint = getAdminLoginHint()
  const managedUsers = snapshot.users.filter((user) => user.role !== "admin")
  const adminAccount =
    snapshot.users.find((user) => user.role === "admin") ?? currentUser
  const databaseEnabled = snapshot.source === "database"
  const filteredUsers = managedUsers.filter((user) => {
    const matchesKeyword = keyword
      ? [user.name, user.email, user.company ?? ""].some((value) =>
          value.toLowerCase().includes(keyword.toLowerCase())
        )
      : true
    const matchesRole =
      selectedRole === "all" ? true : user.role === selectedRole
    const matchesStatus =
      selectedStatus === "all" ? true : user.status === selectedStatus

    return matchesKeyword && matchesRole && matchesStatus
  })
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))
  const currentPage = Math.min(requestedPage, totalPages)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const paginatedUsers = filteredUsers.slice(pageStart, pageStart + PAGE_SIZE)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-sans">
              User Management
            </p>
            <h1 className="mt-1 text-2xl font-heading tracking-tight">
              账号管理
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
        <WorkspaceNav current="users" role={currentUser.role} />

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex items-center gap-3">
                <CardTitle className="text-4xl font-heading tracking-tight">
                  {currentUser.name}
                </CardTitle>
                <Badge variant="outline" className="uppercase tracking-widest text-xs">
                  {getRoleMeta(currentUser.role).label}
                </Badge>
              </div>
              <CardDescription className="max-w-2xl text-sm leading-relaxed">
                维护运营与商家账号，支持创建、编辑、停用与删除。系统 admin 为唯一内置账号，
                不参与数据库增删改。
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <Card>
              <CardHeader className="pb-4">
                <CardDescription className="uppercase tracking-widest text-xs">
                  管理账号
                </CardDescription>
                <CardTitle className="text-4xl font-heading">
                  {managedUsers.length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-4">
                <CardDescription className="uppercase tracking-widest text-xs">
                  活跃运营
                </CardDescription>
                <CardTitle className="text-4xl font-heading">
                  {countUsers(managedUsers, "operator", "active")}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-4">
                <CardDescription className="uppercase tracking-widest text-xs">
                  商家账号
                </CardDescription>
                <CardTitle className="text-4xl font-heading">
                  {countUsers(managedUsers, "user")}
                </CardTitle>
              </CardHeader>
            </Card>
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

        {!databaseEnabled ? (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-xl font-heading text-destructive">
                当前环境不可写
              </CardTitle>
              <CardDescription className="text-destructive/80">
                未检测到 `DATABASE_URL`，因此只能查看系统 admin 信息，无法创建或维护数据库账号。
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card>
            <CardHeader className="space-y-3">
              <CardTitle className="text-2xl font-heading">创建账号</CardTitle>
              <CardDescription>
                这里创建的平台账号可选为运营或商家。密码至少 8 位，角色与状态可随时调整。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createManagedUserAction} className="space-y-4">
                <fieldset disabled={!databaseEnabled} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="create-name" className="text-sm font-medium">
                        姓名
                      </label>
                      <Input
                        id="create-name"
                        name="name"
                        placeholder="例如 运营A"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="create-email" className="text-sm font-medium">
                        邮箱
                      </label>
                      <Input
                        id="create-email"
                        name="email"
                        type="email"
                        placeholder="name@company.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="create-company" className="text-sm font-medium">
                        公司 / 品牌
                      </label>
                      <Input
                        id="create-company"
                        name="company"
                        placeholder="可选"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="create-password" className="text-sm font-medium">
                        初始密码
                      </label>
                      <Input
                        id="create-password"
                        name="password"
                        type="password"
                        placeholder="至少 8 位"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="create-role" className="text-sm font-medium">
                        角色
                      </label>
                      <select
                        id="create-role"
                        name="role"
                        defaultValue="operator"
                        className={selectClassName()}
                      >
                        <option value="operator">运营</option>
                        <option value="user">商家</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="create-status" className="text-sm font-medium">
                        状态
                      </label>
                      <select
                        id="create-status"
                        name="status"
                        defaultValue="active"
                        className={selectClassName()}
                      >
                        <option value="active">active</option>
                        <option value="invited">invited</option>
                        <option value="disabled">disabled</option>
                      </select>
                    </div>
                  </div>
                  <Button type="submit">创建账号</Button>
                </fieldset>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-3">
              <CardTitle className="text-2xl font-heading">系统 Admin</CardTitle>
              <CardDescription>
                唯一内置超级管理员，不通过数据库创建，也不可在本页编辑或删除。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">
                    账号名
                  </div>
                  <div className="mt-2 font-medium">{adminAccount.name}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">
                    登录邮箱
                  </div>
                  <div className="mt-2 font-medium">{adminLoginHint.email}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">
                    登录别名
                  </div>
                  <div className="mt-2 font-medium">{adminLoginHint.alias}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">
                    密码来源
                  </div>
                  <div className="mt-2 font-medium">AUTH_SECRET</div>
                </div>
              </div>
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                如需停用某个业务账号，优先将状态改为 `disabled`。删除账号会按数据库外键规则同步清理其部分关联数据。
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-heading tracking-tight">已有账号</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                支持直接改姓名、邮箱、公司、角色、状态和密码。密码留空表示保持不变。
              </p>
            </div>
            <Badge variant="outline" className="uppercase tracking-widest text-xs">
              {filteredUsers.length} / {managedUsers.length} Accounts
            </Badge>
          </div>

          <Card>
            <CardHeader className="space-y-3">
              <CardTitle className="text-xl font-heading">搜索与筛选</CardTitle>
              <CardDescription>
                按姓名、邮箱、公司搜索，并按角色与状态筛选；分页结果会保留在 URL 中。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 lg:grid-cols-[1.2fr_0.6fr_0.6fr_auto_auto]">
                <div className="space-y-2">
                  <label htmlFor="user-search" className="text-sm font-medium">
                    关键词
                  </label>
                  <Input
                    id="user-search"
                    name="q"
                    defaultValue={keyword}
                    placeholder="搜索姓名、邮箱或公司"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="user-role-filter" className="text-sm font-medium">
                    角色
                  </label>
                  <select
                    id="user-role-filter"
                    name="role"
                    defaultValue={selectedRole}
                    className={selectClassName()}
                  >
                    <option value="all">全部角色</option>
                    <option value="operator">运营</option>
                    <option value="user">商家</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="user-status-filter" className="text-sm font-medium">
                    状态
                  </label>
                  <select
                    id="user-status-filter"
                    name="status"
                    defaultValue={selectedStatus}
                    className={selectClassName()}
                  >
                    <option value="all">全部状态</option>
                    <option value="active">active</option>
                    <option value="invited">invited</option>
                    <option value="disabled">disabled</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button type="submit" variant="outline" className="w-full">
                    应用筛选
                  </Button>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    className="w-full"
                    render={<Link href="/workspace/users" />}
                    nativeButton={false}
                  >
                    重置
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                没有匹配的账号结果。可以调整筛选条件，或先在上方创建一个运营或商家账号。
              </CardContent>
            </Card>
          ) : null}

          {paginatedUsers.map((user) => (
            <Card key={user.id}>
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl font-heading">{user.name}</CardTitle>
                    <CardDescription className="mt-1">
                      创建于 {formatDate(user.createdAt)}，当前角色为 {getRoleMeta(user.role).label}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="uppercase tracking-widest text-[10px]">
                      {user.status}
                    </Badge>
                    <Badge variant="outline" className="uppercase tracking-widest text-[10px]">
                      {getRoleMeta(user.role).label}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <form action={updateManagedUserAction} className="space-y-4">
                  <input type="hidden" name="id" value={user.id} />
                  <fieldset disabled={!databaseEnabled} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <div className="space-y-2">
                        <label htmlFor={`name-${user.id}`} className="text-sm font-medium">
                          姓名
                        </label>
                        <Input
                          id={`name-${user.id}`}
                          name="name"
                          defaultValue={user.name}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor={`email-${user.id}`} className="text-sm font-medium">
                          邮箱
                        </label>
                        <Input
                          id={`email-${user.id}`}
                          name="email"
                          type="email"
                          defaultValue={user.email}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor={`company-${user.id}`} className="text-sm font-medium">
                          公司 / 品牌
                        </label>
                        <Input
                          id={`company-${user.id}`}
                          name="company"
                          defaultValue={user.company ?? ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor={`role-${user.id}`} className="text-sm font-medium">
                          角色
                        </label>
                        <select
                          id={`role-${user.id}`}
                          name="role"
                          defaultValue={user.role}
                          className={selectClassName()}
                        >
                          <option value="operator">运营</option>
                          <option value="user">商家</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor={`status-${user.id}`} className="text-sm font-medium">
                          状态
                        </label>
                        <select
                          id={`status-${user.id}`}
                          name="status"
                          defaultValue={user.status}
                          className={selectClassName()}
                        >
                          <option value="active">active</option>
                          <option value="invited">invited</option>
                          <option value="disabled">disabled</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor={`password-${user.id}`} className="text-sm font-medium">
                          重置密码
                        </label>
                        <Input
                          id={`password-${user.id}`}
                          name="password"
                          type="password"
                          placeholder="留空则不修改"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button type="submit">保存修改</Button>
                      <span className="text-xs text-muted-foreground">
                        修改邮箱时会校验唯一性，重置密码时至少 8 位。
                      </span>
                    </div>
                  </fieldset>
                </form>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-4">
                  <div className="text-sm text-muted-foreground">
                    删除后不可恢复，且与该账号绑定的部分商品、需求或项目会按数据库约束一并处理。
                  </div>
                  <DeleteUserButton
                    userId={user.id}
                    userName={user.name}
                    disabled={!databaseEnabled}
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredUsers.length > 0 ? (
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
                <div className="text-sm text-muted-foreground">
                  第 {currentPage} / {totalPages} 页，当前展示第 {pageStart + 1}-
                  {Math.min(pageStart + PAGE_SIZE, filteredUsers.length)} 条，共 {filteredUsers.length} 条结果。
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={currentPage <= 1}
                    render={
                      <Link
                        href={buildUsersHref({
                          q: keyword,
                          role: selectedRole,
                          status: selectedStatus,
                          page: currentPage - 1,
                        })}
                      />
                    }
                    nativeButton={false}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    disabled={currentPage >= totalPages}
                    render={
                      <Link
                        href={buildUsersHref({
                          q: keyword,
                          role: selectedRole,
                          status: selectedStatus,
                          page: currentPage + 1,
                        })}
                      />
                    }
                    nativeButton={false}
                  >
                    下一页
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </section>
      </main>
    </div>
  )
}
