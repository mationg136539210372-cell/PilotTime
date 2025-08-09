import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    // Show update available notification
    if (confirm('New content available, reload?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline')
    // Optionally show offline ready notification
  },
})

export { updateSW }