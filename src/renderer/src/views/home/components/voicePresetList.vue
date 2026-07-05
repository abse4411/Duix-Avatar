<template>
  <div class="preset-content-box">
    <div class="form-box">
      <t-input v-model="state.formData.name" class="form-input" placeholder="请输入预设名称搜索" @change="onKeypressFun">
        <template #prefix-icon>
          <img src="../../../assets/images/home/select.svg" />
        </template>
      </t-input>
    </div>
    <div class="preset-content-table">
      <div v-if="home.homeState.voicePresetNum === 0" class="empty">
        <div class="empty-box">
          <img src="../../../assets/images/home/myModelList.svg" />
          <div class="empty-text">暂无音色预设</div>
          <div class="empty-text">
            <span @click="handleCreate">创建音色预设</span>
            开始使用 IndexTTS
          </div>
        </div>
      </div>
      <div class="table-list" v-else>
        <div v-for="(item, index) in state.presetList" :key="index + 'presetList'" class="li" @mouseleave="action.stopAudio">
          <div class="img-video comme">
            <img v-if="item.cover_image_path" class="cover-img" :src="localUrl.addFileProtocol(item.cover_image_path)" />
            <div class="img-video-content">
              <div class="audio-icon-area">
                <img v-if="state.playingId !== item.id" src="@renderer/assets/images/icons/icon-play.png" class="play-icon" @click="action.handlePlay(item)" />
                <img v-else src="@renderer/assets/images/icons/icon-pause.png" class="play-icon" @click="action.stopAudio" />
              </div>
            </div>
          </div>
          <div class="download-preview comme">
            <div class="download-preview-content">
              <div class="action-row">
                <div class="play-button" @click="action.handlePlay(item)">
                  <img v-if="state.playingId !== item.id" src="@renderer/assets/images/icons/icon-play.png" />
                  <img v-else src="@renderer/assets/images/icons/icon-pause.png" />
                  <span>原音</span>
                </div>
                <div class="play-button" v-if="item.emo_audio_path" @click="action.handlePlayEmo(item)">
                  <img v-if="state.playingId !== ('emo_' + item.id)" src="@renderer/assets/images/icons/icon-play.png" />
                  <img v-else src="@renderer/assets/images/icons/icon-pause.png" />
                  <span>情感</span>
                </div>
                <div class="download-button" @click="handleEdit(item)">
                  <img src="../../../assets/images/home/video.svg" />
                  <span>编辑</span>
                </div>
              </div>
              <div class="delete-video" @click="delPreset(item.id)">
                <DeleteIcon style="color: #fff; font-size: 12px" />
              </div>
            </div>
          </div>
          <div class="bottom-text">
            <div class="top">
              <div class="emo-tag">{{ emoMethodLabel(item.emo_control_method) }}</div>
              <div class="h1">{{ item.name }}</div>
            </div>
            <div class="text">{{ formatDate(item.created_at) }}</div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="home.homeState.voicePresetNum > 0" class="pagination-box">
      <div class="pagination-content">
        <t-pagination
          v-model="state.current"
          v-model:pageSize="state.pageSize"
          :total="state.total"
          show-jumper
          class="pagination"
          @page-size-change="onPageSizeChange"
          @current-change="onCurrentChange"
        />
      </div>
    </div>
    <DeleteDialog ref="deleteDialogRef" @ok="okDelete" />
  </div>
</template>

<script setup>
import { reactive, onMounted, ref } from 'vue'
import { DeleteIcon } from 'tdesign-icons-vue-next'
import { MessagePlugin } from 'tdesign-vue-next'
import { voicePresetPage, removeVoicePreset, countVoicePreset } from '@renderer/api/index.js'
import { formatDate } from '@renderer/utils/index.js'
import { localUrl } from '@renderer/utils'
import DeleteDialog from '@renderer/components/deleteDialog.vue'
import { useHomeStore } from '@renderer/stores/home.js'
import { createVoicePreset } from '@renderer/components/voice-preset-create'

const home = useHomeStore()
const deleteDialogRef = ref(null)

const EMO_LABELS = ['与音色相同', '情感参考音频', '情感向量', '情感描述文本']

const state = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  isTime: false,
  presetList: [],
  delPresetId: '',
  playingId: '',
  formData: { name: '' }
})

const audio = new Audio()
audio.addEventListener('ended', () => {
  state.playingId = ''
})

onMounted(() => {
  presetPageAJax()
})

const emoMethodLabel = (method) => {
  return EMO_LABELS[method] || '未知'
}

const presetPageAJax = async () => {
  try {
    const res = await voicePresetPage({
      page: state.current,
      pageSize: state.pageSize,
      name: state.formData.name
    })
    if (res) {
      state.total = res.total
      state.presetList = res.list || []
    }
  } catch (error) {
    console.error('查询音色预设列表失败', error)
  }
}

const refreshCount = async () => {
  try {
    const res = await countVoicePreset()
    if (res !== undefined) home.setVoicePresetNum(res)
  } catch (error) {
    console.log(error)
  }
}

const handleCreate = async () => {
  const { isSubmitOK } = await createVoicePreset()
  if (isSubmitOK) {
    presetPageAJax()
    refreshCount()
  }
}

const handleEdit = async (item) => {
  const { isSubmitOK } = await createVoicePreset({ presetId: item.id })
  if (isSubmitOK) {
    presetPageAJax()
  }
}

const okDelete = () => {
  removeVoicePreset(state.delPresetId)
    .then(() => {
      presetPageAJax()
      refreshCount()
      MessagePlugin.success('删除成功')
    })
    .catch((error) => {
      MessagePlugin.error('删除失败')
      console.error('Error:', error)
    })
}

