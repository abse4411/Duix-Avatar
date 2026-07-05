<template>
  <div class="preset-form">
    <!-- 基础信息 -->
    <div class="form-section">
      <div class="section-title">基础信息</div>
      <div class="form-item">
        <span class="label required">预设名称</span>
        <t-input class="value" v-model="form.name" placeholder="请输入音色预设名称" />
      </div>
      <div class="form-item">
        <span class="label required">音色音频</span>
        <div class="audio-upload">
          <template v-if="form.promptAudioPath">
            <div class="audio-info">
              <span class="audio-name">{{ form.promptAudioName || '音频文件' }}</span>
              <span class="audio-duration" v-if="form.promptAudioDuration">{{ form.promptAudioDuration }}</span>
              <img class="audio-play-icon" v-if="state.playingAudio !== 'prompt'" src="@renderer/assets/images/icons/icon-play.png" @click="action.playPromptAudio" />
              <img class="audio-play-icon" v-else src="@renderer/assets/images/icons/icon-pause.png" @click="action.stopAudioPlay" />
              <t-button size="small" theme="primary" variant="text" @click="action.selectPromptAudio">更换</t-button>
              <img class="audio-del" src="@renderer/assets/images/icons/icon-del.png" @click="action.clearPromptAudio" />
            </div>
          </template>
          <t-button v-else size="small" theme="default" @click="action.selectPromptAudio" :loading="state.uploadingPrompt">
            <template #icon><AddIcon /></template>
            上传音色音频
          </t-button>
          <div class="upload-tip">上传一段参考音频作为音色样本（建议 5~15 秒清晰人声）</div>
        </div>
      </div>
      <div class="form-item">
        <span class="label">封面图</span>
        <div class="audio-upload">
          <template v-if="form.coverImagePath">
            <div class="cover-info">
              <img class="cover-preview" :src="coverImageUrl" />
              <div class="cover-actions">
                <t-button size="small" theme="primary" variant="text" @click="action.selectCoverImage">更换</t-button>
                <img class="audio-del" src="@renderer/assets/images/icons/icon-del.png" @click="action.clearCoverImage" />
              </div>
            </div>
          </template>
          <t-button v-else size="small" theme="default" @click="action.selectCoverImage">
            <template #icon><AddIcon /></template>
            上传封面图
          </t-button>
          <div class="upload-tip">上传封面图用于卡片展示（建议正方形，JPG/PNG）</div>
        </div>
      </div>
    </div>

    <!-- 情感控制 -->
    <div class="form-section">
      <div class="section-title">情感控制</div>
      <div class="form-item">
        <span class="label">控制方式</span>
        <t-radio-group class="value" v-model="form.emo_control_method" variant="default-filled" size="small">
          <t-radio-button :value="0">与音色相同</t-radio-button>
          <t-radio-button :value="1">情感参考音频</t-radio-button>
          <t-radio-button :value="2">情感向量</t-radio-button>
          <t-radio-button :value="3">情感描述文本</t-radio-button>
        </t-radio-group>
      </div>

      <!-- 情感参考音频 (mode 1) -->
      <div class="form-item" v-show="form.emo_control_method === 1">
        <span class="label">情感音频</span>
        <div class="audio-upload">
          <template v-if="form.emoAudioPath">
            <div class="audio-info">
              <span class="audio-name">{{ form.emoAudioName || '情感音频' }}</span>
              <img class="audio-play-icon" v-if="state.playingAudio !== 'emo'" src="@renderer/assets/images/icons/icon-play.png" @click="action.playEmoAudio" />
              <img class="audio-play-icon" v-else src="@renderer/assets/images/icons/icon-pause.png" @click="action.stopAudioPlay" />
              <t-button size="small" theme="primary" variant="text" @click="action.selectEmoAudio">更换</t-button>
              <img class="audio-del" src="@renderer/assets/images/icons/icon-del.png" @click="action.clearEmoAudio" />
            </div>
          </template>
          <t-button v-else size="small" theme="default" @click="action.selectEmoAudio" :loading="state.uploadingEmo">
            <template #icon><AddIcon /></template>
            上传情感参考音频
          </t-button>
        </div>
      </div>

      <!-- 情感向量 (mode 2) -->
      <div class="form-item emo-vector" v-show="form.emo_control_method === 2">
        <span class="label">情感向量</span>
        <div class="vector-grid">
          <div class="vector-item" v-for="(label, idx) in emoLabels" :key="idx">
            <span class="v-label">{{ label }}</span>
            <t-slider class="v-slider" v-model="form.emo_vector[idx]" :min="0" :max="1" :step="0.05" />
            <span class="v-value">{{ form.emo_vector[idx].toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <!-- 情感描述文本 (mode 3) -->
      <div class="form-item" v-show="form.emo_control_method === 3">
        <span class="label">情感描述</span>
        <t-textarea class="value" v-model="form.emo_text" placeholder="例如：委屈巴巴、危险在悄悄逼近" :autosize="{ minRows: 2, maxRows: 4 }" />
      </div>

      <!-- 情感随机采样 (mode 2, 3) -->
      <div class="form-item" v-show="form.emo_control_method === 2 || form.emo_control_method === 3">
        <span class="label">随机采样</span>
        <t-checkbox v-model="form.emo_random">情感随机采样</t-checkbox>
      </div>

      <!-- 情感权重 (mode 1, 2, 3) -->
      <div class="form-item" v-show="form.emo_control_method !== 0">
        <span class="label">情感权重</span>
        <div class="slider-row">
          <t-slider class="value" v-model="form.emo_weight" :min="0" :max="1" :step="0.01" />
          <span class="slider-val">{{ form.emo_weight.toFixed(2) }}</span>
        </div>
      </div>
    </div>

    <!-- 高级参数 -->
    <div class="form-section">
      <t-collapse>
        <t-collapse-panel value="advanced" header="高级生成参数">
          <div class="advanced-grid">
            <div class="adv-item">
              <span class="adv-label">do_sample</span>
              <t-checkbox v-model="form.advanced.do_sample">采样</t-checkbox>
            </div>
            <div class="adv-item">
              <span class="adv-label">temperature</span>
              <div class="slider-row">
                <t-slider v-model="form.advanced.temperature" :min="0.1" :max="2.0" :step="0.1" />
                <span class="slider-val">{{ form.advanced.temperature.toFixed(1) }}</span>
              </div>
            </div>
            <div class="adv-item">
              <span class="adv-label">top_p</span>
              <div class="slider-row">
                <t-slider v-model="form.advanced.top_p" :min="0" :max="1" :step="0.01" />
                <span class="slider-val">{{ form.advanced.top_p.toFixed(2) }}</span>
              </div>
            </div>
            <div class="adv-item">
              <span class="adv-label">top_k</span>
              <div class="slider-row">
                <t-slider v-model="form.advanced.top_k" :min="0" :max="100" :step="1" />
                <span class="slider-val">{{ form.advanced.top_k }}</span>
              </div>
            </div>
            <div class="adv-item">
              <span class="adv-label">num_beams</span>
              <div class="slider-row">
                <t-slider v-model="form.advanced.num_beams" :min="1" :max="10" :step="1" />
                <span class="slider-val">{{ form.advanced.num_beams }}</span>
              </div>
            </div>
            <div class="adv-item">
              <span class="adv-label">repetition_penalty</span>
              <div class="slider-row">
                <t-slider v-model="form.advanced.repetition_penalty" :min="0.1" :max="20" :step="0.1" />
                <span class="slider-val">{{ form.advanced.repetition_penalty.toFixed(1) }}</span>
              </div>
            </div>
            <div class="adv-item">
              <span class="adv-label">length_penalty</span>
              <div class="slider-row">
                <t-slider v-model="form.advanced.length_penalty" :min="-2" :max="2" :step="0.1" />
                <span class="slider-val">{{ form.advanced.length_penalty.toFixed(1) }}</span>
              </div>
            </div>
            <div class="adv-item">
              <span class="adv-label">max_mel_tokens</span>
              <div class="slider-row">
                <t-slider v-model="form.advanced.max_mel_tokens" :min="50" :max="1500" :step="10" />
                <span class="slider-val">{{ form.advanced.max_mel_tokens }}</span>
              </div>
            </div>
            <div class="adv-item">
              <span class="adv-label">分句最大Token数</span>
              <div class="slider-row">
                <t-slider v-model="form.advanced.max_text_tokens_per_segment" :min="20" :max="200" :step="2" />
                <span class="slider-val">{{ form.advanced.max_text_tokens_per_segment }}</span>
              </div>
            </div>
          </div>
        </t-collapse-panel>
      </t-collapse>
    </div>

    <!-- 试听 (直接播放原音色音频) -->
    <div class="form-section" v-if="form.promptAudioPath">
      <div class="section-title">试听</div>
      <div class="form-item">
        <span class="label">原音试听</span>
        <div class="audition-row">
          <t-button theme="primary" size="small" @click="action.playPromptAudio">
            {{ state.playingAudio === 'prompt' ? '暂停' : '播放原音' }}
          </t-button>
          <span class="audition-tip">直接播放上传的音色音频</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch, computed } from 'vue'
import { AddIcon } from 'tdesign-icons-vue-next'
import { MessagePlugin } from 'tdesign-vue-next'
import { Client } from '@renderer/client'
import { millisecondsToTime, localUrl } from '@renderer/utils'

const props = defineProps({
  presetData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['submitOK'])

const emoLabels = ['喜', '怒', '哀', '惧', '厌恶', '低落', '惊喜', '平静']

const defaultForm = () => ({
  id: null,
  name: '',
  coverImagePath: '',
  coverImageName: '',
  promptAudioPath: '',
  promptAudioName: '',
  promptAudioDuration: '',
  emoAudioPath: '',
  emoAudioName: '',
  emo_control_method: 0,
  emo_weight: 0.65,
  emo_vector: [0, 0, 0, 0, 0, 0, 0, 0],
  emo_text: '',
  emo_random: false,
  advanced: {
    do_sample: true,
    temperature: 0.8,
    top_p: 0.8,
    top_k: 30,
    num_beams: 3,
    repetition_penalty: 10.0,
    length_penalty: 0.0,
    max_mel_tokens: 1500,
    max_text_tokens_per_segment: 120
  }
})

const form = reactive(defaultForm())

const state = reactive({
  uploadingPrompt: false,
  uploadingEmo: false,
  playingAudio: ''
})

const coverImageUrl = computed(() => form.coverImagePath ? localUrl.addFileProtocol(form.coverImagePath) : '')

// 加载已有预设数据
watch(
  () => props.presetData,
  (data) => {
    if (data) {
      Object.assign(form, {
        id: data.id,
        name: data.name || '',
        coverImagePath: data.cover_image_path || '',
        promptAudioPath: data.prompt_audio_path || '',
        promptAudioName: data.prompt_audio_path ? data.prompt_audio_path.split(/[\\/]/).pop() : '',
        promptAudioDuration: '',
        emoAudioPath: data.emo_audio_path || '',
        emoAudioName: data.emo_audio_path ? data.emo_audio_path.split(/[\\/]/).pop() : '',
        emo_control_method: data.emo_control_method ?? 0,
        emo_weight: data.emo_weight ?? 0.65,
        emo_vector: typeof data.emo_vector === 'string' ? JSON.parse(data.emo_vector || '[0,0,0,0,0,0,0,0]') : (data.emo_vector || [0, 0, 0, 0, 0, 0, 0, 0]),
        emo_text: data.emo_text || '',
        emo_random: !!data.emo_random,
        advanced: typeof data.advanced_params === 'string' ? JSON.parse(data.advanced_params || '{}') : (data.advanced_params || {})
      })
      // 合并默认高级参数
      const defAdv = defaultForm().advanced
      form.advanced = { ...defAdv, ...form.advanced }
    }
  },
  { immediate: true }
)

const audio = new Audio()
audio.addEventListener('ended', () => {
  state.playingAudio = ''
})

const action = {
  async selectPromptAudio() {
    const filePath = await Client.file.selectAudio()
    if (!filePath) return
    state.uploadingPrompt = true
    try {
      const info = await Client.file.getAudioInfo(filePath)
      if (!info.isOK) {
        MessagePlugin.error(info.msg || '音频文件无效')
        return
      }
      form.promptAudioPath = filePath
      form.promptAudioName = info.name
      form.promptAudioDuration = millisecondsToTime(info.duration * 1000)
    } catch (err) {
      console.error('选择音色音频失败', err)
    } finally {
      state.uploadingPrompt = false
    }
  },
  clearPromptAudio() {
    if (state.playingAudio === 'prompt') action.stopAudioPlay()
    form.promptAudioPath = ''
    form.promptAudioName = ''
    form.promptAudioDuration = ''
  },
  async selectCoverImage() {
    const filePath = await Client.file.selectImage()
    if (!filePath) return
    form.coverImagePath = filePath
    form.coverImageName = filePath.split(/[\\/]/).pop()
  },
  clearCoverImage() {
    form.coverImagePath = ''
    form.coverImageName = ''
  },
  async selectEmoAudio() {
    const filePath = await Client.file.selectAudio()
    if (!filePath) return
    state.uploadingEmo = true
    try {
      const info = await Client.file.getAudioInfo(filePath)
      if (!info.isOK) {
        MessagePlugin.error(info.msg || '音频文件无效')
        return
      }
      form.emoAudioPath = filePath
      form.emoAudioName = info.name
    } catch (err) {
      console.error('选择情感音频失败', err)
    } finally {
      state.uploadingEmo = false
    }
  },
  clearEmoAudio() {
    if (state.playingAudio === 'emo') action.stopAudioPlay()
    form.emoAudioPath = ''
    form.emoAudioName = ''
  },
  playPromptAudio() {
    if (!form.promptAudioPath) {
      MessagePlugin.error('请先上传音色音频')
      return
    }
    if (state.playingAudio === 'prompt') {
      action.stopAudioPlay()
      return
    }
    audio.src = localUrl.addFileProtocol(form.promptAudioPath)
    state.playingAudio = 'prompt'
    audio.play().catch((err) => {
      console.error('播放失败', err)
      MessagePlugin.error('播放失败')
      state.playingAudio = ''
    })
  },
  playEmoAudio() {
    if (!form.emoAudioPath) {
      MessagePlugin.error('请先上传情感音频')
      return
    }
    if (state.playingAudio === 'emo') {
      action.stopAudioPlay()
      return
    }
    audio.src = localUrl.addFileProtocol(form.emoAudioPath)
    state.playingAudio = 'emo'
    audio.play().catch((err) => {
      console.error('播放失败', err)
      MessagePlugin.error('播放失败')
      state.playingAudio = ''
    })
  },
  stopAudioPlay() {
    audio.pause()
    audio.currentTime = 0
    state.playingAudio = ''
  }
}

defineExpose({
  form,
  validate() {
    if (!form.name) {
      MessagePlugin.error('请输入预设名称')
      return false
    }
    if (!form.promptAudioPath) {
      MessagePlugin.error('请上传音色音频')
      return false
    }
    if (form.emo_control_method === 1 && !form.emoAudioPath) {
      MessagePlugin.error('请上传情感参考音频')
      return false
    }
    if (form.emo_control_method === 3 && !form.emo_text) {
      MessagePlugin.error('请输入情感描述文本')
      return false
    }
    return true
  }
})
</script>

<style lang="less" scoped>
.preset-form {
  color: var(--app-text-1);

  .form-section {
    margin-bottom: 24px;

    .section-title {
      font-weight: 500;
      font-size: 14px;
      color: #434af9;
      margin-bottom: 16px;
      padding-left: 8px;
      border-left: 3px solid #434af9;
    }
  }

  .form-item {
    display: flex;
    align-items: flex-start;
    margin-bottom: 16px;
    gap: 12px;

    .label {
      flex: none;
      width: 80px;
      font-size: 12px;
      color: var(--app-text-2);
      line-height: 30px;
      text-align: right;

      &.required::after {
        content: ' *';
        color: #f54545;
      }
    }

    .value {
      flex: 1;
      --td-text-color-primary: var(--app-text-1);
      --td-text-color-placeholder: var(--app-text-3);
      --td-bg-color-container: var(--app-bg-input);
      --td-border-level-2-color: var(--app-border);
    }
  }

  .audio-upload {
    flex: 1;

    .audio-info {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: var(--app-bg-input);
      border-radius: 4px;
      border: 1px solid var(--app-border);

      .audio-name {
        font-size: 12px;
        color: var(--app-text-1);
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .audio-duration {
        font-size: 11px;
        color: var(--app-text-3);
      }

      .audio-play-icon {
        width: 16px;
        height: 16px;
        cursor: pointer;
        opacity: 0.7;
        &:hover { opacity: 1; }
      }

      .audio-del {
        width: 14px;
        height: 14px;
        cursor: pointer;
      }
    }

    .cover-info {
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 100%;

      .cover-preview {
        flex: none;
        width: 64px;
        height: 64px;
        object-fit: cover;
        border-radius: 4px;
        border: 1px solid var(--app-border);
      }

      .cover-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }

    .upload-tip {
      font-size: 11px;
      color: var(--app-text-3);
      margin-top: 6px;
    }
  }

  .emo-vector {
    flex-direction: column;

    .vector-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 24px;
      width: 100%;
    }

    .vector-item {
      display: flex;
      align-items: center;
      gap: 8px;

      .v-label {
        flex: none;
        width: 36px;
        font-size: 12px;
        color: var(--app-text-2);
      }

      .v-slider {
        flex: 1;
      }

      .v-value {
        flex: none;
        width: 32px;
        font-size: 11px;
        color: var(--app-text-3);
        text-align: right;
      }
    }
  }

  .slider-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;

    .slider-val {
      flex: none;
      width: 36px;
      font-size: 11px;
      color: var(--app-text-2);
      text-align: right;
    }
  }

  .audition-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;

    .audition-tip {
      font-size: 11px;
      color: var(--app-text-3);
    }
  }

  .advanced-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .adv-item {
      display: flex;
      align-items: center;
      gap: 12px;

      .adv-label {
        flex: none;
        width: 130px;
        font-size: 12px;
        color: var(--app-text-2);
      }
    }
  }

  :deep(.t-radio-group) {
    --td-brand-color: #434af9;
    --td-bg-color-container-select: #434af9;
    --td-bg-color-secondarycontainer: var(--app-bg-input);
    background: var(--app-bg-input);
    padding: 4px;
    border-radius: 4px;

    .t-radio-button {
      border-radius: 4px;
      background: transparent;
      color: var(--app-text-2);
      font-size: 12px;
      border: none;
      box-shadow: none;

      &:hover {
        color: var(--app-text-1);
        background: var(--app-bg-surface-hover);
      }

      &.t-is-checked {
        background: #434af9;
        color: #ffffff;
      }
    }
  }

  :deep(.t-checkbox) {
    color: var(--app-text-1);
    --td-text-color-primary: var(--app-text-1);

    .t-checkbox__label {
      color: var(--app-text-1);
    }
  }

  :deep(.t-button--theme-default) {
    background-color: var(--app-bg-elevated);
    color: var(--app-text-1);
    border-color: var(--app-border);
    --td-bg-color-container: var(--app-bg-elevated);

    &:hover {
      background-color: var(--app-bg-surface-active);
      color: var(--app-text-1);
      border-color: #434af9;
    }
  }

  :deep(.t-collapse) {
    background: transparent;
    border: none;

    .t-collapse-panel__header {
      font-size: 14px;
      color: var(--app-text-1);
      font-weight: 500;
      padding-left: 8px;
      border-left: 3px solid #434af9;
    }

    .t-collapse-panel__content {
      background: transparent;
    }
  }

  :deep(.t-slider__rail) {
    background: var(--app-border);
  }
}
</style>
