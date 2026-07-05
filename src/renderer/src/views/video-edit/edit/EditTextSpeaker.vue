<template>
  <div class="list">
    <!-- 搜索框 -->
    <t-input class="list-search" v-model="state.search" :placeholder="getter.isIndexTts.value ? '搜索预设音色' : '搜索模特音色'"
      @change="action.searchList">
      <template #prefix-icon>
        <SearchIcon />
      </template>
    </t-input>
    <div class="list-box noscrollbar">
      <!-- 模特音色列表（Fish-Speech） -->
      <template v-if="!getter.isIndexTts.value">
        <div class="list-box__item" v-for="speaker in state.speakerList" :speaker-id="speaker.id" :key="speaker.id"
          @click="action.selectSpeaker(speaker)" :class="{ '--active': select.speaker?.id == speaker.id && !select.speaker?.voice_preset_id }">
          <t-avatar class="avatar" :alt="speaker.name">{{ speaker.name.slice(0, 1) }}</t-avatar>
          <div class="name" :title="speaker.name">{{ speaker.name }}</div>
          <t-image class="btn" v-if="state.playingId !== speaker.id" :src="PlayIcon"
            @click.stop="action.handlePlay(speaker)" />
          <t-image class="btn" v-else :src="PauseIcon" @click.stop="action.handlePlay(speaker)" />
        </div>
        <div v-if="state.speakerList.length === 0" class="empty-preset">暂无模特音色</div>
      </template>
      <!-- 预设音色列表（Index-TTS2） -->
      <template v-else>
        <div class="list-box__item" v-for="preset in state.presetList" :preset-id="preset.id" :key="preset.id"
          @click="action.selectPreset(preset)" :class="{ '--active': select.speaker?.voice_preset_id == preset.id }">
          <img v-if="preset.cover_image_path" class="cover-avatar" :src="localUrl.addFileProtocol(preset.cover_image_path)" />
          <t-avatar v-else class="avatar" :alt="preset.name">{{ preset.name.slice(0, 1) }}</t-avatar>
          <div class="name" :title="preset.name">{{ preset.name }}</div>
          <t-image class="btn" v-if="state.playingId !== ('preset_' + preset.id)" :src="PlayIcon"
            @click.stop="action.handlePlayPreset(preset)" />
          <t-image class="btn" v-else :src="PauseIcon" @click.stop="action.stopAudio" />
        </div>
        <div v-if="state.presetList.length === 0" class="empty-preset">暂无预设音色，请先在「音色管理」中创建</div>
      </template>
    </div>
  </div>

</template>
<script setup>
import { reactive, computed, onUnmounted, watchEffect, watch } from 'vue'
import { SearchIcon } from 'tdesign-icons-vue-next'
import PlayIcon from '@renderer/assets/images/icons/icon-play.png'
import PauseIcon from '@renderer/assets/images/icons/icon-pause.png'
import { modelPage, voicePresetPage } from '@renderer/api'
import { localUrl } from '@renderer/utils'
import { MessagePlugin } from 'tdesign-vue-next'

const select = defineModel({})

const AUDIO_STATUS = {
  UNPLAY: 0,
  PLAYING: 1,
  PLAYED: 2,
}

onUnmounted(() => {
  action.stopAudio()
})

const audio = new Audio()

audio.addEventListener('ended', () => {
  action.stopAudio()
})

const props = defineProps({
  popupVisible: {
    type: Boolean,
    default: false
  }
})

const state = reactive({
  search: '',
  playingId: '',
  status: AUDIO_STATUS.UNPLAY,
  speakerList: [],
  presetList: []
})

const getter = {
  isIndexTts: computed(() => select.value?.ttsEngine === 'index-tts2'),
}

const emit = defineEmits(['onSelect'])

