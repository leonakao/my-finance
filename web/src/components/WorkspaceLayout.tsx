import * as Dialog from '@radix-ui/react-dialog'
import * as Tooltip from '@radix-ui/react-tooltip'
import {
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  LogOut,
  Menu,
  SlidersHorizontal,
  Target,
  Upload,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from 'react'

type NavigationItem = {
  href: string
  icon: LucideIcon
  label: string
}

type WorkspaceLayoutProps = {
  children: ReactNode
  currentPath: string
  intro: string
  onNavigate: (href: string) => void
  onSignOut: () => Promise<void>
  title: string
}

const NAV_ITEMS: NavigationItem[] = [
  { href: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/app/mensal', icon: CalendarDays, label: 'Mensal' },
  { href: '/app/importar', icon: Upload, label: 'Importar' },
  { href: '/app/regras', icon: SlidersHorizontal, label: 'Regras' },
  { href: '/app/budget-groups', icon: Target, label: 'Grupos' },
]

const SIDEBAR_STORAGE_KEY = 'finance.sidebar.collapsed'
const DESKTOP_MEDIA_QUERY = '(min-width: 961px)'

function shouldHandleClientNavigation(event: MouseEvent<HTMLAnchorElement>) {
  return !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
}

function useDesktopMediaQuery() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY)
      mediaQuery.addEventListener('change', onStoreChange)
      return () => mediaQuery.removeEventListener('change', onStoreChange)
    },
    () => window.matchMedia(DESKTOP_MEDIA_QUERY).matches,
    () => true,
  )
}

type SidebarNavProps = {
  collapsed: boolean
  currentPath: string
  onItemSelect: (href: string) => void
  onSignOut: () => Promise<void>
}

function SidebarNav({ collapsed, currentPath, onItemSelect, onSignOut }: SidebarNavProps) {
  return (
    <>
      <div className="sidebar-brand">
        <div className="sidebar-mark" aria-hidden="true">
          F
        </div>
        {!collapsed ? (
          <div className="sidebar-brand-copy">
            <strong translate="no">Finance Hub</strong>
            <span>Leitura mensal, revisão e regras em um fluxo só.</span>
          </div>
        ) : null}
      </div>

      <nav aria-label="Principal" className="sidebar-nav">
        <ul className="workspace-nav">
          {NAV_ITEMS.map((item) => {
            const active = currentPath === item.href
            const Icon = item.icon
            const link = (
              <a
                href={item.href}
                aria-current={active ? 'page' : undefined}
                aria-label={collapsed ? item.label : undefined}
                className={active ? 'nav-link active' : 'nav-link'}
                onClick={(event) => {
                  if (!shouldHandleClientNavigation(event)) {
                    return
                  }

                  event.preventDefault()
                  onItemSelect(item.href)
                }}
              >
                <span className="nav-icon" aria-hidden="true">
                  <Icon size={18} strokeWidth={1.8} />
                </span>
                {!collapsed ? <span className="nav-label">{item.label}</span> : null}
              </a>
            )

            if (!collapsed) {
              return <li key={item.href}>{link}</li>
            }

            return (
              <li key={item.href}>
                <Tooltip.Root delayDuration={500}>
                  <Tooltip.Trigger asChild>{link}</Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content side="right" sideOffset={12} className="tooltip-content">
                      {item.label}
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="ghost sidebar-signout"
          aria-label={collapsed ? 'Sair' : undefined}
          onClick={() => void onSignOut()}
        >
          <span className="nav-icon" aria-hidden="true">
            <LogOut size={18} strokeWidth={1.8} />
          </span>
          {!collapsed ? <span className="nav-label">Sair</span> : null}
        </button>
      </div>
    </>
  )
}

export function WorkspaceLayout({ children, currentPath, intro, onNavigate, onSignOut, title }: WorkspaceLayoutProps) {
  const isDesktop = useDesktopMediaQuery()
  const [collapsed, setCollapsed] = useState(() => window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true')
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed))
  }, [collapsed])

  return (
    <Tooltip.Provider delayDuration={500} skipDelayDuration={0}>
      <div className={collapsed ? 'workspace-shell is-collapsed' : 'workspace-shell'}>
        <a href="#main-content" className="skip-link">
          Pular para o conteúdo
        </a>

        {isDesktop ? (
          <DesktopSidebar
            collapsed={collapsed}
            currentPath={currentPath}
            onNavigate={onNavigate}
            onSignOut={onSignOut}
            onToggle={() => setCollapsed((current) => !current)}
          />
        ) : (
          <MobileSidebar
            currentPath={currentPath}
            onNavigate={onNavigate}
            onOpenChange={setMobileOpen}
            onSignOut={onSignOut}
            open={mobileOpen}
          />
        )}

        <div className="workspace-main">
          {!isDesktop ? (
            <div className="mobile-toolbar">
              <button
                type="button"
                className="ghost mobile-menu-trigger"
                aria-label="Abrir navegação"
                onClick={() => setMobileOpen(true)}
              >
                <Menu size={20} strokeWidth={1.8} />
              </button>
              <div className="mobile-toolbar-copy">
                <strong>Finanças</strong>
                <span>{title}</span>
              </div>
            </div>
          ) : null}

          <main id="main-content" className="app-shell">
            <header className="content-header panel">
              <h1>{title}</h1>
              <p>{intro}</p>
            </header>
            {children}
          </main>
        </div>
      </div>
    </Tooltip.Provider>
  )
}

type DesktopSidebarProps = {
  collapsed: boolean
  currentPath: string
  onNavigate: (href: string) => void
  onSignOut: () => Promise<void>
  onToggle: () => void
}

function DesktopSidebar({ collapsed, currentPath, onNavigate, onSignOut, onToggle }: DesktopSidebarProps) {
  return (
    <aside className="workspace-sidebar">
      <button
        type="button"
        className="sidebar-toggle"
        aria-label={collapsed ? 'Expandir navegação lateral' : 'Colapsar navegação lateral'}
        onClick={onToggle}
      >
        <span aria-hidden="true">
          {collapsed ? <ChevronsRight size={16} strokeWidth={1.8} /> : <ChevronsLeft size={16} strokeWidth={1.8} />}
        </span>
      </button>
      <SidebarNav collapsed={collapsed} currentPath={currentPath} onItemSelect={onNavigate} onSignOut={onSignOut} />
    </aside>
  )
}

type MobileSidebarProps = {
  currentPath: string
  onNavigate: (href: string) => void
  onOpenChange: (open: boolean) => void
  onSignOut: () => Promise<void>
  open: boolean
}

function MobileSidebar({ currentPath, onNavigate, onOpenChange, onSignOut, open }: MobileSidebarProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay mobile-sidebar-overlay" />
        <Dialog.Content className="mobile-sidebar-sheet">
          <Dialog.Title className="sr-only">Navegação principal</Dialog.Title>
          <SidebarNav
            collapsed={false}
            currentPath={currentPath}
            onItemSelect={(href) => {
              onNavigate(href)
              onOpenChange(false)
            }}
            onSignOut={async () => {
              onOpenChange(false)
              await onSignOut()
            }}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
