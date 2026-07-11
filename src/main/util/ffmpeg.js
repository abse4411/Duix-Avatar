import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import { execFile } from 'child_process'
import log from '../logger.js'

let _ffmpegPathValue = ''

function initFFmpeg() {
  const ffmpegPath = {
    'development-win32': path.join(__dirname, '../../resources/ffmpeg/win-amd64/bin/ffmpeg.exe'),
    'development-linux': path.join(__dirname, '../../resources/ffmpeg/linux-amd64/ffmpeg'),
    'production-win32': path.join(
      process.resourcesPath,
      'app.asar.unpacked',
      'resources',
      'ffmpeg',
      'win-amd64',
      'bin',
      'ffmpeg.exe'
    ),
    'production-linux': path.join(
      process.resourcesPath,
      'app.asar.unpacked',
      'resources',
      'ffmpeg',
      'linux-amd64',
      'ffmpeg'
    )
  }

  if(process.env.NODE_ENV === undefined){
    process.env.NODE_ENV = 'production'
  }

  _ffmpegPathValue = ffmpegPath[`${process.env.NODE_ENV}-${process.platform}`]
  log.debug('ENV:', `${process.env.NODE_ENV}-${process.platform}`)
  log.info('FFmpeg path:', _ffmpegPathValue)
  ffmpeg.setFfmpegPath(_ffmpegPathValue)

  const ffprobePath = {
    'development-win32': path.join(__dirname, '../../resources/ffmpeg/win-amd64/bin/ffprobe.exe'),
    'development-linux': path.join(__dirname, '../../resources/ffmpeg/linux-amd64/ffprobe'),
    'production-win32': path.join(
      process.resourcesPath,
      'app.asar.unpacked',
      'resources',
      'ffmpeg',
      'win-amd64',
      'bin',
      'ffprobe.exe'
    ),
    'production-linux': path.join(
      process.resourcesPath,
      'app.asar.unpacked',
      'resources',
      'ffmpeg',
      'linux-amd64',
      'ffprobe'
    )
  }

  const ffprobePathValue = ffprobePath[`${process.env.NODE_ENV}-${process.platform}`]
  log.info('FFprobe path:', ffprobePathValue)
  ffmpeg.setFfprobePath(ffprobePathValue)
}

initFFmpeg()

/**
 * 探测 ffmpeg 支持的 H.264 硬件加速编码器
 * 按优先级返回：h264_nvenc > h264_qsv > h264_amf > libx264
 * @returns {Promise<string[]>} 可用编码器列表
 */
export function detectAvailableEncoders() {
  return new Promise((resolve) => {
    execFile(_ffmpegPathValue, ['-hide_banner', '-encoders'], (err, stdout) => {
      const priority = ['h264_nvenc', 'h264_qsv', 'h264_amf', 'libx264']
      if (err || !stdout) {
        resolve(['libx264'])
        return
      }
      const available = priority.filter((enc) => stdout.includes(enc))
      resolve(available.length > 0 ? available : ['libx264'])
    })
  })
}

/**
 * 获取编码器友好名称
 */
export function getEncoderLabel(encoder) {
  const labels = {
    h264_nvenc: 'NVIDIA NVENC (GPU 加速)',
    h264_qsv: 'Intel QuickSync (硬件加速)',
    h264_amf: 'AMD AMF (硬件加速)',
    libx264: '软件编码 (libx264)'
  }
  return labels[encoder] || encoder
}

/**
 * 烧录 ASS 字幕到视频
 * @param {string} videoPath 输入视频路径
 * @param {string} assPath ASS 字幕文件路径
 * @param {string} outputPath 输出视频路径
 * @param {object} options { encoder, crf, onProgress }
 * @returns {Promise<string>} 输出文件路径
 */
export function burnSubtitle(videoPath, assPath, outputPath, options = {}) {
  const encoder = options.encoder || 'libx264'
  const crf = options.crf || 18
  // ass 滤镜路径需要：反斜杠→正斜杠，冒号转义
  const escapedAssPath = assPath.replace(/\\/g, '/').replace(/:/g, '\\:')
  const filterStr = `ass='${escapedAssPath}'`

  log.info(`burnSubtitle: ${videoPath} + ${assPath} -> ${outputPath} (encoder=${encoder})`)

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg(videoPath)
      .outputOptions([
        '-vf', filterStr,
        '-c:a', 'copy',
        '-c:v', encoder,
        '-pix_fmt', 'yuv420p',
        '-crf', String(crf),
        '-preset', encoder === 'libx264' ? 'medium' : 'fast'
      ])

    cmd
      .on('progress', (progress) => {
        if (options.onProgress && typeof progress.percent === 'number') {
          options.onProgress(Math.min(99, Math.round(progress.percent)))
        }
      })
      .on('end', () => {
        log.info('burnSubtitle done:', outputPath)
        if (options.onProgress) options.onProgress(100)
        resolve(outputPath)
      })
      .on('error', (err) => {
        log.error('burnSubtitle error:', err)
        reject(err)
      })
      .save(outputPath)
  })
}

/**
 * 渲染单帧带字幕的视频画面（用于预览，和烧录用同一个 ass 滤镜，效果完全一致）
 * @param {string} videoPath 输入视频路径
 * @param {string} assPath ASS 字幕文件路径
 * @param {number} timeSeconds 渲染时间点（秒）
 * @param {string} outputPath 输出图片路径
 * @returns {Promise<string>} 输出图片路径
 */
export function renderSubtitleFrame(videoPath, assPath, timeSeconds, outputPath) {
  const escapedAssPath = assPath.replace(/\\/g, '/').replace(/:/g, '\\:')
  const filterStr = `ass='${escapedAssPath}'`
  const args = [
    '-i', videoPath,
    '-ss', String(timeSeconds),
    '-copyts',
    '-vf', filterStr,
    '-frames:v', '1',
    '-an',
    '-y',
    outputPath
  ]
  log.info(`renderSubtitleFrame exec: ${_ffmpegPathValue} ${args.join(' ')}`)
  return new Promise((resolve, reject) => {
    execFile(_ffmpegPathValue, args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        log.error('renderSubtitleFrame error:', err.message)
        log.error('renderSubtitleFrame stderr:', stderr)
        reject(new Error(stderr || err.message))
      } else {
        log.info('renderSubtitleFrame done:', outputPath)
        resolve(outputPath)
      }
    })
  })
}

export function extractAudio(videoPath, audioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .noVideo()
      .save(audioPath)
      .on('end', () => {
        log.info('audio split done')
        resolve(true)
      })
      .on('error', (err) => {
        reject(err)
      })
  })
}

export async function toH264(videoPath, outputPath) {
  // const hasNvidia = await detectNvidia()
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .videoCodec('libx264')
      .outputOptions('-pix_fmt yuv420p')
      .save(outputPath)
      .on('end', () => {
        log.info('video convert to h264 done')
        resolve(true)
      })
      .on('error', (err) => {
        reject(err)
      })
  })
}

function detectNvidia() {
  return new Promise((resolve) => {
    const exec = require('child_process').exec;
    exec('nvidia-smi', (error, stdout, stderr) => {
      if (error || stderr) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

export function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath).ffprobe((err, data) => {
      if (err) {
        log.error("🚀 ~ ffmpeg ~ err:", err)
        reject(err)
      } else if (data && data.streams && data.streams.length > 0) {
        resolve(data.streams[0].duration) // 单位秒
      } else {
        log.error('No streams found')
        reject(new Error('No streams found'))
      }
    })
  })
}
