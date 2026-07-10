import { ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import dayjs from 'dayjs'
import { assetPath } from '../config/config.js'
import {
  insert,
  update,
  selectPage,
  count,
  selectByID,
  remove as deletePreset
} from '../dao/voice-preset.js'
import { generateAudio as generateAudioApi } from '../api/index-tts.js'
import log from '../logger.js'

const MODEL_NAME = 'voicePreset'

/**
 * 分页查询音色预设列表
 */
function page({ page, pageSize, name = '' }) {
  const total = count(name)
  const list = selectPage({ page, pageSize, name }).map((preset) => ({
    ...preset,
    prompt_audio_path: preset.prompt_audio_path
      ? path.join(assetPath.voicePreset, preset.prompt_audio_path)
      : null,
    emo_audio_path: preset.emo_audio_path
      ? path.join(assetPath.voicePreset, preset.emo_audio_path)
      : null,
    cover_image_path: preset.cover_image_path
      ? path.join(assetPath.voicePreset, preset.cover_image_path)
      : null
  }))
  return { total, list }
}

/**
 * 查询单个音色预设详情
 */
function findPreset(id) {
  const preset = selectByID(id)
  if (!preset) return null
  return {
    ...preset,
    prompt_audio_path: preset.prompt_audio_path
      ? path.join(assetPath.voicePreset, preset.prompt_audio_path)
      : null,
    emo_audio_path: preset.emo_audio_path
      ? path.join(assetPath.voicePreset, preset.emo_audio_path)
      : null,
    cover_image_path: preset.cover_image_path
      ? path.join(assetPath.voicePreset, preset.cover_image_path)
      : null
  }
}

/**
 * 新增音色预设
 * @param {object} param
 * @param {string} param.name 预设名称
 * @param {string} param.promptAudioPath 音色参考音频文件路径（用户选择的本地文件）
 * @param {string|null} param.emoAudioPath 情感参考音频文件路径
 * @param {number} param.emo_control_method
 * @param {number} param.emo_weight
 * @param {number[]} param.emo_vector
 * @param {string} param.emo_text
 * @param {boolean} param.emo_random
 * @param {object} param.advanced_params
 */
function addPreset(param) {
  if (!fs.existsSync(assetPath.voicePreset)) {
    fs.mkdirSync(assetPath.voicePreset, { recursive: true })
  }

  const ts = dayjs().format('YYYYMMDDHHmmssSSS')

  // 复制音色音频
  let promptRel = null
  if (param.promptAudioPath && fs.existsSync(param.promptAudioPath)) {
    const ext = path.extname(param.promptAudioPath) || '.wav'
    promptRel = `${ts}_prompt${ext}`
    fs.copyFileSync(param.promptAudioPath, path.join(assetPath.voicePreset, promptRel))
  }

  // 复制情感音频
  let emoRel = null
  if (param.emoAudioPath && fs.existsSync(param.emoAudioPath)) {
    const ext = path.extname(param.emoAudioPath) || '.wav'
    emoRel = `${ts}_emo${ext}`
    fs.copyFileSync(param.emoAudioPath, path.join(assetPath.voicePreset, emoRel))
  }

  // 复制封面图
  let coverRel = null
  if (param.coverImagePath && fs.existsSync(param.coverImagePath)) {
    const ext = path.extname(param.coverImagePath) || '.png'
    coverRel = `${ts}_cover${ext}`
    fs.copyFileSync(param.coverImagePath, path.join(assetPath.voicePreset, coverRel))
  }

  const id = insert({
    name: param.name,
    prompt_audio_path: promptRel,
    emo_audio_path: emoRel,
    cover_image_path: coverRel,
    emo_control_method: param.emo_control_method ?? 0,
    emo_weight: param.emo_weight ?? 0.65,
    emo_vector: JSON.stringify(param.emo_vector || [0, 0, 0, 0, 0, 0, 0, 0]),
    emo_text: param.emo_text || '',
    emo_random: param.emo_random ? 1 : 0,
    advanced_params: JSON.stringify(param.advanced_params || {})
  })

  log.info('~ addPreset ~ id:', id, 'name:', param.name)
  return id
}

/**
 * 更新音色预设
 */
function modifyPreset(param) {
  const existing = selectByID(param.id)
  if (!existing) throw new Error('预设不存在')

  const ts = dayjs().format('YYYYMMDDHHmmssSSS')

  // 如果提供了新的音色音频，复制并更新
  let promptRel = existing.prompt_audio_path
  if (param.promptAudioPath && param.promptAudioPath !== path.join(assetPath.voicePreset, existing.prompt_audio_path || '')) {
    if (param.promptAudioPath && fs.existsSync(param.promptAudioPath)) {
      const ext = path.extname(param.promptAudioPath) || '.wav'
      promptRel = `${ts}_prompt${ext}`
      fs.copyFileSync(param.promptAudioPath, path.join(assetPath.voicePreset, promptRel))
    }
  }

  let emoRel = existing.emo_audio_path
  if (param.emoAudioPath && param.emoAudioPath !== (existing.emo_audio_path ? path.join(assetPath.voicePreset, existing.emo_audio_path) : '')) {
    if (param.emoAudioPath && fs.existsSync(param.emoAudioPath)) {
      const ext = path.extname(param.emoAudioPath) || '.wav'
      emoRel = `${ts}_emo${ext}`
      fs.copyFileSync(param.emoAudioPath, path.join(assetPath.voicePreset, emoRel))
    }
  } else if (param.emoAudioPath === null) {
    emoRel = null
  }

  // 封面图
  let coverRel = existing.cover_image_path
  if (param.coverImagePath && param.coverImagePath !== (existing.cover_image_path ? path.join(assetPath.voicePreset, existing.cover_image_path) : '')) {
    if (param.coverImagePath && fs.existsSync(param.coverImagePath)) {
      const ext = path.extname(param.coverImagePath) || '.png'
      coverRel = `${ts}_cover${ext}`
      fs.copyFileSync(param.coverImagePath, path.join(assetPath.voicePreset, coverRel))
    }
  } else if (param.coverImagePath === null) {
    coverRel = null
  }

  return update({
    id: param.id,
    name: param.name,
    prompt_audio_path: promptRel,
    emo_audio_path: emoRel,
    cover_image_path: coverRel,
    emo_control_method: param.emo_control_method ?? 0,
    emo_weight: param.emo_weight ?? 0.65,
    emo_vector: JSON.stringify(param.emo_vector || [0, 0, 0, 0, 0, 0, 0, 0]),
    emo_text: param.emo_text || '',
    emo_random: param.emo_random ? 1 : 0,
    advanced_params: JSON.stringify(param.advanced_params || {})
  })
}

/**
 * 删除音色预设（含音频文件）
 */
function removePreset(id) {
  const preset = selectByID(id)
  if (preset) {
    // 删除音色音频文件
    if (preset.prompt_audio_path) {
      const p = path.join(assetPath.voicePreset, preset.prompt_audio_path)
      if (fs.existsSync(p)) fs.unlinkSync(p)
    }
    // 删除情感音频文件
    if (preset.emo_audio_path) {
      const p = path.join(assetPath.voicePreset, preset.emo_audio_path)
      if (fs.existsSync(p)) fs.unlinkSync(p)
    }
    // 删除封面图文件
    if (preset.cover_image_path) {
      const p = path.join(assetPath.voicePreset, preset.cover_image_path)
      if (fs.existsSync(p)) fs.unlinkSync(p)
    }
  }
  return deletePreset(id)
}

/**
 * 使用 index-tts 生成音频（供视频合成调用）
 * @param {object} param
 * @param {number} param.presetId 音色预设 ID
 * @param {string} param.text 目标文本
 * @param {string} param.targetDir 输出目录
 * @param {boolean} param.withSubtitle 是否同时获取字幕
 * @returns {Promise<{audioFileName: string, subtitleFileName: string|null}>} 音频文件名 + 字幕文件名
 */
export async function makeAudioByIndexTTS({ presetId, text, targetDir, withSubtitle = false }) {
  const preset = selectByID(presetId)
  if (!preset) throw new Error('音色预设不存在')

  const promptAudioPath = path.join(assetPath.voicePreset, preset.prompt_audio_path)
  const emoAudioPath = preset.emo_audio_path
    ? path.join(assetPath.voicePreset, preset.emo_audio_path)
    : null

  const { audioBuffer, srtContent } = await generateAudioApi({
    text,
    promptAudioPath,
    emoAudioPath,
    emo_control_method: preset.emo_control_method,
    emo_weight: preset.emo_weight,
    emo_vector: JSON.parse(preset.emo_vector || '[0,0,0,0,0,0,0,0]'),
    emo_text: preset.emo_text,
    emo_random: !!preset.emo_random,
    advanced: JSON.parse(preset.advanced_params || '{}'),
    withSubtitle
  })

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }
  const timestamp = dayjs().format('YYYYMMDDHHmmssSSS')
  const audioFileName = `${timestamp}.wav`
  fs.writeFileSync(path.join(targetDir, audioFileName), Buffer.from(audioBuffer))

  let subtitleFileName = null
  if (withSubtitle && srtContent) {
    subtitleFileName = `${timestamp}.srt`
    fs.writeFileSync(path.join(targetDir, subtitleFileName), srtContent, 'utf-8')
  }

  log.info('~ makeAudioByIndexTTS ~ audioFileName:', audioFileName, 'subtitleFileName:', subtitleFileName)
  return { audioFileName, subtitleFileName }
}

/**
 * 试听音色预设
 * @param {number} presetId
 * @param {string} text
 * @returns {Promise<string>} 生成的音频临时文件路径
 */
export async function audition(presetId, text) {
  const tmpDir = require('os').tmpdir()
  const { audioFileName } = await makeAudioByIndexTTS({
    presetId,
    text,
    targetDir: tmpDir,
    withSubtitle: false
  })
  return path.join(tmpDir, audioFileName)
}

export function init() {
  ipcMain.handle(MODEL_NAME + '/page', (event, ...args) => {
    return page(...args)
  })
  ipcMain.handle(MODEL_NAME + '/find', (event, ...args) => {
    return findPreset(...args)
  })
  ipcMain.handle(MODEL_NAME + '/add', (event, ...args) => {
    return addPreset(...args)
  })
  ipcMain.handle(MODEL_NAME + '/update', (event, ...args) => {
    return modifyPreset(...args)
  })
  ipcMain.handle(MODEL_NAME + '/remove', (event, ...args) => {
    return removePreset(...args)
  })
  ipcMain.handle(MODEL_NAME + '/count', (event, ...args) => {
    return count(...args)
  })
  ipcMain.handle(MODEL_NAME + '/audition', (event, ...args) => {
    return audition(...args)
  })
}
