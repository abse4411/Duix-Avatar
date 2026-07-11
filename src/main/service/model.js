import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import dayjs from 'dayjs'
import { isEmpty } from 'lodash'
import { insert, selectPage, count, selectByID, remove as deleteModel } from '../dao/f2f-model.js'
import { train as trainVoice } from './voice.js'
import { addPreset } from './voice-preset.js'
import { assetPath } from '../config/config.js'
import log from '../logger.js'
import { extractAudio, toH264 } from '../util/ffmpeg.js'
const MODEL_NAME = 'model'

/**
 * 新增模特
 * @param {string} modelName 模特名称
 * @param {string} videoPath 模特视频路径
 * @param {string} ttsService TTS服务类型: fish-speech | index-tts
 * @returns
 */
async function addModel(modelName, videoPath, ttsService = 'fish-speech') {
  if (!fs.existsSync(assetPath.model)) {
    fs.mkdirSync(assetPath.model, {
      recursive: true
    })
  }
  // copy video to model video path
  const extname = path.extname(videoPath)
  const modelFileName = dayjs().format('YYYYMMDDHHmmssSSS') + extname
  const modelPath = path.join(assetPath.model, modelFileName)

  await toH264(videoPath, modelPath)

  // 用ffmpeg分离音频
  if (!fs.existsSync(assetPath.ttsTrain)) {
    fs.mkdirSync(assetPath.ttsTrain, {
      recursive: true
    })
  }
  const audioPath = path.join(assetPath.ttsTrain, modelFileName.replace(extname, '.wav'))
  await extractAudio(modelPath, audioPath)

  const relativeModelPath = path.relative(assetPath.model, modelPath)
  const relativeAudioPath = path.relative(assetPath.ttsRoot, audioPath)

  if (ttsService === 'index-tts') {
    // Index-TTS2: 将提取的音频保存到音色管理
    const voicePresetId = await addPreset({
      name: modelName,
      promptAudioPath: audioPath
    })
    // 插入模特信息，voiceId为空（使用Index-TTS2不需要fish-speech的voiceId）
    const id = insert({ modelName, videoPath: relativeModelPath, audioPath: relativeAudioPath, voiceId: null, voicePresetId })
    return id
  } else {
    // Fish-Speech: 训练语音模型（原有逻辑）
    const voiceId = await trainVoice(relativeAudioPath, 'zh')
    // insert model info to db
    const id = insert({ modelName, videoPath: relativeModelPath, audioPath: relativeAudioPath, voiceId })
    return id
  }
}

/**
 * 新增模特（无音频视频）
 * 仅上传无声视频作为形象模特，不分离音频、不训练 TTS。
 * 后续合成视频时需由用户自行上传音频驱动，从而跳过 TTS 服务。
 * @param {string} modelName 模特名称
 * @param {string} videoPath 模特视频路径（无音频或含音频均可，仅取画面）
 * @returns {number} 新增模特 id
 */
async function addModelNoAudio(modelName, videoPath) {
  if (!fs.existsSync(assetPath.model)) {
    fs.mkdirSync(assetPath.model, { recursive: true })
  }
  // copy video to model video path and convert to h264
  const extname = path.extname(videoPath)
  const modelFileName = dayjs().format('YYYYMMDDHHmmssSSS') + extname
  const modelPath = path.join(assetPath.model, modelFileName)

  await toH264(videoPath, modelPath)

  // 不分离音频、不训练 TTS，audio_path 与 voice_id 留空
  const relativeModelPath = path.relative(assetPath.model, modelPath)
  const id = insert({ modelName, videoPath: relativeModelPath, audioPath: null, voiceId: null })
  log.info('~ addModelNoAudio ~ model saved:', modelPath)
  return id
}

function page({ page, pageSize, name = '' }) {
  const total = count(name)
  return {
    total,
    list: selectPage({ page, pageSize, name }).map((model) => ({
      ...model,
      video_path: path.join(assetPath.model, model.video_path),
      audio_path: model.audio_path ? path.join(assetPath.ttsRoot, model.audio_path) : null
    }))
  }
}

function findModel(modelId) {
  const model = selectByID(modelId)
  return {
    ...model,
    video_path: path.join(assetPath.model, model.video_path),
    audio_path: model.audio_path ? path.join(assetPath.ttsRoot, model.audio_path) : null
  }
}

function removeModel(modelId) {
  const model = selectByID(modelId)
  log.debug('~ removeModel ~ modelId:', modelId)

  // 删除视频
  const videoPath = path.join(assetPath.model, model.video_path ||'')
  if (!isEmpty(model.video_path) && fs.existsSync(videoPath)) {
    fs.unlinkSync(videoPath)
  }

  // 删除音频
  const audioPath = path.join(assetPath.ttsRoot, model.audio_path ||'')
  if (!isEmpty(model.audio_path) && fs.existsSync(audioPath)) {
    fs.unlinkSync(audioPath)
  }

  deleteModel(modelId)
}

function countModel(name = '') {
  return count(name)
}

export function init() {
  ipcMain.handle(MODEL_NAME + '/addModel', (event, modelName, videoPath, ttsService) => {
    return addModel(modelName, videoPath, ttsService)
  })
  ipcMain.handle(MODEL_NAME + '/addModelNoAudio', (event, ...args) => {
    return addModelNoAudio(...args)
  })
  ipcMain.handle(MODEL_NAME + '/page', (event, ...args) => {
    return page(...args)
  })
  ipcMain.handle(MODEL_NAME + '/find', (event, ...args) => {
    return findModel(...args)
  })
  ipcMain.handle(MODEL_NAME + '/count', (event, ...args) => {
    return countModel(...args)
  })
  ipcMain.handle(MODEL_NAME + '/remove', (event, ...args) => {
    return removeModel(...args)
  })
}
