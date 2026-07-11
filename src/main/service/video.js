import { ipcMain } from 'electron'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs'
import { isEmpty } from 'lodash'
import { assetPath } from '../config/config.js'
import { selectPage,selectByStatus, updateStatus, remove as deleteVideo, findFirstByStatus } from '../dao/video.js'
import { selectByID as selectF2FModelByID } from '../dao/f2f-model.js'
import { selectByID as selectVoiceByID } from '../dao/voice.js'
import {
  insert as insertVideo,
  count,
  update,
  selectByID as selectVideoByID
} from '../dao/video.js'
import { makeAudio4Video, copyAudio4Video } from './voice.js'
import { makeAudioByIndexTTS } from './voice-preset.js'
import { makeVideo as makeVideoApi,getVideoStatus } from '../api/f2f.js'
import log from '../logger.js'
import { getVideoDuration, burnSubtitle, detectAvailableEncoders, getEncoderLabel, renderSubtitleFrame } from '../util/ffmpeg.js'
import fontList from 'font-list'

const MODEL_NAME = 'video'

/**
 * 分页查询合成结果
 * @param {number} page
 * @param {number} pageSize
 * @returns
 */
function page({ page, pageSize, name = '' }) {
  // 查询的有waiting状态的视频
  const waitingVideos = selectByStatus('waiting').map((v) => v.id)
  const total = count(name)
  const list = selectPage({ page, pageSize, name }).map((video) => {
    video = {
      ...video,
      file_path: video.file_path ? path.join(assetPath.model, video.file_path) : video.file_path,
      subtitle_path: video.subtitle_path ? path.join(assetPath.ttsProduct, video.subtitle_path) : video.subtitle_path
    }

    if(video.status === 'waiting'){
      video.progress = `${waitingVideos.indexOf(video.id) + 1} / ${waitingVideos.length}`
    }
    return video
  })

  return {
    total,
    list
  }
}

function findVideo(videoId) {
  const video = selectVideoByID(videoId)
  return {
    ...video,
    file_path: video.file_path ? path.join(assetPath.model, video.file_path) : video.file_path,
    subtitle_path: video.subtitle_path ? path.join(assetPath.ttsProduct, video.subtitle_path) : video.subtitle_path
  }
}

function countVideo(name = '') {
  return count(name)
}

function saveVideo({ id, model_id, name, text_content, voice_id, audio_path, voice_preset_id }) {
  const video = selectVideoByID(id)
  if(audio_path){
    audio_path = copyAudio4Video(audio_path)
  }

  if (video) {
    return update({ id, model_id, name, text_content, voice_id, audio_path, voice_preset_id })
  }
  return insertVideo({ model_id, name, status: 'draft', text_content, voice_id, audio_path, voice_preset_id })
}

/**
 * 合成视频
 * 更新视频状态为waiting
 * @param {number} videoId
 * @returns
 */
function makeVideo(videoId) {
  update({ id: videoId, status: 'waiting' })
  return videoId
}

