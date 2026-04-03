"use client"

import { useActionState } from "react"

import { login, signup, type AuthActionState } from "@/app/actions/auth"
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
import { Label } from "@/components/ui/label"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

const initialState: AuthActionState = {}

interface AuthPanelProps {
  allowSignup: boolean
  adminEmail: string
  adminAlias: string
}

export function AuthPanel({
  allowSignup,
  adminEmail,
  adminAlias,
}: AuthPanelProps) {
  const [loginState, loginAction, loginPending] = useActionState(
    login,
    initialState
  )
  const [signupState, signupAction, signupPending] = useActionState(
    signup,
    initialState
  )

  return (
    <Card className="rounded-none border-black shadow-none bg-white">
      <CardHeader className="space-y-6 pb-8">
        <Badge variant="outline" className="w-fit rounded-none border-black uppercase tracking-widest text-xs px-3 py-1">
          Authentication
        </Badge>
        <div className="space-y-3">
          <CardTitle className="text-3xl font-heading">登录或创建商家账号</CardTitle>
          <CardDescription className="leading-relaxed text-neutral-500 font-sans">
            Admin 与运营可直接登录已有账号，商家可以注册 user 账号后提交带货需求。
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-8 font-sans">
        <Tabs defaultValue="login" className="gap-6">
          <TabsList variant="line" className="mb-6">
            <TabsTrigger value="login" className="text-sm uppercase tracking-widest">登录</TabsTrigger>
            <TabsTrigger value="signup" className="text-sm uppercase tracking-widest">注册</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form action={loginAction} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="login-email" className="uppercase tracking-widest text-xs">邮箱</Label>
                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  placeholder="name@company.com"
                  required
                  className="rounded-none border-black h-12 px-4 focus-visible:ring-1 focus-visible:ring-black"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="login-password" className="uppercase tracking-widest text-xs">密码</Label>
                <Input
                  id="login-password"
                  name="password"
                  type="password"
                  placeholder="请输入密码"
                  required
                  className="rounded-none border-black h-12 px-4 focus-visible:ring-1 focus-visible:ring-black"
                />
              </div>
              {loginState?.error ? (
                <p className="text-sm text-red-600">{loginState.error}</p>
              ) : null}
              <Button
                type="submit"
                disabled={loginPending}
                className="w-full rounded-none bg-black py-7 text-sm uppercase tracking-widest text-white hover:bg-neutral-800 transition-colors mt-4"
              >
                {loginPending ? "登录中..." : "登录进入工作台"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form action={signupAction} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="signup-name" className="uppercase tracking-widest text-xs">联系人</Label>
                <Input
                  id="signup-name"
                  name="name"
                  placeholder="品牌负责人姓名"
                  required
                  className="rounded-none border-black h-12 px-4 focus-visible:ring-1 focus-visible:ring-black"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="signup-company" className="uppercase tracking-widest text-xs">公司 / 品牌</Label>
                <Input
                  id="signup-company"
                  name="company"
                  placeholder="例如 Luna Beauty"
                  className="rounded-none border-black h-12 px-4 focus-visible:ring-1 focus-visible:ring-black"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="signup-email" className="uppercase tracking-widest text-xs">邮箱</Label>
                <Input
                  id="signup-email"
                  name="email"
                  type="email"
                  placeholder="brand@company.com"
                  required
                  className="rounded-none border-black h-12 px-4 focus-visible:ring-1 focus-visible:ring-black"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="signup-password" className="uppercase tracking-widest text-xs">密码</Label>
                <Input
                  id="signup-password"
                  name="password"
                  type="password"
                  placeholder="至少 8 位"
                  required
                  className="rounded-none border-black h-12 px-4 focus-visible:ring-1 focus-visible:ring-black"
                />
              </div>
              {!allowSignup ? (
                <p className="text-sm text-neutral-500">
                  当前数据库不可用，商家注册不可用；仅支持 admin 密钥登录。
                </p>
              ) : null}
              {signupState?.error ? (
                <p className="text-sm text-red-600">{signupState.error}</p>
              ) : null}
              <Button
                type="submit"
                disabled={signupPending || !allowSignup}
                className="w-full rounded-none bg-black py-7 text-sm uppercase tracking-widest text-white hover:bg-neutral-800 transition-colors mt-4"
              >
                {signupPending ? "注册中..." : "注册为商家用户"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="space-y-3 border border-black bg-neutral-50 p-6 mt-8">
          <div className="space-y-2 text-sm text-neutral-600 font-sans">
            <p className="font-heading text-lg text-black">唯一 Admin 登录</p>
            <p className="tracking-wide">邮箱可填写 {adminEmail} 或 {adminAlias}</p>
            <p className="tracking-wide">密码使用环境变量 AUTH_SECRET</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
