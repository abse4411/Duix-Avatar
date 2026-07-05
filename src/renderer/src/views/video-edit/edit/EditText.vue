<template>
  <div class="text">
    <t-textarea class="text-content" v-model="select.text"
      :placeholder="$t('common.input.videoContentTextPlaceholder')" />
    <div class="text-listen">
      <!-- TTS 引擎切换 -->
      <div class="engine-tabs">
        <div class="engine-tab" :class="{ active: !getter.isIndexTts.value }" @click="action.switchEngine('fish-speech')">Fish-Speech</div>
        <div class="engine-tab" :class="{ active: getter.isIndexTts.value }" @click="action.switchEngine('index-tts2')">Index-TTS2</div>
      </div>
      <div class="listen-row">
        <!-- 选择音色 -->
        <div class="speaker">
          <div class="speaker-content">
            <span class="label">{{ $t('common.editView.speaker') }}</span>
            <t-popup trigger="click" overlayClassName="speaker-popup" placement="top-left"
              v-model:visible="state.popupVisible">
              <t-select class="selector" :value="select.speaker?.name"
                :popupProps="{ overlayClassName: 'speaker-options' }" :placeholder="getter.isIndexTts.value ? '选择预设音色' : $t('common.editView.selectSpeaker')">
              </t-select>
              <template #content>
                <div class="popup-scoped">
                  <div class="side">{{ getter.isIndexTts.value ? '预设音色' : $t('common.editView.myVoice') }}</div>
                  <EditTextSpeaker class="wrap" v-model="select" @onSelect="action.onSelectSpeaker"
                    :popupVisible="state.popupVisible" />
                </div>
              </template>
            </t-popup>
          </div>
        </div>
        <!-- 试听 -->
        <t-button class="start" size="small" @click="action.textToAudio" :loading="state.textToAudioLoading">{{ $t('common.editView.listen') }}</t-button>
      </div>
    </div>
  </div>
</template>
<script setup>
import { reactive, computed } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import EditTextSpeaker from './EditTextSpeaker.vue';
import { useI18n } from 'vue-i18n'
import { audition } from '@renderer/api'
const { t } = useI18n()

const select = defineModel({})

const props = defineProps({
  listener: {
    type: Object,
    default: () => ({})
  }
})


const state = reactive({
  popupVisible: false,
  textToAudioLoading: false,
})

const getter = {
  isIndexTts: computed(() => select.value?.ttsEngine === 'index-tts2'),
}

const action = {
  switchEngine(engine) {
    if (select.value?.ttsEngine === engine) return
    select.value.ttsEngine = engine
    select.value.speaker = {}
    props.listener.pause()
  },
  async textToAudio() {
    const { speaker, text } = select.value || {}
    const isIndexTts = getter.isIndexTts.value
    if (isIndexTts) {
      if (!speaker?.voice_preset_id) {
        MessagePlugin.error('请选择预设音色')
        return false
      }
    } else {
      if (!speaker?.voice_id) {
        MessagePlugin.error('请选择音色')
        return false
      }
    }
    if (!text) {
      MessagePlugin.error(t('common.message.videoContentText'))
      return false
    }
    state.textToAudioLoading = true
    try {
      if (isIndexTts) {
        if (!speaker.prompt_audio_path) {
          MessagePlugin.error('未找到音色音频')
          return false
        }
        const name = (speaker.name || '') + ' - 原音试听'
        props.listener.listen({
          name,
          audioUrl: speaker.prompt_audio_path
        })
      } else {
        const auditionUrl = await audition(speaker.voice_id, text)
        const name = (speaker.name || '') + ' - ' + text.slice(0, 10)
        props.listener.listen({
          name,
          audioUrl: auditionUrl
        })
      }
    } catch (err) {
      console.error('文本转音频失败', err)
      MessagePlugin.error(err.toString() || '试听失败')
    } finally {
      state.textToAudioLoading = false
    }

  },
  onSelectSpeaker(speaker) {
    props.listener.pause()
    state.popupVisible = false
  }
}

</script>
<style lang="less">
.speaker {
  &-options {
    visibility: hidden;
  }

  &-popup {
    width: 412px;
    height: 400px;
    background: var(--app-bg-surface);
    box-shadow: 0px 10px 30px 0px rgba(0, 0, 0, 0.5);
    border-radius: 4px 4px 4px 4px;
    border: 1px solid var(--app-border);
    margin-bottom: 12px !important;

    .t-popup__content {
      background-color: transparent;
      border: none;
      box-shadow: none;
      height: 100%;
      color: var(--app-text-1);
      padding: 0;
    }
  }
}
</style>
<style lang="less" scoped>
.text {
  height: 100%;
  position: relative;

  &-content {
    height: 100%;
    --td-text-color-placeholder: var(--app-text-2);
    padding-bottom: 84px;

    :deep(textarea) {
      height: 100% !important;
      border: none;
      font-size: 12px;
      min-height: unset;
      padding: 12px;
      color: var(--app-text-1);
      line-height: 20px;
      resize: none;
    }
  }

  &-listen {
    padding: 0 12px;
    position: absolute;
    bottom: 12px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;

    .engine-tabs {
      display: flex;
      gap: 4px;

      .engine-tab {
        flex: 1;
        text-align: center;
        padding: 5px 0;
        font-size: 12px;
        color: var(--app-text-2);
        cursor: pointer;
        border-radius: 4px;
        background: var(--app-bg-elevated);
        transition: all 0.2s;

        &:hover {
          color: var(--app-text-1);
        }

        &.active {
          background: #434af9;
          color: #ffffff;
        }
      }
    }

    .listen-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    }

    .start {
      min-width: 48px;
      height: 24px;
      border-radius: 2px;
      font-size: 12px;
    }

    .speaker {
      --td-text-color-primary: var(--app-text-1);

      &-content {
        display: flex;
        align-items: center;
        gap: 12px;

        .label {
          font-weight: 500;
          font-size: 12px;
          color: var(--app-text-1);
          line-height: 18px;
          white-space: nowrap;
        }

        .selector {
          width: 88px;
          height: 30px;
          border-radius: 4px 4px 4px 4px;
          border: 1px solid var(--app-border);
          --td-brand-color-focus: transparent;
          --td-text-color-placeholder: var(--app-text-2);

          :deep(.t-input) {
            background-color: transparent;
            color: var(--app-text-1);
            font-weight: 400;
            font-size: 12px;
            height: 30px;
            border: none;
            transition: none;

            &:hover {
              border: none;
            }

            svg {
              color: var(--app-text-1);
            }
          }
        }
      }

    }
  }
}


.popup-scoped {
  display: flex;
  height: 100%;
  align-items: stretch;

  .side {
    width: 68px;
    flex: none;
    padding: 20px 0 0 0;
    background: var(--app-bg-elevated);
    text-align: center;
    font-weight: 400;
    font-size: 14px;
    color: var(--app-text-3);
    line-height: 22px;
  }

  .wrap {
    flex: 1;
  }

}
</style>