export async function synthesisVideo(videoId) {
  try{
    update({
      id: videoId,
      file_path: null,
      status: 'pending',
      message: '正在提交任务',
    })

    // 查询Video
    const video = selectVideoByID(videoId)
    log.debug('~ makeVideo ~ video:', video)

    // 根据modelId获取model信息
    const model = selectF2FModelByID(video.model_id)
    log.debug('~ makeVideo ~ model:', model)

    let audioPath
    let subtitlePath = null
    if(video.audio_path){
      // 将audio_path复制到ttsProduct目录下
      audioPath = video.audio_path
    }else if(video.voice_preset_id){
      // 使用 index-tts 预设音色生成音频（同时获取字幕）
      const result = await makeAudioByIndexTTS({
        presetId: video.voice_preset_id,
        text: video.text_content,
        targetDir: assetPath.ttsProduct,
        withSubtitle: true
      })
      audioPath = result.audioFileName
      subtitlePath = result.subtitleFileName
      log.debug('~ makeVideo ~ indexTts audioPath:', audioPath, 'subtitlePath:', subtitlePath)
    }else{
      // 根据model信息中的voiceId获取voice信息
      const voice = selectVoiceByID(video.voice_id || model.voice_id)
      log.debug('~ makeVideo ~ voice:', voice)

      // 调用tts接口生成音频
      audioPath = await makeAudio4Video({
        voiceId: voice.id,
        text: video.text_content
      })
      log.debug('~ makeVideo ~ audioPath:', audioPath)
    }

    // 调用视频生成接口生成视频
    const { result, param } = await makeVideoByF2F(audioPath, model.video_path)

    log.debug('~ makeVideo ~ result, param:', result, param)

    // 插入视频表
    if(10000 === result.code){ // 成功
      update({
        id: videoId,
        file_path: null,
        status: 'pending',
        message: result,
        audio_path: audioPath,
        subtitle_path: subtitlePath,
        param,
        code: param.code
      })
    }else{ // 失败
      update({
        id: videoId,
        file_path: null,
        status: 'failed',
        message: result.msg,
        audio_path: audioPath,
        subtitle_path: subtitlePath,
        param,
        code: param.code
      })
    }
  } catch (error) {
    log.error('~ synthesisVideo ~ error:', error.message)
    updateStatus(videoId, 'failed', error.message)
  }

  // 6. 返回视频id
  return videoId
}

export async function loopPending() {
  const video = findFirstByStatus('pending')
  if (!video) {
    synthesisNext()

    setTimeout(() => {
      loopPending()
    }, 2000)
    return
  }

  const statusRes = await getVideoStatus(video.code)

  if ([9999, 10002, 10003].includes(statusRes.code)) {
    updateStatus(video.id, 'failed', statusRes.msg)
  } else if (statusRes.code === 10000) {
    if (statusRes.data.status === 1) {
      updateStatus(
        video.id,
        'pending',
        statusRes.data.msg,
        statusRes.data.progress,
      )
    }else if (statusRes.data.status === 2) { // 合成成功
      // ffmpeg 获取视频时长
      const resultPath = path.join(assetPath.model, statusRes.data.result)
      const duration = await getVideoDuration(resultPath)

      update({
        id: video.id,
        status: 'success',
        message: statusRes.data.msg,
        progress: statusRes.data.progress,
        file_path: statusRes.data.result,
        duration
      })

    } else if (statusRes.data.status === 3) {
      updateStatus(video.id, 'failed', statusRes.data.msg)
    }
  }

  setTimeout(() => {
    loopPending()
  }, 2000)
  return video
}

/**
 * 合成下一个视频
 */
function synthesisNext() {
  // 查询所有未完成的视频任务
  const video = findFirstByStatus('waiting')
  if (video) {
    synthesisVideo(video.id)
  }
}

function removeVideo(videoId) {
  // 查询视频
  const video = selectVideoByID(videoId)
  log.debug('~ removeVideo ~ videoId:', videoId)

  // 删除视频
  const videoPath = path.join(assetPath.model, video.file_path ||'')
  if (!isEmpty(video.file_path) && fs.existsSync(videoPath)) {
    fs.unlinkSync(videoPath)
  }

  // 删除音频
  const audioPath = path.join(assetPath.model, video.audio_path ||'')
  if (!isEmpty(video.audio_path) && fs.existsSync(audioPath)) {
    fs.unlinkSync(audioPath)
  }

  // 删除字幕
  const subtitlePath = path.join(assetPath.ttsProduct, video.subtitle_path ||'')
  if (!isEmpty(video.subtitle_path) && fs.existsSync(subtitlePath)) {
    fs.unlinkSync(subtitlePath)
  }

  // 删除视频表
  return deleteVideo(videoId)
}

function exportVideo(videoId, outputPath) {
  const video = selectVideoByID(videoId)
  const filePath = path.join(assetPath.model, video.file_path)
  fs.copyFileSync(filePath, outputPath)
}

/**
 * 调用face2face生成视频
 * @param {string} audioPath
 * @param {string} videoPath
 * @returns
 */
