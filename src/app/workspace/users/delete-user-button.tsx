"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { deleteManagedUserAction } from "@/app/workspace/users/actions"

interface DeleteUserButtonProps {
  userId: string
  userName: string
  disabled?: boolean
}

export function DeleteUserButton({
  userId,
  userName,
  disabled = false,
}: DeleteUserButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button variant="destructive" disabled={disabled} />}
      >
        删除账号
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除 {userName}？</AlertDialogTitle>
          <AlertDialogDescription>
            删除后不可恢复，且与该账号绑定的部分商品、需求或项目会按数据库外键规则一并处理。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <form action={deleteManagedUserAction}>
            <input type="hidden" name="id" value={userId} />
            <AlertDialogAction type="submit" variant="destructive">
              确认删除
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
