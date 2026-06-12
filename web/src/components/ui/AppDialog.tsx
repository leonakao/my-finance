import * as Dialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'

type AppDialogProps = {
  children: ReactNode
  className?: string
  description?: string
  eyebrow?: string
  onOpenChange: (open: boolean) => void
  open: boolean
  title: string
}

export function AppDialog({
  children,
  className = '',
  description,
  eyebrow,
  onOpenChange,
  open,
  title,
}: AppDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className={`dialog-content ${className}`.trim()}>
          <div className="panel-header compact">
            <div>
              {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
              <Dialog.Title>{title}</Dialog.Title>
            </div>
          </div>
          {description ? <Dialog.Description className="muted">{description}</Dialog.Description> : null}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