const delPreset = (id) => {
  if (deleteDialogRef.value && deleteDialogRef.value.showDialogFun) {
    deleteDialogRef.value.showDialogFun()
    state.delPresetId = id
  }
}

const onKeypressFun = () => {
  if (!state.isTime) {
    state.isTime = true
    const timeout = setTimeout(() => {
      state.current = 1
      presetPageAJax()
      state.isTime = false
      clearTimeout(timeout)
    }, 800)
  }
}

const onPageSizeChange = (size) => {
  state.pageSize = size
  presetPageAJax()
}

const onCurrentChange = (index) => {
  state.current = index
  presetPageAJax()
}

const action = {
  handlePlay(item) {
    if (state.playingId === item.id) {
      action.stopAudio()
      return
    }
    if (!item.prompt_audio_path) {
      MessagePlugin.error('未找到音色音频')
      return
    }
    action.stopAudio()
    audio.src = localUrl.addFileProtocol(item.prompt_audio_path)
    state.playingId = item.id
    audio.play().catch((err) => {
      console.error('播放失败', err)
      MessagePlugin.error('播放失败')
      state.playingId = ''
    })
  },
  handlePlayEmo(item) {
    const playId = 'emo_' + item.id
    if (state.playingId === playId) {
      action.stopAudio()
      return
    }
    if (!item.emo_audio_path) {
      MessagePlugin.error('未找到情感音频')
      return
    }
    action.stopAudio()
    audio.src = localUrl.addFileProtocol(item.emo_audio_path)
    state.playingId = playId
    audio.play().catch((err) => {
      console.error('播放失败', err)
      MessagePlugin.error('播放失败')
      state.playingId = ''
    })
  },
  stopAudio() {
    audio.pause()
    audio.currentTime = 0
    state.playingId = ''
  }
}

defineExpose({
  presetPageAJax
})
</script>

<style lang="less" scoped>
.preset-content-box {
  .form-box {
    display: flex;
    margin-bottom: 24px;
    position: absolute;
    top: -50px;
    right: 0;
    .form-input {
      width: 216px;
      margin-left: auto;
    }
  }

  .preset-content-table {
    min-height: calc(100vh - 404px);

    .empty {
      display: flex;
      justify-content: center;
      align-items: center;
      height: calc(100vh - 384px);
      .empty-box {
        img { width: 160px; margin: 0 auto; display: block; }
        .empty-text {
          font-size: 12px;
          text-align: center;
          color: #999999;
          line-height: 16px;
          margin-top: 8px;
          span {
            color: #434af9;
            cursor: pointer;
            border-bottom: 1px solid #434af9;
          }
        }
      }
    }

    .table-list {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      padding-bottom: 40px;

      .li {
        transition: all 0.3s ease;
        aspect-ratio: 1 / 0.83;
        border-radius: 8px;
        position: relative;
        cursor: pointer;
        border: 1px solid #f2f2f4;

        &:hover {
          transform: scale(1.01);
          box-shadow: 0px 0px 12px rgba(0, 0, 0, 0.12);
          .download-preview {
            z-index: 2;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            justify-content: center;
            align-items: center;
          }
        }

        .download-preview {
          display: none;
          .download-preview-content {
            .action-row {
              display: flex;
              gap: 8px;
            }
            .play-button {
              padding: 0 10px;
              height: 30px;
              cursor: pointer;
              background: rgba(255, 255, 255, 0.2);
              border-radius: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              color: #ffffff;
              img { width: 14px; height: 14px; margin-right: 4px; }
              &:hover { background: rgba(255, 255, 255, 0.32); }
            }
            .download-button {
              padding: 0 12px;
              height: 30px;
              cursor: pointer;
              background: #434af9;
              border-radius: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              color: #ffffff;
              img { margin-right: 4px; }
            }
            .delete-video {
              width: 20px;
              height: 20px;
              background: rgba(255, 255, 255, 0.2);
              border-radius: 6px;
              position: absolute;
              left: 10px;
              top: 10px;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
            }
          }
        }

        .comme {
          position: absolute;
          top: 0;
          width: 100%;
          left: 0;
          border-radius: 8px 8px 0 0;
          height: calc(100% - 65px);
        }

        .img-video {
          z-index: 1;
          background: linear-gradient(135deg, #434af9 0%, #3c73ff 100%);
          overflow: hidden;

          .cover-img {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .img-video-content {
            position: relative;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            .audio-icon-area {
              .play-icon {
                width: 40px;
                height: 40px;
                cursor: pointer;
                opacity: 0.9;
                &:hover { opacity: 1; }
              }
            }
          }
        }

        .bottom-text {
          position: absolute;
          bottom: 0;
          padding: 4px 8px 8px 8px;
          left: 0;
          width: 100%;
          height: 65px;
          background: #ffffff;
          .top {
            display: flex;
            align-items: center;
            margin-top: 5px;
            margin-bottom: 4px;
            gap: 4px;
            .emo-tag {
              padding: 2px 6px;
              background: rgba(67, 74, 249, 0.1);
              border-radius: 2px;
              font-size: 10px;
              color: #434af9;
              white-space: nowrap;
            }
            .h1 {
              font-weight: 600;
              font-size: 14px;
              color: #252525;
              line-height: 23px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          }
          .text {
            font-size: 12px;
            color: rgba(37, 37, 37, 0.5);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-top: 6px;
          }
        }
      }
    }
  }

  .pagination-box {
    position: sticky;
    z-index: 99;
    height: 46px;
    width: 100%;
    bottom: -20px;
    left: 0;
    background-color: #fff;
    .pagination-content {
      justify-content: center;
      display: flex;
      height: 46px;
    }
  }
}
</style>
