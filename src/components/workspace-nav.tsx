import Link from "next/link"

import { cn } from "@/lib/utils"
import type { UserRole } from "@/lib/user-system"

interface WorkspaceNavProps {
  current: "overview" | "resources" | "users"
  role: UserRole
}

interface NavItem {
  key: "overview" | "resources" | "users"
  label: string
  href: string
  roles: UserRole[]
}

const NAV_ITEMS: NavItem[] = [
  {
    key: "overview",
    label: "工作台",
    href: "/workspace",
    roles: ["admin", "operator", "user"],
  },
  {
    key: "resources",
    label: "资源库",
    href: "/workspace/resources",
    roles: ["admin", "operator", "user"],
  },
  {
    key: "users",
    label: "账号管理",
    href: "/workspace/users",
    roles: ["admin"],
  },
] as const

export function WorkspaceNav({ current, role }: WorkspaceNavProps) {
  return (
    <nav className="rounded-xl border bg-card p-2">
      <div className="flex flex-wrap gap-2">
        {NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              "rounded-lg px-4 py-2 text-sm transition-colors",
              item.key === current
                ? "bg-black text-white"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
