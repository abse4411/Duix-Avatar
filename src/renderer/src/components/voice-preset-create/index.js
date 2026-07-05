import { createApp } from 'vue'
import TDesign from 'tdesign-vue-next'
import VoicePresetCreateView from './VoicePresetCreateView.vue'
import i18n from '@renderer/i18n/index.js'

export { default as VoicePresetForm } from './VoicePresetForm.vue'
export { VoicePresetCreateView }

export const createVoicePreset = (props = {}) => {
  const rootNode = document.createElement('div')
  document.body.appendChild(rootNode)

  return new Promise((resolve) => {
    const options = {
      ...props,
      visible: true,
      onClose(result) {
        resolve(result)
      },
      onClosed: () => {
        app.unmount()
        document.body.removeChild(rootNode)
      }
    }

    const app = createApp(VoicePresetCreateView, options).use(TDesign).use(i18n)
    app.mount(rootNode)
  })
}