async function makeVideoByF2F(audioPath, videoPath) {
  const uuid = crypto.randomUUID()
  const param = {
    audio_url: audioPath,
    video_url: videoPath,
    code: uuid,
    chaofen: 0,
    watermark_switch: 0,
    pn: 1
  }
  const result = await makeVideoApi(param)
  return { param, result }
}

function modify(video) {
  return update(video)
}

/**
 * 获取视频的字幕内容
 * @param {number} videoId
 * @returns {string|null} SRT 字幕文本
 */
function getSubtitle(videoId) {
  const video = selectVideoByID(videoId)
  if (!video || !video.subtitle_path) return null
  const subtitlePath = path.join(assetPath.ttsProduct, video.subtitle_path)
  if (!fs.existsSync(subtitlePath)) return null
  return fs.readFileSync(subtitlePath, 'utf-8')
}

/**
 * 保存字幕内容到文件
 * @param {number} videoId
 * @param {string} srtContent SRT 字幕文本
 */
function saveSubtitle(videoId, srtContent) {
  const video = selectVideoByID(videoId)
  if (!video) throw new Error('视频不存在')
  if (!video.subtitle_path) {
    // 如果之前没有字幕文件，创建新的
    const fileName = `${Date.now()}.srt`
    update({ id: videoId, subtitle_path: fileName })
    const subtitlePath = path.join(assetPath.ttsProduct, fileName)
    fs.writeFileSync(subtitlePath, srtContent, 'utf-8')
    return fileName
  }
  const subtitlePath = path.join(assetPath.ttsProduct, video.subtitle_path)
  fs.writeFileSync(subtitlePath, srtContent, 'utf-8')
  return video.subtitle_path
}

/**
 * 获取系统已安装字体列表
 * @returns {Promise<string[]>} 字体名数组
 */
async function getSystemFonts() {
  try {
    const fonts = await fontList.getFonts()
    return [...new Set(fonts)].sort()
  } catch (err) {
    log.error('获取系统字体失败:', err)
    return []
  }
}

/**
 * 探测可用的 H.264 编码器（含硬件加速）
 * @returns {Promise<Array<{value:string,label:string}>>}
 */
async function detectEncoders() {
  const encoders = await detectAvailableEncoders()
  return encoders.map((enc) => ({ value: enc, label: getEncoderLabel(enc) }))
}

/**
 * 烧录 ASS 字幕到视频
 * @param {number} videoId 视频ID
 * @param {string} assContent ASS 字幕文本
 * @param {object} options { encoder }
 * @param {object} sender webContents 用于推送进度
 * @returns {Promise<{file_path:string}>}
 */
async function burnVideoSubtitle(videoId, assContent, options = {}, sender) {
  const video = selectVideoByID(videoId)
  if (!video) throw new Error('视频不存在')
  if (!video.file_path) throw new Error('视频文件不存在')

  // 确定源视频路径（优先使用 origin_file_path 避免反复烧录导致字幕叠加）
  let sourceFileName = video.file_path
  if (video.origin_file_path) {
    sourceFileName = video.origin_file_path
  } else {
    // 第一次烧录，保存原始视频路径
    update({ id: videoId, origin_file_path: video.file_path })
  }
  const sourcePath = path.join(assetPath.model, sourceFileName)
  if (!fs.existsSync(sourcePath)) throw new Error('源视频文件不存在: ' + sourcePath)

  // 保存 ASS 文件
  const assFileName = `${Date.now()}.ass`
  const assPath = path.join(assetPath.ttsProduct, assFileName)
  fs.writeFileSync(assPath, assContent, 'utf-8')

  // 输出文件
  const ext = path.extname(video.file_path) || '.mp4'
  const outputFileName = `${Date.now()}_sub${ext}`
  const outputPath = path.join(assetPath.model, outputFileName)

  // 删除上一次烧录的视频文件（保留原始 origin_file_path）
  if (video.origin_file_path && video.file_path !== video.origin_file_path) {
    const oldPath = path.join(assetPath.model, video.file_path)
    if (fs.existsSync(oldPath)) {
      try { fs.unlinkSync(oldPath) } catch (e) { log.warn('删除旧视频失败:', e) }
    }
  }

  log.info('~ burnVideoSubtitle ~ start:', sourcePath, '->', outputPath, 'encoder:', options.encoder)
  // 烧录
  await burnSubtitle(sourcePath, assPath, outputPath, {
    encoder: options.encoder || 'libx264',
    onProgress: (percent) => {
      if (sender && !sender.isDestroyed()) {
        sender.send(MODEL_NAME + '/burnProgress', { videoId, percent })
      }
    }
  })

  // 更新 video 记录指向新视频
  update({ id: videoId, file_path: outputFileName })

  // 清理 ASS 临时文件
  try { fs.unlinkSync(assPath) } catch (e) { /* ignore */ }

  return { file_path: outputFileName }
}