const action = {
  init() {
    watchEffect(async () => {
      if (props.popupVisible) {
        await action.searchList()
        setTimeout(action.scrollToSelectSpeaker);
      } else {
        action.stopAudio()
      }
    })
    // 引擎切换时重新加载列表
    watch(() => select.value?.ttsEngine, async () => {
      state.search = ''
      if (props.popupVisible) {
        await action.searchList()
        setTimeout(action.scrollToSelectSpeaker)
      }
    })
  },
  async searchList() {
    try {
      if (getter.isIndexTts.value) {
        const result = await voicePresetPage({
          name: state.search,
          page: 1,
          pageSize: 100
        })
        state.presetList = result.list || []
      } else {
        const result = await modelPage({
          name: state.search,
          page: 1,
          pageSize: 100
        })
        state.speakerList = result.list || []
      }
    } catch (err) {
      console.error('查询音色列表失败', err)
      state.speakerList = []
      state.presetList = []
    }
  },
  scrollToSelectSpeaker() {
    if (getter.isIndexTts.value) {
      const presetId = select.value.speaker?.voice_preset_id
      if (presetId) {
        const target = document.querySelector(`div[preset-id="${presetId}"]`)
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    } else {
      const speakerId = select.value.speaker?.id
      if (speakerId && !select.value.speaker?.voice_preset_id) {
        const target = document.querySelector(`div[speaker-id="${speakerId}"]`)
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  },
  selectSpeaker(speaker) {
    select.value.speaker = speaker
    emit('onSelect', speaker)
  },
  selectPreset(preset) {
    select.value.speaker = {
      voice_preset_id: preset.id,
      name: preset.name,
      prompt_audio_path: preset.prompt_audio_path
    }
    emit('onSelect', select.value.speaker)
  },

  stopAudio() {
    audio.pause()
    audio.currentTime = 0
    state.playingId = ''
  },
  playAudio(speaker) {
    audio.src = speaker.audio_path
    state.playingId = speaker.id
    audio.play()
  },

  handlePlay(speaker) {
    if (!speaker.audio_path) {
      MessagePlugin.error(`未找到${speaker.name}的音频链接`)
      return
    }
    if (state.playingId === speaker.id) {
      action.stopAudio()
    } else {
      action.playAudio(speaker)
    }
  },
  handlePlayPreset(preset) {
    const playId = 'preset_' + preset.id
    if (state.playingId === playId) {
      action.stopAudio()
      return
    }
    if (!preset.prompt_audio_path) {
      MessagePlugin.error('未找到音色音频')
      return
    }
    action.stopAudio()
    audio.src = localUrl.addFileProtocol(preset.prompt_audio_path)
    state.playingId = playId
    audio.play().catch((err) => {
      console.error('播放失败', err)
      MessagePlugin.error('播放失败')
      state.playingId = ''
    })
  },
}

action.init()

</script>

<style lang="less" scoped>
.list {
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .empty-preset {
    text-align: center;
    padding: 40px 20px;
    font-size: 12px;
    color: var(--app-text-3);
  }

  &-search {
    flex: none;
    padding: 16px 12px;
    --td-bg-color-specialcomponent: var(--app-bg-surface);
    --td-text-color-primary: var(--app-text-1);
    --td-text-color-placeholder: var(--app-text-2);

    :deep(.t-input) {
      border-color: var(--app-border);
    }

    :deep(.t-input--focused) {
      box-shadow: none;
    }
  }

  &-box {
    flex: 1;
    overflow: auto;
    padding: 0 12px;
  }

  &-box__item {
    width: 100%;
    height: 72px;
    background: var(--app-bg-elevated);
    margin-bottom: 12px;
    border-radius: 4px 4px 4px 4px;
    border: 1px solid transparent;
    padding: 0px 20px;
    display: flex;
    align-items: center;
    gap: 8px;

    &.--active {
      border: 1px solid var(--td-brand-color);
    }

    &:last-of-type {
      margin-bottom: 21px;
    }

    .avatar {
      flex: none;
      width: 40px;
      height: 40px;
    }

    .cover-avatar {
      flex: none;
      width: 40px;
      height: 40px;
      object-fit: cover;
      border-radius: 50%;
    }

    .name {
      font-weight: 500;
      font-size: 14px;
      color: var(--app-text-1);
      line-height: 22px;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      /* 限制在两行 */
      overflow: hidden;
      /* 隐藏溢出的内容 */
      text-overflow: ellipsis;
      /* 溢出时显示省略号 */
    }

    .btn {
      flex: none;
      margin-left: auto;
      cursor: pointer;
      width: 28px;
      height: 28px;
      background: transparent;
    }
  }
}
</style>
