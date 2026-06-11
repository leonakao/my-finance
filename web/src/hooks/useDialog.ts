import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter((element) => !element.hasAttribute('disabled'))
}

function cycleTabFocus(event: KeyboardEvent, container: HTMLElement): void {
  const currentFocusable = getFocusableElements(container)
  if (!currentFocusable.length) {
    event.preventDefault()
    return
  }

  const first = currentFocusable[0] ?? null
  const last = currentFocusable[currentFocusable.length - 1] ?? null
  const activeElement = document.activeElement

  if (event.shiftKey && activeElement === first) {
    event.preventDefault()
    last?.focus()
    return
  }

  if (!event.shiftKey && activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}

export function useDialog(onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const lastFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    lastFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }

    const focusable = getFocusableElements(dialog)
    focusable[0]?.focus()

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const currentDialog = dialogRef.current
      if (!currentDialog) {
        return
      }

      cycleTabFocus(event, currentDialog)
    }

    dialog.addEventListener('keydown', handleKeydown)

    return () => {
      dialog.removeEventListener('keydown', handleKeydown)
      lastFocusedRef.current?.focus()
    }
  }, [onClose])

  return dialogRef
}
