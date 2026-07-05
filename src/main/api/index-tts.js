import axios from 'axios'
import fs from 'fs'
import FormData from 'form-data'
import { serviceUrl } from '../config/config.js'
import log from '../logger.js'

/**
 * 调用 index-tts FastAPI 接口生成音频
 * @param {object} param
 * @param {string} param.text 目标文本
 * @param {string} param.promptAudioPath 音色参考音频文件路径
 * @param {string|null} param.emoAudioPath 情感参考音频文件路径
 * @param {number} param.emo_control_method 情感控制方式 0-3
 * @param {number} param.emo_weight 情感权重
 * @param {number[]} param.emo_vector 情感向量 8 维
 * @param {string} param.emo_text 情感描述文本
 * @param {boolean} param.emo_random 情感随机采样
 * @param {object} param.advanced 高级生成参数
 * @returns {Promise<Buffer>} WAV 音频二进制数据
 */
export function generateAudio({
  text,
  promptAudioPath,
  emoAudioPath,
  emo_control_method = 0,
  emo_weight = 0.65,
  emo_vector = [0, 0, 0, 0, 0, 0, 0, 0],
  emo_text = '',
  emo_random = false,
  advanced = {}
}) {
  const form = new FormData()
  form.append('text', text)
  form.append('prompt_audio', fs.createReadStream(promptAudioPath), {
    filename: 'prompt.wav',
    contentType: 'audio/wav'
  })

  if (emoAudioPath && fs.existsSync(emoAudioPath)) {
    form.append('emo_audio', fs.createReadStream(emoAudioPath), {
      filename: 'emo_ref.wav',
      contentType: 'audio/wav'
    })
  }

  form.append('emo_control_method', String(emo_control_method))
  form.append('emo_weight', String(emo_weight))
  form.append('emo_vector', JSON.stringify(emo_vector))
  form.append('emo_text', emo_text || '')
  form.append('emo_random', String(emo_random))
  form.append('max_text_tokens_per_segment', String(advanced.max_text_tokens_per_segment ?? 120))
  form.append('do_sample', String(advanced.do_sample ?? true))
  form.append('top_p', String(advanced.top_p ?? 0.8))
  form.append('top_k', String(advanced.top_k ?? 30))
  form.append('temperature', String(advanced.temperature ?? 0.8))
  form.append('length_penalty', String(advanced.length_penalty ?? 0.0))
  form.append('num_beams', String(advanced.num_beams ?? 3))
  form.append('repetition_penalty', String(advanced.repetition_penalty ?? 10.0))
  form.append('max_mel_tokens', String(advanced.max_mel_tokens ?? 1500))

  log.debug('~ index-tts generateAudio ~ text:', text.slice(0, 50))

  return axios
    .post(`${serviceUrl.indexTts}/api/tts`, form, {
      headers: form.getHeaders(),
      responseType: 'arraybuffer',
      timeout: 300000
    })
    .then((res) => res.data)
    .catch((error) => {
      log.error('~ index-tts generateAudio ~ error:', error.message)
      throw error
    })
}
