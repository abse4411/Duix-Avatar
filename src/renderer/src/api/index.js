

export function videoPage({ page = 1, pageSize = 1, name = '' }) {
  return window.electron.ipcRenderer.invoke('video/page', { page, pageSize, name })
}

export function findVideo(id) {
  return window.electron.ipcRenderer.invoke('video/find', id)
}

export function removeVideo(id) {
  return window.electron.ipcRenderer.invoke('video/remove', id)
}

export function saveVideo(video) {
  return window.electron.ipcRenderer.invoke('video/save', video)
}

export function makeVideo(id) {
  return window.electron.ipcRenderer.invoke('video/make', id)
}

export function exportVideo(id, outputPath) {
  return window.electron.ipcRenderer.invoke('video/export', id, outputPath)
}

export function getSubtitle(videoId) {
  return window.electron.ipcRenderer.invoke('video/getSubtitle', videoId)
}

export function saveSubtitle(videoId, srtContent) {
  return window.electron.ipcRenderer.invoke('video/saveSubtitle', videoId, srtContent)
}

export function getSystemFonts() {
  return window.electron.ipcRenderer.invoke('video/getSystemFonts')
}

export function detectEncoders() {
  return window.electron.ipcRenderer.invoke('video/detectEncoders')
}

export function burnVideoSubtitle(videoId, assContent, encoder) {
  return window.electron.ipcRenderer.invoke('video/burnSubtitle', videoId, assContent, { encoder })
}

export function renderSubtitleFrame(videoId, assContent, timeSeconds) {
  return window.electron.ipcRenderer.invoke('video/renderFrame', videoId, assContent, timeSeconds)
}

export function onBurnProgress(callback) {
  const off = window.electron.ipcRenderer.on('video/burnProgress', (event, data) => {
    callback(data)
  })
  return off
}

export function modifyVideo(video) {
  return window.electron.ipcRenderer.invoke('video/modify', video)
}

export function countVideo(name = '') {
  return window.electron.ipcRenderer.invoke('video/count', name)
}

export function modelPage({ page = 1, pageSize = 1, name = '' }) {
  return window.electron.ipcRenderer.invoke('model/page', { page, pageSize, name })
  
}

export function findModel(id) {
  return window.electron.ipcRenderer.invoke('model/find', id)
}

export function addModel({ name, videoPath }) {
  return window.electron.ipcRenderer.invoke('model/addModel', name, videoPath)
}

export function addModelNoAudio({ name, videoPath }) {
  return window.electron.ipcRenderer.invoke('model/addModelNoAudio', name, videoPath)
}

export function countModel(name = '') {
  return window.electron.ipcRenderer.invoke('model/count', name)
}

export function removeModel(id) {
  return window.electron.ipcRenderer.invoke('model/remove', id)
}

export function getContext(key) {
  return window.electron.ipcRenderer.invoke('context/get', key)
}

export function saveContext(key, val) {
  return window.electron.ipcRenderer.invoke('context/save', key, val)
}

export function audition(voiceId, text) {
  return window.electron.ipcRenderer.invoke('voice/audition', voiceId, text)
}

export function voicePresetPage({ page = 1, pageSize = 10, name = '' }) {
  return window.electron.ipcRenderer.invoke('voicePreset/page', { page, pageSize, name })
}

export function findVoicePreset(id) {
  return window.electron.ipcRenderer.invoke('voicePreset/find', id)
}

export function addVoicePreset(preset) {
  return window.electron.ipcRenderer.invoke('voicePreset/add', preset)
}

export function updateVoicePreset(preset) {
  return window.electron.ipcRenderer.invoke('voicePreset/update', preset)
}

export function removeVoicePreset(id) {
  return window.electron.ipcRenderer.invoke('voicePreset/remove', id)
}

export function countVoicePreset(name = '') {
  return window.electron.ipcRenderer.invoke('voicePreset/count', name)
}

export function voicePresetAudition(presetId, text) {
  return window.electron.ipcRenderer.invoke('voicePreset/audition', presetId, text)
}
