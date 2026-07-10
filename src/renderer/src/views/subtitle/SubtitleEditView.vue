<template>
  <div class="subtitle-layout">
    <!-- 顶部 Header -->
    <div class="subtitle-header">
      <div class="header-left" @click="goBack">
        <img src="../../assets/images/icons/icon-back.svg" class="back-icon" v-if="false" />
        <span class="back-text">{{ $t('common.headerView.headerBackText') }}</span>
      </div>
      <div class="header-title">{{ state.videoName || '字幕编辑' }}</div>
      <div class="header-right">
        <t-button theme="default" size="small" @click="goBack">取消</t-button>
        <t-button theme="primary" size="small" @click="action.save" :loading="state.saving">保存字幕</t-button>
        <t-button theme="primary" size="small" @click="action.compose">合成视频</t-button>
      </div>
    </div>

    <!-- 主体内容 -->
    <div class="subtitle-body" v-if="state.loaded">
      <!-- 左侧视频预览 -->
      <div class="preview-pane">
        <div class="preview-title">{{ state.videoName }}</div>
        <div class="preview-video-box" v-if="state.videoUrl">
          <video
            ref="videoRef"
            :src="state.videoUrl"
            controls
            class="preview-video"
            @timeupdate="onTimeUpdate"
          ></video>
        </div>
        <div class="preview-empty" v-else>
          <span>视频文件不可用</span>
        </div>
      </div>

      <!-- 右侧字幕编辑 -->
      <div class="subtitle-pane">
        <div class="subtitle-pane-header">
          <span class="pane-title">字幕列表</span>
          <span class="pane-count">共 {{ state.segments.length }} 条</span>
          <t-button theme="primary" variant="outline" size="small" @click="action.addSegment">添加字幕</t-button>
        </div>
        <div class="subtitle-list" v-if="state.segments.length > 0">
          <div
            v-for="(seg, index) in state.segments"
            :key="index"
            class="subtitle-item"
            :class="{ active: state.activeIndex === index }"
            @click="state.activeIndex = index"
          >
            <div class="subtitle-item-header">
              <span class="seg-index">{{ index + 1 }}</span>
              <span class="seg-time">{{ seg.start }} → {{ seg.end }}</span>
              <span class="seg-jump" @click.stop="action.seekTo(seg)">跳转</span>
              <span class="seg-delete" @click.stop="action.deleteSegment(index)">删除</span>
            </div>
            <t-textarea
              v-model="seg.text"
              :autosize="{ minRows: 2, maxRows: 5 }"
              placeholder="输入字幕文本"
              class="seg-text"
            />
          </div>
        </div>
        <div class="subtitle-empty" v-else>
          <span>暂无字幕，点击"添加字幕"创建</span>
        </div>
      </div>
    </div>

    <!-- 加载中 -->
    <div class="subtitle-loading" v-else>
      <t-loading size="large" />
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MessagePlugin } from 'tdesign-vue-next'
import { findVideo, getSubtitle, saveSubtitle } from '@renderer/api/index.js'
import { localUrl } from '@renderer/utils'
import { parseSrt, serializeSrt, formatSrtTime } from '@renderer/utils/srt-utils.js'

const route = useRoute()
const router = useRouter()
const videoRef = ref(null)

const state = reactive({
  loaded: false,
  saving: false,
  videoId: null,
  videoName: '',
  videoUrl: '',
  segments: [],
  activeIndex: -1
})

onMounted(async () => {
  const id = route.query.id
  if (!id) {
    MessagePlugin.error('缺少视频 ID')
    return
  }
  state.videoId = Number(id)
  try {
    const video = await findVideo(state.videoId)
    if (!video) {
      MessagePlugin.error('视频不存在')
      return
    }
    state.videoName = video.name || '未命名'
    state.videoUrl = video.file_path ? localUrl.addFileProtocol(video.file_path) : ''

    if (video.subtitle_path) {
      const srtContent = await getSubtitle(state.videoId)
      if (srtContent) {
        state.segments = parseSrt(srtContent)
      }
    }
    state.loaded = true
  } catch (err) {
    console.error('加载视频失败', err)
    MessagePlugin.error('加载失败：' + (err.message || err))
  }
})

const goBack = () => {
  router.push('/home')
}

const onTimeUpdate = () => {
  // 可扩展：根据视频时间高亮当前字幕
}

