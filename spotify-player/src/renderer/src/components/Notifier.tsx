import { Toast, ToastBody, Toaster, ToastTitle, useId, useToastController } from '@fluentui/react-components'
import { useEffect } from 'react'
import { onNotify } from '@/lib/notify'

/** Ponte entre notify() e os Toasts do Fluent UI. */
export function Notifier() {
  const toasterId = useId('toaster')
  const { dispatchToast } = useToastController(toasterId)
  useEffect(
    () =>
      onNotify((n) => {
        dispatchToast(
          <Toast>
            <ToastTitle>{n.title}</ToastTitle>
            {n.body && <ToastBody>{n.body}</ToastBody>}
          </Toast>,
          { intent: n.intent, timeout: n.timeout ?? (n.intent === 'error' ? 7000 : 4000), position: 'bottom-end' }
        )
      }),
    [dispatchToast]
  )
  return <Toaster toasterId={toasterId} offset={{ vertical: 104, horizontal: 20 }} limit={4} />
}
