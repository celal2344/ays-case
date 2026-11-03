import { Link } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLogout } from '@/features/auth/hooks/use-logout'
import { selectUser, useAuthStore } from '@/features/auth/store'

export function UserMenu() {
  const { t } = useTranslation()
  const user = useAuthStore(selectUser)
  const logout = useLogout()

  if (!user) {
    return (
      <Button variant="outline" render={<Link to="/login" />}>
        {t('nav.login')}
      </Button>
    )
  }

  const fullName = `${user.firstName} ${user.lastName}`
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" className="gap-2 px-2" aria-label={fullName} />}
      >
        <Avatar className="size-7">
          <AvatarImage src={user.image} alt="" />
          <AvatarFallback>{user.firstName.slice(0, 1)}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-32 truncate sm:inline">{user.firstName}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between gap-2">
            <span className="truncate">{fullName}</span>
            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
              {t(`userMenu.role.${user.role}`)}
            </Badge>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <LogOut className="size-4" />
          {t('userMenu.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