/**
 * 渲染单帧带字幕的视频画面（用于预览）
 * @param {number} videoId 视频ID
 * @param {string} assContent ASS 字幕文本
 * @param {number} timeSeconds 渲染时间点（秒）
 * @returns {Promise<string>} 输出图片路径
 */
async function renderSubtitleFrameService(videoId, assContent, timeSeconds) {
  const video = selectVideoByID(videoId)
  if (!video) throw new Error('视频不存在')
  const sourceFileName = video.origin_file_path || video.file_path
  if (!sourceFileName) throw new Error('视频文件不存在')
  const sourcePath = path.join(assetPath.model, sourceFileName)
  if (!fs.existsSync(sourcePath)) throw new Error('源视频文件不存在: ' + sourcePath)

  // 写临时 ASS 文件
  const assPath = path.join(assetPath.ttsProduct, `preview_${videoId}.ass`)
  fs.writeFileSync(assPath, assContent, 'utf-8')

  // 输出 PNG（固定文件名，覆盖上一次的预览）
  const outputPath = path.join(assetPath.ttsProduct, `preview_${videoId}.png`)

  await renderSubtitleFrame(sourcePath, assPath, timeSeconds, outputPath)

  // 清理 ASS 临时文件
  try { fs.unlinkSync(assPath) } catch (e) { /* ignore */ }

  return outputPath
}

export function init() {
  ipcMain.handle(MODEL_NAME + '/page', (event, ...args) => {
    return page(...args)
  })
  ipcMain.handle(MODEL_NAME + '/make', (event, ...args) => {
    return makeVideo(...args)
  })
  ipcMain.handle(MODEL_NAME + '/modify', (event, ...args) => {
    return modify(...args)
  })
  ipcMain.handle(MODEL_NAME + '/save', (event, ...args) => {
    return saveVideo(...args)
  })
  ipcMain.handle(MODEL_NAME + '/find', (event, ...args) => {
    return findVideo(...args)
  })
  ipcMain.handle(MODEL_NAME + '/count', (event, ...args) => {
    return countVideo(...args)
  })
  ipcMain.handle(MODEL_NAME + '/export', (event, ...args) => {
    return exportVideo(...args)
  })
  ipcMain.handle(MODEL_NAME + '/remove', (event, ...args) => {
    return removeVideo(...args)
  })
  ipcMain.handle(MODEL_NAME + '/getSubtitle', (event, ...args) => {
    return getSubtitle(...args)
  })
  ipcMain.handle(MODEL_NAME + '/saveSubtitle', (event, ...args) => {
    return saveSubtitle(...args)
  })
  ipcMain.handle(MODEL_NAME + '/getSystemFonts', (event, ...args) => {
    return getSystemFonts(...args)
  })
  ipcMain.handle(MODEL_NAME + '/detectEncoders', (event, ...args) => {
    return detectEncoders(...args)
  })
  ipcMain.handle(MODEL_NAME + '/burnSubtitle', async (event, ...args) => {
    return burnVideoSubtitle(args[0], args[1], args[2] || {}, event.sender)
  })
  ipcMain.handle(MODEL_NAME + '/renderFrame', async (event, ...args) => {
    return renderSubtitleFrameService(args[0], args[1], args[2])
  })
}
