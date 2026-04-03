import Link from "next/link"

import { logout } from "@/app/actions/auth"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { requireUser } from "@/lib/auth"
import {
  REQUEST_STATUSES,
  type AppUser,
  type CampaignRequest,
  type RequestStatus,
  type UserRole,
  getRoleMeta,
  getUserSystemSnapshot,
} from "@/lib/user-system"

const requestStatusMeta: Record<
  RequestStatus,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  submitted: { label: "待审核", variant: "secondary" },
  in_review: { label: "审核中", variant: "outline" },
  producing: { label: "制作中", variant: "default" },
  delivered: { label: "已交付", variant: "outline" },
}

const roleActions: Record<UserRole, string[]> = {
  admin: ["新增/停用账号", "审核需求并分配运营", "配置模特/产品/指令资源库"],
  operator: ["接收并制作视频任务", "更新制作状态", "维护资源库并同步交付结果"],
  user: ["提交商品 Brief", "查看模特库", "维护自己的产品资源"],
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function getVisibleRequests(user: AppUser, requests: CampaignRequest[]) {
  if (user.role === "admin") {
    return requests
  }

  if (user.role === "operator") {
    return requests.filter(
      (request) =>
        request.operatorName === user.name || request.operatorName === null
    )
  }

  return requests.filter((request) => request.requesterName === user.name)
}

function getVisibleUsers(user: AppUser, users: AppUser[]) {
  if (user.role === "admin") {
    return users
  }

  if (user.role === "operator") {
    return users.filter((item) => item.role !== "admin")
  }

  return users.filter((item) => item.id === user.id)
}

export default async function WorkspacePage() {
  const currentUser = await requireUser()
  const snapshot = await getUserSystemSnapshot()
  const visibleRequests = getVisibleRequests(currentUser, snapshot.requests)
  const visibleUsers = getVisibleUsers(currentUser, snapshot.users)

  return (
    <div className="min-h-screen bg-white text-black selection:bg-black selection:text-white">
      <header className="border-b border-black">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8 lg:px-10">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-neutral-500 font-sans">
              Workspace
            </p>
            <h1 className="mt-2 text-3xl font-heading tracking-tight">
              {getRoleMeta(currentUser.role).label} 工作台
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              className="rounded-none border-black text-sm uppercase tracking-widest px-6 py-6 hover:bg-neutral-100 transition-colors"
              render={<Link href="/" />}
              nativeButton={false}
            >
              返回首页
            </Button>
            <form action={logout}>
              <Button type="submit" className="rounded-none bg-black text-white text-sm uppercase tracking-widest px-6 py-6 hover:bg-neutral-800 transition-colors">
                退出登录
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-12 px-6 py-16 lg:px-10">
        <section className="grid gap-8 border border-black bg-white p-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Badge variant="outline" className="rounded-none border-black uppercase tracking-widest text-xs px-3 py-1">
              {getRoleMeta(currentUser.role).label}
            </Badge>
            <div className="space-y-4">
              <h2 className="text-5xl font-heading tracking-tight">
                {currentUser.name}
              </h2>
              <p className="max-w-2xl text-lg leading-relaxed text-neutral-500 font-sans">
                {getRoleMeta(currentUser.role).description} 当前账号邮箱为{" "}
                {currentUser.email}，已通过会话登录并进入角色工作区。
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 pt-4">
              {roleActions[currentUser.role].map((action) => (
                <div key={action} className="border border-black bg-white p-6">
                  <div className="text-sm font-sans tracking-wide leading-relaxed">{action}</div>
                </div>
              ))}
            </div>
            <div>
              <Button
                variant="outline"
                className="rounded-none border-black px-6 py-6 text-sm uppercase tracking-widest hover:bg-neutral-100 transition-colors"
                render={<Link href="/workspace/resources" />}
                nativeButton={false}
              >
                进入资源库
              </Button>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-1">
            <Card className="rounded-none border-black shadow-none bg-white">
              <CardHeader className="pb-4">
                <CardDescription className="uppercase tracking-widest text-xs">可见账号</CardDescription>
                <CardTitle className="text-4xl font-heading">{visibleUsers.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="rounded-none border-black shadow-none bg-white">
              <CardHeader className="pb-4">
                <CardDescription className="uppercase tracking-widest text-xs">可见需求</CardDescription>
                <CardTitle className="text-4xl font-heading">
                  {visibleRequests.length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="rounded-none border-black shadow-none bg-white">
              <CardHeader className="pb-4">
                <CardDescription className="uppercase tracking-widest text-xs">当前数据源</CardDescription>
                <CardTitle className="text-4xl font-heading">
                  {snapshot.source === "database" ? "DB" : "N/A"}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] pt-4">
          <Card className="rounded-none border-black shadow-none bg-white">
            <CardHeader className="space-y-3">
              <CardTitle className="text-3xl font-heading">
                {currentUser.role === "user" ? "我的账号" : "可访问账号"}
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed text-neutral-500 font-sans">
                Admin 可查看全部账号，运营不展示 admin，商家仅展示自己的账号信息。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-black hover:bg-transparent">
                    <TableHead className="font-heading text-black uppercase tracking-widest text-xs">姓名</TableHead>
                    <TableHead className="font-heading text-black uppercase tracking-widest text-xs">角色</TableHead>
                    <TableHead className="font-heading text-black uppercase tracking-widest text-xs">邮箱</TableHead>
                    <TableHead className="font-heading text-black uppercase tracking-widest text-xs">公司</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleUsers.map((user) => (
                    <TableRow key={user.id} className="border-neutral-200 hover:bg-neutral-50 transition-colors">
                      <TableCell className="font-sans py-4">{user.name}</TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className="rounded-none border-black uppercase tracking-widest text-[10px]">
                          {getRoleMeta(user.role).label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-sans py-4">{user.email}</TableCell>
                      <TableCell className="font-sans py-4">{user.company ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="rounded-none border-black shadow-none bg-white">
            <CardHeader className="space-y-3">
              <CardTitle className="text-3xl font-heading">访问规则</CardTitle>
              <CardDescription className="text-sm leading-relaxed text-neutral-500 font-sans">
                角色越高，能看到的资源范围越大；商家只能看自己的需求。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border border-black p-6">
                <div className="text-xs uppercase tracking-[0.4em] text-neutral-500">
                  Admin
                </div>
                <p className="mt-3 font-sans leading-relaxed text-neutral-800">
                  管理所有用户和需求，可通过受保护的 /api/users 接口维护平台账号。
                </p>
              </div>
              <div className="border border-black p-6">
                <div className="text-xs uppercase tracking-[0.4em] text-neutral-500">
                  Operator
                </div>
                <p className="mt-3 font-sans leading-relaxed text-neutral-800">
                  查看待处理或分配给自己的需求，不可创建平台账号。
                </p>
              </div>
              <div className="border border-black p-6">
                <div className="text-xs uppercase tracking-[0.4em] text-neutral-500">
                  User
                </div>
                <p className="mt-3 font-sans leading-relaxed text-neutral-800">
                  只能查看自己的账号与商品需求，用于商家侧投放协同。
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="pt-4">
          <Card className="rounded-none border-black shadow-none bg-white">
            <CardHeader className="space-y-3">
              <CardTitle className="text-3xl font-heading">
                {currentUser.role === "user" ? "我的需求" : "需求队列"}
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed text-neutral-500 font-sans">
                按当前角色过滤可访问的 campaign requests。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-black hover:bg-transparent">
                    <TableHead className="font-heading text-black uppercase tracking-widest text-xs">商品</TableHead>
                    <TableHead className="font-heading text-black uppercase tracking-widest text-xs">发起方</TableHead>
                    <TableHead className="font-heading text-black uppercase tracking-widest text-xs">偏好模特</TableHead>
                    <TableHead className="font-heading text-black uppercase tracking-widest text-xs">运营</TableHead>
                    <TableHead className="font-heading text-black uppercase tracking-widest text-xs">状态</TableHead>
                    <TableHead className="font-heading text-black uppercase tracking-widest text-xs">提交时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRequests.map((request) => {
                    const statusMeta =
                      requestStatusMeta[
                        REQUEST_STATUSES.includes(request.status)
                          ? request.status
                          : "submitted"
                      ]

                    return (
                      <TableRow key={request.id} className="border-neutral-200 hover:bg-neutral-50 transition-colors">
                        <TableCell className="whitespace-normal py-4 font-sans">
                          <div className="space-y-2">
                            <div className="font-medium tracking-wide">
                              {request.productName}
                            </div>
                            <div className="text-xs leading-relaxed text-neutral-500">
                              {request.brief ?? "暂无补充说明"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-sans py-4">{request.requesterName}</TableCell>
                        <TableCell className="font-sans py-4">{request.preferredModelName ?? "待选择"}</TableCell>
                        <TableCell className="font-sans py-4">{request.operatorName ?? "待分配"}</TableCell>
                        <TableCell className="py-4">
                          <Badge
                            variant={statusMeta.variant}
                            className="rounded-none uppercase tracking-widest text-[10px] px-3 py-1 border-black"
                          >
                            {statusMeta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-sans text-sm py-4 text-neutral-500">{formatDate(request.createdAt)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}
