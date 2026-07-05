import { defineStore } from 'pinia'
import { reactive } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const stored = localStorage.getItem('theme')
  const themeState = reactive({
    mode: stored === 'dark' ? 'dark' : 'light'
  })

  const applyTheme = (mode) => {
    document.documentElement.setAttribute('data-theme', mode)
  }

  const setMode = (mode) => {
    themeState.mode = mode
    localStorage.setItem('theme', mode)
    applyTheme(mode)
  }

  const toggle = () => {
    setMode(themeState.mode === 'light' ? 'dark' : 'light')
  }

  const init = () => {
    applyTheme(themeState.mode)
  }

  return { themeState, setMode, toggle, init }
})
