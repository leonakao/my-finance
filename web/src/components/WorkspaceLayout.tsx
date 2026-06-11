import type { MouseEvent, ReactNode } from 'react'

type NavigationItem = {
  href: string
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
  { href: '/app/dashboard', label: 'Dashboard' },
  { href: '/app/mensal', label: 'Mensal' },
  { href: '/app/importar', label: 'Importar' },
  { href: '/app/regras', label: 'Regras' },
  { href: '/app/budget-groups', label: 'Budget groups' },
]

function shouldHandleClientNavigation(event: MouseEvent<HTMLAnchorElement>) {
  return !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
}

export function WorkspaceLayout({ children, currentPath, intro, onNavigate, onSignOut, title }: WorkspaceLayoutProps) {
  return (
    <div className="workspace-shell">
      <a href="#main-content" className="skip-link">
        Pular para o conteúdo
      </a>
      <header className="workspace-header">
        <div className="brand-block">
          <div className="eyebrow">Finanças pessoais</div>
          <h1>{title}</h1>
          <p className="workspace-intro">{intro}</p>
        </div>
        <div className="workspace-actions">
          <nav aria-label="Principal">
            <ul className="workspace-nav">
              {NAV_ITEMS.map((item) => {
                const active = currentPath === item.href

                return (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={active ? 'nav-link active' : 'nav-link'}
                      onClick={(event) => {
                        if (!shouldHandleClientNavigation(event)) {
                          return
                        }

                        event.preventDefault()
                        onNavigate(item.href)
                      }}
                    >
                      {item.label}
                    </a>
                  </li>
                )
              })}
            </ul>
          </nav>
          <button type="button" className="ghost" onClick={() => void onSignOut()}>
            Sair
          </button>
        </div>
      </header>
      <main id="main-content" className="app-shell">
        {children}
      </main>
    </div>
  )
}