const action = {
  async save() {
    if (!state.videoId) return
    state.saving = true
    try {
      const srtContent = serializeSrt(state.segments)
      await saveSubtitle(state.videoId, srtContent)
      MessagePlugin.success('字幕保存成功')
    } catch (err) {
      console.error('保存字幕失败', err)
      MessagePlugin.error('保存失败：' + (err.message || err))
    } finally {
      state.saving = false
    }
  },
  compose() {
    // 合成视频实现暂时空着
    MessagePlugin.warning('合成功能开发中')
  },
  addSegment() {
    const lastSeg = state.segments[state.segments.length - 1]
    const start = lastSeg ? lastSeg.end : '00:00:00,000'
    const seg = {
      start,
      end: start,
      text: ''
    }
    state.segments.push(seg)
    state.activeIndex = state.segments.length - 1
  },
  deleteSegment(index) {
    state.segments.splice(index, 1)
    if (state.activeIndex >= state.segments.length) {
      state.activeIndex = state.segments.length - 1
    }
  },
  seekTo(seg) {
    if (!videoRef.value) return
    // 解析 start 时间为秒数
    const match = seg.start.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/)
    if (match) {
      const seconds = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]) + parseInt(match[4]) / 1000
      videoRef.value.currentTime = seconds
      videoRef.value.play()
    }
  }
}
</script>

<style lang="less" scoped>
.subtitle-layout {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--app-bg-page);
  color: var(--app-text-1);

  .subtitle-header {
    height: 60px;
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    background: var(--app-bg-surface);
    border-bottom: 1px solid var(--app-border);
    -webkit-app-region: drag;

    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      -webkit-app-region: no-drag;

      .back-icon {
        width: 16px;
        height: 16px;
      }
      .back-text {
        font-size: 14px;
        color: var(--app-text-1);
      }
      &:hover .back-text {
        color: #434af9;
      }
    }

    .header-title {
      font-weight: 500;
      font-size: 16px;
      color: var(--app-text-1);
    }

    .header-right {
      display: flex;
      gap: 8px;
      -webkit-app-region: no-drag;
    }
  }

  .subtitle-body {
    flex: 1;
    display: flex;
    overflow: hidden;

    .preview-pane {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 24px;
      overflow: hidden;

      .preview-title {
        font-weight: 500;
        font-size: 14px;
        color: var(--app-text-1);
        margin-bottom: 16px;
      }

      .preview-video-box {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--app-bg-input);
        border-radius: 8px;
        overflow: hidden;

        .preview-video {
          max-width: 100%;
          max-height: 100%;
        }
      }

      .preview-empty {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--app-bg-input);
        border-radius: 8px;
        color: var(--app-text-3);
        font-size: 14px;
      }
    }

    .subtitle-pane {
      width: 460px;
      flex: none;
      display: flex;
      flex-direction: column;
      border-left: 1px solid var(--app-border);
      background: var(--app-bg-surface);

      .subtitle-pane-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 20px;
        border-bottom: 1px solid var(--app-border);

        .pane-title {
          font-weight: 500;
          font-size: 14px;
          color: var(--app-text-1);
        }
        .pane-count {
          font-size: 12px;
          color: var(--app-text-3);
          flex: 1;
        }
      }

      .subtitle-list {
        flex: 1;
        overflow-y: auto;
        padding: 12px 16px;

        .subtitle-item {
          padding: 12px;
          margin-bottom: 10px;
          background: var(--app-bg-input);
          border: 1px solid var(--app-border);
          border-radius: 6px;
          cursor: pointer;
          transition: border-color 0.2s;

          &:hover {
            border-color: #434af9;
          }
          &.active {
            border-color: #434af9;
          }

          .subtitle-item-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;

            .seg-index {
              flex: none;
              width: 22px;
              height: 22px;
              border-radius: 4px;
              background: #434af9;
              color: #fff;
              font-size: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .seg-time {
              flex: 1;
              font-size: 11px;
              color: var(--app-text-2);
              font-family: monospace;
            }
            .seg-jump,
            .seg-delete {
              font-size: 11px;
              color: var(--app-text-3);
              cursor: pointer;
              &:hover {
                color: #434af9;
              }
            }
            .seg-delete {
              &:hover {
                color: #f54545;
              }
            }
          }

          :deep(.seg-text) {
            .t-textarea__inner {
              background: transparent;
              color: var(--app-text-1);
              border-color: var(--app-border);
              font-size: 13px;
              line-height: 20px;
            }
          }
        }
      }

      .subtitle-empty {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--app-text-3);
        font-size: 13px;
      }
    }
  }

  .subtitle-loading {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
