<template>
  <div class="subtitle-layout">
    <!-- 顶部 Header -->
    <div class="subtitle-header">
      <div class="header-left" @click="goBack">
        <span class="back-text">{{ $t('common.headerView.headerBackText') }}</span>
      </div>
      <div class="header-title">{{ state.videoName || $t('common.subtitleEdit.title') }}</div>
      <div class="header-right">
        <t-button theme="default" size="small" @click="goBack">{{ $t('common.subtitleEdit.cancel') }}</t-button>
        <t-button theme="primary" variant="outline" size="small" @click="action.save" :loading="state.saving">{{ $t('common.subtitleEdit.saveSubtitle') }}</t-button>
        <t-button theme="primary" size="small" @click="action.compose" :loading="state.burning">{{ $t('common.subtitleEdit.composeVideo') }}</t-button>
        <t-button theme="default" variant="outline" size="small" @click="action.download" v-if="state.composed">{{ $t('common.subtitleEdit.downloadVideo') }}</t-button>
      </div>
    </div>

    <!-- 主体内容 -->
    <div class="subtitle-body" v-if="state.loaded">
      <!-- 左侧视频预览 -->
      <div class="preview-pane" :class="{ 'fullscreen-mode': state.isFullscreen }">
        <div class="preview-title" v-if="!state.isFullscreen">{{ state.videoName }}</div>
        <template v-if="state.videoUrl">
          <div class="preview-video-box" ref="videoBoxRef">
            <div class="video-wrapper" ref="videoWrapperRef">
              <video
                ref="videoRef"
                :src="state.videoUrl"
                class="preview-video"
                @loadedmetadata="onLoadedMetadata"
                @timeupdate="onTimeUpdate"
                @play="onPlay"
                @pause="onPause"
                @seeked="onSeeked"
                @click="togglePlay"
              ></video>
              <!-- ffmpeg 准确预览层 -->
              <img
                v-if="state.showAccuratePreview && state.previewImageUrl"
                :src="state.previewImageUrl"
                class="accurate-preview-img"
                @click="togglePlay"
              />
              <!-- 渲染中提示 -->
              <div class="rendering-badge" v-if="state.rendering">
                <t-loading size="small" />
              </div>
            </div>
          </div>

          <!-- 自定义控制栏 -->
          <div class="video-controls">
            <button class="ctrl-btn" @click="togglePlay">
              <svg v-if="!state.isPlaying" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 2l11 6-11 6V2z"/></svg>
              <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="4" height="12"/><rect x="9" y="2" width="4" height="12"/></svg>
            </button>
            <span class="ctrl-time">{{ formatTime(state.currentTime) }} / {{ formatTime(state.videoDuration) }}</span>
            <div class="ctrl-spacer"></div>
            <button class="ctrl-btn" @click="scheduleAccurateRender(true)" :title="$t('common.subtitleEdit.refreshPreview')">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 3V1L5 4l3 3V5c2.2 0 4 1.8 4 4s-1.8 4-4 4-4-1.8-4-4H2c0 3.3 2.7 6 6 6s6-2.7 6-6-2.7-6-6-6z"/></svg>
            </button>
            <button class="ctrl-btn" @click="toggleFullscreen" :title="$t('common.subtitleEdit.fullscreen')">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1 1h5v2H3v3H1V1zm14 0v5h-2V3h-3V1h5zM1 15v-5h2v3h3v2H1zm14 0h-5v-2h3v-3h2v5z"/></svg>
            </button>
          </div>

          <!-- 字幕时间轴 -->
          <div class="timeline-container" v-if="state.videoDuration > 0">
            <!-- 时间标尺 -->
            <div class="timeline-ruler" ref="timelineRef" @mousedown="onRulerMouseDown">
              <div
                v-for="tick in ticks"
                :key="tick.time"
                class="tick"
                :style="{ left: tick.pos + '%' }"
              >
                <div class="tick-mark"></div>
                <span class="tick-label">{{ tick.label }}</span>
              </div>
              <!-- 播放头 -->
              <div class="playhead" :style="{ left: playheadPos + '%' }">
                <div class="playhead-head"></div>
              </div>
            </div>
            <!-- 字幕轨道 -->
            <div class="timeline-tracks">
              <div
                v-for="(seg, index) in state.segments"
                :key="index"
                class="subtitle-clip"
                :class="{ active: state.activeIndex === index, dragging: dragState.index === index && dragState.active }"
                :style="clipStyle(seg)"
                @mousedown.stop="onClipMouseDown($event, index)"
              >
                <div class="clip-handle clip-handle-left"></div>
                <div class="clip-body">
                  <span class="clip-text">{{ seg.text || $t('common.subtitleEdit.emptyClip') }}</span>
                </div>
                <div class="clip-handle clip-handle-right"></div>
              </div>
            </div>
          </div>
        </template>
        <div class="preview-empty" v-else>
          <span>{{ $t('common.subtitleEdit.videoUnavailable') }}</span>
        </div>
      </div>

      <!-- 右侧面板 -->
      <div class="subtitle-pane">
        <!-- 上半：字幕列表 -->
        <div class="pane-section list-section">
          <div class="section-header">
            <span class="pane-title">{{ $t('common.subtitleEdit.subtitleList') }}</span>
            <span class="pane-count">{{ $t('common.subtitleEdit.totalCount', { count: state.segments.length }) }}</span>
            <t-button theme="primary" variant="outline" size="small" @click="action.addSegment">{{ $t('common.subtitleEdit.addSubtitle') }}</t-button>
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
                <span class="seg-jump" @click.stop="action.seekTo(seg)">{{ $t('common.subtitleEdit.jump') }}</span>
                <span class="seg-delete" @click.stop="action.deleteSegment(index)">{{ $t('common.subtitleEdit.delete') }}</span>
              </div>
              <t-textarea
                v-model="seg.text"
                :autosize="{ minRows: 1, maxRows: 4 }"
                :placeholder="$t('common.subtitleEdit.textPlaceholder')"
                class="seg-text"
              />
            </div>
          </div>
          <div class="subtitle-empty" v-else>
            <span>{{ $t('common.subtitleEdit.emptySubtitle') }}</span>
          </div>
        </div>

        <!-- 下半：样式设置 -->
        <div class="pane-section style-section">
          <div class="section-header">
            <span class="pane-title">{{ $t('common.subtitleEdit.styleSettings') }}</span>
          </div>
          <div class="style-body">
            <!-- 预设配色 -->
            <div class="style-row">
              <label class="style-label">{{ $t('common.subtitleEdit.presets') }}</label>
              <div class="preset-list">
                <div
                  v-for="(preset, i) in presetStyles"
                  :key="i"
                  class="preset-item"
                  :style="preset.previewStyle"
                  @click="action.applyPreset(preset)"
                >Aa</div>
              </div>
            </div>
            <!-- 字体 -->
            <div class="style-row">
              <label class="style-label">{{ $t('common.subtitleEdit.font') }}</label>
              <t-select v-model="state.style.fontName" filterable size="small" style="width: 180px">
                <t-option v-for="f in state.fonts" :key="f" :value="f" :label="f" />
              </t-select>
            </div>
            <!-- 字号 -->
            <div class="style-row">
              <label class="style-label">{{ $t('common.subtitleEdit.fontSize') }}</label>
              <t-slider v-model="state.style.fontSize" :min="10" :max="80" style="width: 140px" />
              <span class="style-value">{{ state.style.fontSize }}px</span>
            </div>
            <!-- 粗体/斜体 -->
            <div class="style-row">
              <label class="style-label">{{ $t('common.subtitleEdit.bold') }}</label>
              <t-switch v-model="state.style.bold" size="small" />
              <label class="style-label" style="margin-left: 20px">{{ $t('common.subtitleEdit.italic') }}</label>
              <t-switch v-model="state.style.italic" size="small" />
            </div>
            <!-- 字体颜色 -->
            <div class="style-row">
              <label class="style-label">{{ $t('common.subtitleEdit.textColor') }}</label>
              <t-color-picker v-model="state.style.primaryColor" size="small" />
            </div>
            <!-- 描边 -->
            <div class="style-row">
              <label class="style-label">{{ $t('common.subtitleEdit.outlineColor') }}</label>
              <t-color-picker v-model="state.style.outlineColor" size="small" />
              <label class="style-label" style="margin-left: 16px">{{ $t('common.subtitleEdit.outlineWidth') }}</label>
              <t-slider v-model="state.style.outline" :min="0" :max="6" style="width: 80px" />
              <span class="style-value">{{ state.style.outline }}</span>
            </div>
            <!-- 阴影 -->
            <div class="style-row">
              <label class="style-label">{{ $t('common.subtitleEdit.shadowColor') }}</label>
              <t-color-picker v-model="state.style.backColor" size="small" />
              <label class="style-label" style="margin-left: 16px">{{ $t('common.subtitleEdit.shadowDistance') }}</label>
              <t-slider v-model="state.style.shadow" :min="0" :max="6" style="width: 80px" />
              <span class="style-value">{{ state.style.shadow }}</span>
            </div>
            <!-- 位置 -->
            <div class="style-row">
              <label class="style-label">{{ $t('common.subtitleEdit.position') }}</label>
              <div class="alignment-grid">
                <div
                  v-for="n in 9"
                  :key="n"
                  class="alignment-cell"
                  :class="{ active: state.style.alignment === (n <= 3 ? n + 6 : n <= 6 ? n : n - 6) }"
                  @click="state.style.alignment = (n <= 3 ? n + 6 : n <= 6 ? n : n - 6)"
                >
                  <div class="alignment-dot"></div>
                </div>
              </div>
            </div>
            <!-- 边距 -->
            <div class="style-row">
              <label class="style-label">{{ $t('common.subtitleEdit.marginV') }}</label>
              <t-slider v-model="state.style.marginV" :min="0" :max="200" style="width: 120px" />
              <span class="style-value">{{ state.style.marginV }}px</span>
            </div>
            <div class="style-row">
              <label class="style-label">{{ $t('common.subtitleEdit.marginL') }}</label>
              <t-slider v-model="state.style.marginL" :min="0" :max="500" style="width: 120px" />
              <span class="style-value">{{ state.style.marginL }}px</span>
            </div>
            <div class="style-row">
              <label class="style-label">{{ $t('common.subtitleEdit.marginR') }}</label>
              <t-slider v-model="state.style.marginR" :min="0" :max="500" style="width: 120px" />
              <span class="style-value">{{ state.style.marginR }}px</span>
            </div>
            <!-- 每行字数 -->
            <div class="style-row">
              <label class="style-label">{{ $t('common.subtitleEdit.maxCharsPerLine') }}</label>
              <t-slider v-model="state.style.maxCharsPerLine" :min="0" :max="50" style="width: 120px" />
              <span class="style-value">{{ state.style.maxCharsPerLine === 0 ? $t('common.subtitleEdit.auto') : state.style.maxCharsPerLine }}</span>
            </div>
            <!-- 编码器 -->
            <div class="style-row" v-if="state.encoders.length > 0">
              <label class="style-label">{{ $t('common.subtitleEdit.encoder') }}</label>
              <t-select v-model="state.selectedEncoder" size="small" style="width: 220px">
                <t-option v-for="e in state.encoders" :key="e.value" :value="e.value" :label="e.label" />
              </t-select>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载中 -->
    <div class="subtitle-loading" v-else>
      <t-loading size="large" />
    </div>

    <!-- 合成进度弹窗 -->
    <t-dialog
      v-model:visible="state.burnDialogVisible"
      :header="$t('common.subtitleEdit.composeVideo')"
      :footer="false"
      :close-on-overlay-click="false"
      :close-on-esc-keydown="false"
      width="400px"
    >
      <div class="burn-progress-box">
        <t-progress :percentage="state.burnProgress" :status="state.burnProgress >= 100 ? 'success' : 'active'" />
        <p class="burn-status-text">{{ state.burnProgress >= 100 ? $t('common.subtitleEdit.composeDone') : $t('common.subtitleEdit.composing', { percent: state.burnProgress }) }}</p>
        <t-button v-if="state.burnProgress >= 100" theme="primary" size="medium" @click="action.download" style="margin-top: 16px">{{ $t('common.subtitleEdit.downloadVideo') }}</t-button>
      </div>
    </t-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MessagePlugin } from 'tdesign-vue-next'
import { findVideo, getSubtitle, saveSubtitle, getSystemFonts, detectEncoders, burnVideoSubtitle, onBurnProgress, exportVideo, renderSubtitleFrame } from '@renderer/api/index.js'
import { Client } from '@renderer/client'
import { localUrl } from '@renderer/utils'
import { parseSrt, serializeSrt, defaultSubtitleStyle, srtToAss, alignmentToCssPosition, buildTextEffects, wrapText, formatSrtTime } from '@renderer/utils/srt-utils.js'

const route = useRoute()
const router = useRouter()
const videoRef = ref(null)
const videoBoxRef = ref(null)
const videoWrapperRef = ref(null)
const timelineRef = ref(null)

const state = reactive({
  loaded: false,
  saving: false,
  burning: false,
  burnDialogVisible: false,
  burnProgress: 0,
  videoId: null,
  videoName: '',
  videoUrl: '',
  segments: [],
  activeIndex: -1,
  videoWidth: 1920,
  videoHeight: 1080,
  scaleX: 1,
  scaleY: 1,
  videoDuration: 0,
  currentTime: 0,
  fonts: [],
  encoders: [],
  selectedEncoder: 'libx264',
  style: defaultSubtitleStyle(),
  currentText: '',
  composed: false,
  // ffmpeg 准确预览
  previewImageUrl: '',
  showAccuratePreview: false,
  // 播放控制
  isPlaying: false,
  isFullscreen: false,
  rendering: false,
  // 临时标记：点击字幕条后暂停不自动跳转
  skipAutoSeekOnPause: false
})

// 拖拽状态
const dragState = reactive({
  active: false,
  type: null, // 'move' | 'left' | 'right'
  index: -1,
  startX: 0,
  origStart: 0,
  origEnd: 0,
  timelineWidth: 0,
  moved: false
})

// 预设配色方案
const presetStyles = [
  { name: '经典白字', primaryColor: '#FFFFFF', outlineColor: '#000000', backColor: '#000000', outline: 2, shadow: 1 },
  { name: '醒目黄字', primaryColor: '#FFE800', outlineColor: '#000000', backColor: '#000000', outline: 2, shadow: 1 },
  { name: '活力橙字', primaryColor: '#FF6B00', outlineColor: '#000000', backColor: '#000000', outline: 2, shadow: 0 },
  { name: '科技蓝字', primaryColor: '#00CCFF', outlineColor: '#003366', backColor: '#001122', outline: 2, shadow: 1 },
  { name: '柔和白字', primaryColor: '#FFFFFF', outlineColor: '#444444', backColor: '#888888', outline: 1, shadow: 2 },
  { name: '粉色少女', primaryColor: '#FF69B4', outlineColor: '#FFFFFF', backColor: '#000000', outline: 2, shadow: 0 },
  { name: '暗金质感', primaryColor: '#FFD700', outlineColor: '#4A0000', backColor: '#2A0000', outline: 2, shadow: 1 },
  { name: '极简黑字', primaryColor: '#333333', outlineColor: '#FFFFFF', backColor: '#CCCCCC', outline: 1, shadow: 0 }
].map((p) => ({
  ...p,
  previewStyle: buildTextEffects(p, 0.5)
}))

let offBurnProgress = null
let resizeObserver = null

onMounted(async () => {
  const id = route.query.id
  if (!id) { MessagePlugin.error('缺少视频 ID'); return }
  state.videoId = Number(id)

  const [videoResult, fontsResult, encodersResult] = await Promise.allSettled([
    findVideo(state.videoId), getSystemFonts(), detectEncoders()
  ])

  if (videoResult.status !== 'fulfilled' || !videoResult.value) {
    MessagePlugin.error('视频不存在'); return
  }
  const video = videoResult.value
  state.videoName = video.name || '未命名'
  state.videoUrl = video.file_path ? localUrl.addFileProtocol(video.file_path) : ''

  if (video.subtitle_path) {
    try {
      const srtContent = await getSubtitle(state.videoId)
      if (srtContent) state.segments = parseSrt(srtContent)
    } catch (e) { console.error('加载字幕失败', e) }
  }

  if (fontsResult.status === 'fulfilled') state.fonts = fontsResult.value || []
  if (encodersResult.status === 'fulfilled') {
    state.encoders = encodersResult.value || []
    if (state.encoders.length > 0) state.selectedEncoder = state.encoders[0].value
  }

  state.loaded = true

  offBurnProgress = onBurnProgress((data) => {
    if (data.videoId === state.videoId) {
      state.burnProgress = data.percent
      if (data.percent >= 100) { state.burning = false; state.composed = true }
    }
  })

  await nextTick()
  if (videoBoxRef.value) {
    resizeObserver = new ResizeObserver(() => updateScale())
    resizeObserver.observe(videoBoxRef.value)
  }
})

onUnmounted(() => {
  if (offBurnProgress) offBurnProgress()
  if (resizeObserver) resizeObserver.disconnect()
  if (renderTimer) clearTimeout(renderTimer)
  document.removeEventListener('mousemove', onDocMouseMove)
  document.removeEventListener('mouseup', onDocMouseUp)
})

// ==================== ffmpeg 准确预览 ====================
let renderTimer = null
let renderToken = 0

const accurateRender = async (autoSeekToSubtitle = false, renderTime = 0) => {
  if (!state.videoId) return
  const currentToken = ++renderToken
  state.rendering = true
  try {
    const assContent = srtToAss(state.segments, state.style, state.videoWidth, state.videoHeight)
    if (autoSeekToSubtitle) {
      const hasSubAtCurrent = state.segments.some((s) => {
        return s.text && s.text.trim() &&
          renderTime >= srtTimeToSeconds(s.start) && renderTime <= srtTimeToSeconds(s.end)
      })
      if (!hasSubAtCurrent) {
        const firstTextSeg = state.segments.find((s) => s.text && s.text.trim())
        if (firstTextSeg) {
          renderTime = (srtTimeToSeconds(firstTextSeg.start) + srtTimeToSeconds(firstTextSeg.end)) / 2
          if (videoRef.value) {
            videoRef.value.currentTime = renderTime
          }
        }
      }
    }
    console.log('[subtitle preview] rendering at', renderTime, 's, autoSeek:', autoSeekToSubtitle)
    const imgPath = await renderSubtitleFrame(state.videoId, assContent, renderTime)
    if (currentToken !== renderToken) return
    state.previewImageUrl = localUrl.addFileProtocol(imgPath) + '?t=' + Date.now()
    state.showAccuratePreview = true
    console.log('[subtitle preview] done:', state.previewImageUrl)
  } catch (err) {
    console.error('渲染预览失败', err)
    if (currentToken === renderToken) {
      MessagePlugin.error('预览渲染失败: ' + (err.message || err))
    }
  } finally {
    if (currentToken === renderToken) {
      state.rendering = false
      state.skipAutoSeekOnPause = false
    }
  }
}

const scheduleAccurateRender = (autoSeekToSubtitle = false, targetTime = null) => {
  if (renderTimer) clearTimeout(renderTimer)
  const time = targetTime !== null ? targetTime : (videoRef.value ? videoRef.value.currentTime : 0)
  if (targetTime !== null) {
    accurateRender(autoSeekToSubtitle, time)
  } else {
    renderTimer = setTimeout(() => {
      accurateRender(autoSeekToSubtitle, videoRef.value ? videoRef.value.currentTime : 0)
    }, 300)
  }
}

// 监听样式变化 → 暂停视频并触发准确预览
watch(
  () => [
    state.style.fontName, state.style.fontSize, state.style.primaryColor,
    state.style.outlineColor, state.style.outline, state.style.backColor, state.style.shadow,
    state.style.bold, state.style.italic, state.style.alignment, state.style.marginL,
    state.style.marginR, state.style.marginV, state.style.maxCharsPerLine
  ],
  () => {
    console.log('[subtitle] style changed, scheduling render')
    // 样式变化时自动暂停视频，确保预览停留在当前帧
    if (videoRef.value && !videoRef.value.paused) {
      videoRef.value.pause()
    }
    scheduleAccurateRender(true)
  }
)
// 监听字幕文本变化 → 触发准确预览
watch(() => state.segments.map((s) => s.text).join(''), () => {
  if (videoRef.value && !videoRef.value.paused) {
    videoRef.value.pause()
  }
  scheduleAccurateRender(true)
})

const goBack = () => router.push('/home')

// ==================== 视频预览 ====================

const onLoadedMetadata = () => {
  if (videoRef.value) {
    state.videoWidth = videoRef.value.videoWidth || 1920
    state.videoHeight = videoRef.value.videoHeight || 1080
    state.videoDuration = videoRef.value.duration || 0
    updateScale()
    scheduleAccurateRender(true)
  }
}

const updateScale = () => {
  if (!videoRef.value || !videoBoxRef.value) return
  const box = videoBoxRef.value
  const boxW = box.clientWidth
  const boxH = box.clientHeight
  if (boxW <= 0 || boxH <= 0 || state.videoWidth <= 0) return
  // 按宽高比计算视频在容器内的最佳渲染尺寸（contain 模式）
  const videoRatio = state.videoWidth / state.videoHeight
  const boxRatio = boxW / boxH
  let renderW, renderH
  if (videoRatio > boxRatio) {
    renderW = boxW
    renderH = boxW / videoRatio
  } else {
    renderH = boxH
    renderW = boxH * videoRatio
  }
  // 精确设置 wrapper 尺寸 = video 渲染尺寸
  if (videoWrapperRef.value) {
    videoWrapperRef.value.style.width = renderW + 'px'
    videoWrapperRef.value.style.height = renderH + 'px'
  }
  state.scaleX = renderW / state.videoWidth
  state.scaleY = renderH / state.videoHeight
}

const onTimeUpdate = () => {
  if (!videoRef.value) return
  state.currentTime = videoRef.value.currentTime
  const t = state.currentTime
  const seg = state.segments.find((s) => t >= srtTimeToSeconds(s.start) && t <= srtTimeToSeconds(s.end))
  state.currentText = seg ? seg.text : ''
  if (seg) state.activeIndex = state.segments.indexOf(seg)
}

const onPlay = () => {
  state.isPlaying = true
  state.showAccuratePreview = false
}

const onPause = () => {
  state.isPlaying = false
  if (!state.skipAutoSeekOnPause) {
    scheduleAccurateRender(false)
  }
}

const onSeeked = () => {
  console.log('[subtitle] seeked event, scheduling render')
  if (!state.skipAutoSeekOnPause) {
    scheduleAccurateRender(false)
  }
}

const togglePlay = () => {
  if (!videoRef.value) return
  if (videoRef.value.paused) {
    videoRef.value.play()
  } else {
    videoRef.value.pause()
  }
}

const toggleFullscreen = () => {
  state.isFullscreen = !state.isFullscreen
  if (state.isFullscreen) {
    state.showAccuratePreview = false
    if (videoRef.value && !videoRef.value.paused) {
      videoRef.value.pause()
    }
    scheduleAccurateRender(true)
  }
  // 退出全屏后重新计算尺寸
  nextTick(() => updateScale())
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function srtTimeToSeconds(srtTime) {
  const m = String(srtTime).match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/)
  if (!m) return 0
  return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]) + parseInt(m[4]) / 1000
}

// 预览显示文本（根据当前样式预换行，确保和实际烧录一致）
const displayText = computed(() => {
  if (!state.currentText) return ''
  const maxLineWidth = state.videoWidth - state.style.marginL - state.style.marginR
  return wrapText(state.currentText, state.style.fontName, state.style.fontSize, maxLineWidth)
})

const overlayStyle = computed(() => ({
  width: state.videoWidth + 'px',
  height: state.videoHeight + 'px',
  transform: `scale(${state.scaleX}, ${state.scaleY})`,
  transformOrigin: 'top left',
  position: 'absolute',
  top: '0', left: '0',
  pointerEvents: 'none',
  overflow: 'hidden'
}))

const subtitleTextStyle = computed(() => {
  const s = state.style
  const pos = alignmentToCssPosition(s.alignment)
  const style = {
    fontFamily: `"${s.fontName}", sans-serif`,
    fontSize: s.fontSize + 'px',
    fontWeight: s.bold ? 'bold' : 'normal',
    fontStyle: s.italic ? 'italic' : 'normal',
    ...buildTextEffects(s),
    position: 'absolute',
    lineHeight: '1.4',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  }
  const maxW = state.videoWidth - s.marginL - s.marginR
  if (pos.side === 'left') { style.left = s.marginL + 'px'; style.textAlign = 'left'; style.maxWidth = maxW + 'px' }
  else if (pos.side === 'right') { style.right = s.marginR + 'px'; style.textAlign = 'right'; style.maxWidth = maxW + 'px' }
  else { style.left = s.marginL + 'px'; style.right = s.marginR + 'px'; style.textAlign = 'center' }
  if (pos.vert === 'top') style.top = s.marginV + 'px'
  else if (pos.vert === 'bottom') style.bottom = s.marginV + 'px'
  else { style.top = '50%'; style.transform = 'translateY(-50%)' }
  return style
})

// ==================== 时间轴 ====================

const playheadPos = computed(() => {
  if (!state.videoDuration) return 0
  return (state.currentTime / state.videoDuration) * 100
})

const ticks = computed(() => {
  if (!state.videoDuration) return []
  const d = state.videoDuration
  let interval
  if (d <= 10) interval = 1
  else if (d <= 30) interval = 2
  else if (d <= 60) interval = 5
  else if (d <= 300) interval = 10
  else interval = 30
  const result = []
  for (let t = 0; t <= d + 0.01; t += interval) {
    result.push({ time: t, pos: (t / d) * 100, label: formatTickLabel(t) })
  }
  return result
})

function formatTickLabel(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const clipStyle = (seg) => {
  if (!state.videoDuration) return { display: 'none' }
  const start = srtTimeToSeconds(seg.start)
  const end = srtTimeToSeconds(seg.end)
  const left = (start / state.videoDuration) * 100
  const width = Math.max(1, ((end - start) / state.videoDuration) * 100)
  return { left: left + '%', width: width + '%' }
}

// 点击/拖动标尺跳转
const onRulerMouseDown = (e) => {
  if (e.target.closest('.subtitle-clip')) return
  if (!videoRef.value || !timelineRef.value) return
  seekToMouseX(e.clientX)
  const onMove = (ev) => seekToMouseX(ev.clientX)
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

const seekToMouseX = (clientX) => {
  if (!timelineRef.value || !videoRef.value) return
  const rect = timelineRef.value.getBoundingClientRect()
  const x = clientX - rect.left
  const t = (x / rect.width) * state.videoDuration
  videoRef.value.currentTime = Math.max(0, Math.min(state.videoDuration, t))
}

// 字幕条拖拽
const onClipMouseDown = (e, index) => {
  e.preventDefault()
  const seg = state.segments[index]
  const rect = timelineRef.value.getBoundingClientRect()
  const clipEl = e.currentTarget
  const clipRect = clipEl.getBoundingClientRect()

  dragState.active = true
  dragState.index = index
  dragState.startX = e.clientX
  dragState.origStart = srtTimeToSeconds(seg.start)
  dragState.origEnd = srtTimeToSeconds(seg.end)
  dragState.timelineWidth = rect.width
  dragState.moved = false

  const offsetX = e.clientX - clipRect.left
  if (offsetX < 8) dragState.type = 'left'
  else if (offsetX > clipRect.width - 8) dragState.type = 'right'
  else dragState.type = 'move'

  document.addEventListener('mousemove', onDocMouseMove)
  document.addEventListener('mouseup', onDocMouseUp)
}

const onDocMouseMove = (e) => {
  if (!dragState.active) return
  const deltaX = e.clientX - dragState.startX
  if (Math.abs(deltaX) > 3) dragState.moved = true
  const deltaTime = (deltaX / dragState.timelineWidth) * state.videoDuration
  const seg = state.segments[dragState.index]
  if (!seg) return

  if (dragState.type === 'move') {
    let newStart = dragState.origStart + deltaTime
    let newEnd = dragState.origEnd + deltaTime
    const clipLen = dragState.origEnd - dragState.origStart
    if (newStart < 0) { newStart = 0; newEnd = clipLen }
    if (newEnd > state.videoDuration) { newEnd = state.videoDuration; newStart = newEnd - clipLen }
    seg.start = formatSrtTime(newStart)
    seg.end = formatSrtTime(newEnd)
  } else if (dragState.type === 'left') {
    let newStart = Math.max(0, Math.min(dragState.origEnd - 0.1, dragState.origStart + deltaTime))
    seg.start = formatSrtTime(newStart)
  } else if (dragState.type === 'right') {
    let newEnd = Math.min(state.videoDuration, Math.max(dragState.origStart + 0.1, dragState.origEnd + deltaTime))
    seg.end = formatSrtTime(newEnd)
  }

  // 拖拽手柄时同步播放头
  if (videoRef.value && dragState.type !== 'move') {
    const seekTime = dragState.type === 'left' ? srtTimeToSeconds(seg.start) : srtTimeToSeconds(seg.end)
    videoRef.value.currentTime = seekTime
  }
}

const onDocMouseUp = () => {
  if (!dragState.active) return
  // 没有移动 = 点击 → 跳转到该字幕
  if (!dragState.moved && state.segments[dragState.index]) {
    const seg = state.segments[dragState.index]
    state.activeIndex = dragState.index
    const targetTime = (srtTimeToSeconds(seg.start) + srtTimeToSeconds(seg.end)) / 2
    console.log('[subtitle] onDocMouseUp, clicked seg:', seg.index, 'text:', seg.text, 'targetTime:', targetTime)
    if (videoRef.value) {
      state.skipAutoSeekOnPause = true
      videoRef.value.currentTime = targetTime
      videoRef.value.pause()
    }
    scheduleAccurateRender(false, targetTime)
  }
  dragState.active = false
  dragState.type = null
  dragState.index = -1
  document.removeEventListener('mousemove', onDocMouseMove)
  document.removeEventListener('mouseup', onDocMouseUp)
}

// ==================== Actions ====================

const action = {
  async save() {
    if (!state.videoId) return
    state.saving = true
    try {
      await saveSubtitle(state.videoId, serializeSrt(state.segments))
      MessagePlugin.success('字幕保存成功')
    } catch (err) {
      MessagePlugin.error('保存失败：' + (err.message || err))
    } finally {
      state.saving = false
    }
  },
  async compose() {
    if (!state.videoId) return
    if (state.segments.length === 0) { MessagePlugin.warning('请先添加字幕'); return }
    try {
      await saveSubtitle(state.videoId, serializeSrt(state.segments))
    } catch (err) {
      MessagePlugin.error('保存字幕失败：' + (err.message || err)); return
    }
    const assContent = srtToAss(state.segments, state.style, state.videoWidth, state.videoHeight)
    state.burning = true
    state.burnProgress = 0
    state.burnDialogVisible = true
    try {
      const result = await burnVideoSubtitle(state.videoId, assContent, state.selectedEncoder)
      MessagePlugin.success('字幕合成成功')
      if (result && result.file_path) {
        const video = await findVideo(state.videoId)
        if (video && video.file_path) state.videoUrl = localUrl.addFileProtocol(video.file_path)
      }
    } catch (err) {
      MessagePlugin.error('合成失败：' + (err.message || err))
      state.burnDialogVisible = false
    } finally {
      state.burning = false
    }
  },
  async download() {
    if (!state.videoId) return
    try {
      const video = await findVideo(state.videoId)
      if (!video || !video.file_path) { MessagePlugin.warning('视频文件不存在'); return }
      const ext = video.file_path?.split('.')?.pop() || 'mp4'
      const saveName = `${video.name || 'video'}.${ext}`
      const savePath = await Client.file.saveFile(saveName)
      if (!savePath) return
      await exportVideo(state.videoId, savePath)
      MessagePlugin.success('下载成功')
    } catch (err) {
      MessagePlugin.error('下载失败：' + (err.message || err))
    }
  },
  applyPreset(preset) {
    console.log('[subtitle] applyPreset:', preset.name)
    state.style.primaryColor = preset.primaryColor
    state.style.outlineColor = preset.outlineColor
    state.style.backColor = preset.backColor
    state.style.outline = preset.outline
    state.style.shadow = preset.shadow
  },
  addSegment() {
    const lastSeg = state.segments[state.segments.length - 1]
    const startSec = lastSeg ? srtTimeToSeconds(lastSeg.end) : 0
    const endSec = Math.min(state.videoDuration || (startSec + 3), startSec + 3)
    state.segments.push({ start: formatSrtTime(startSec), end: formatSrtTime(endSec), text: '' })
    state.activeIndex = state.segments.length - 1
  },
  deleteSegment(index) {
    state.segments.splice(index, 1)
    if (state.activeIndex >= state.segments.length) state.activeIndex = state.segments.length - 1
  },
  seekTo(seg) {
    if (!videoRef.value) return
    videoRef.value.currentTime = srtTimeToSeconds(seg.start)
    videoRef.value.play()
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
      display: flex; align-items: center; gap: 8px; cursor: pointer; -webkit-app-region: no-drag;
      .back-text { font-size: 14px; color: var(--app-text-1); }
      &:hover .back-text { color: #434af9; }
    }
    .header-title { font-weight: 500; font-size: 16px; color: var(--app-text-1); }
    .header-right { display: flex; gap: 8px; -webkit-app-region: no-drag; }
  }

  .subtitle-body {
    flex: 1;
    display: flex;
    overflow: hidden;

    .preview-pane {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 16px 24px;
      overflow: hidden;
      min-width: 0;

      &.fullscreen-mode {
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: #000;
        padding: 40px;
      }
      min-width: 0;

      .preview-title { font-weight: 500; font-size: 14px; color: var(--app-text-1); margin-bottom: 12px; flex: none; }

      .preview-video-box {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #000;
        border-radius: 8px;
        overflow: hidden;
        min-height: 0;

        .video-wrapper {
          position: relative;
          display: inline-block;
          line-height: 0;
          overflow: hidden;

          .preview-video { width: 100%; height: 100%; display: block; }
          .accurate-preview-img {
            position: absolute; top: 0; left: 0;
            width: 100%; height: 100%;
            z-index: 20; object-fit: fill;
            pointer-events: none;
          }
        }
      }

      .video-controls {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 12px;
        margin-top: 8px;
        background: var(--app-bg-surface);
        border: 1px solid var(--app-border);
        border-radius: 6px;

        .ctrl-btn {
          flex: none;
          width: 32px; height: 32px;
          border: none; border-radius: 4px;
          background: transparent; color: var(--app-text-1);
          cursor: pointer; display: flex;
          align-items: center; justify-content: center;
          &:hover { background: var(--app-bg-input); }
        }
        .ctrl-time {
          font-size: 12px; color: var(--app-text-2);
          font-family: monospace; white-space: nowrap;
        }
        .ctrl-spacer { flex: 1; }
      }

      .rendering-badge {
        position: absolute; top: 8px; right: 8px;
        background: rgba(0,0,0,0.6); border-radius: 4px;
        padding: 4px 8px; z-index: 30;
        pointer-events: none;
      }

      .preview-empty {
        flex: 1; display: flex; align-items: center; justify-content: center;
        background: var(--app-bg-input); border-radius: 8px; color: var(--app-text-3); font-size: 14px;
      }

      // ===== 时间轴 =====
      .timeline-container {
        flex: none;
        margin-top: 12px;
        background: var(--app-bg-surface);
        border: 1px solid var(--app-border);
        border-radius: 6px;
        user-select: none;

        .timeline-ruler {
          position: relative;
          height: 24px;
          border-bottom: 1px solid var(--app-border);
          cursor: pointer;

          .tick {
            position: absolute; top: 0;
            .tick-mark { width: 1px; height: 6px; background: var(--app-text-3); margin-left: -0.5px; }
            .tick-label {
              position: absolute; top: 8px; left: 0; transform: translateX(-50%);
              font-size: 10px; color: var(--app-text-3); font-family: monospace; white-space: nowrap;
            }
          }

          .playhead {
            position: absolute; top: 0; bottom: -40px; width: 2px;
            background: #f54545; z-index: 20; pointer-events: none; margin-left: -1px;
            .playhead-head {
              position: absolute; top: -2px; left: 50%; transform: translateX(-50%);
              width: 10px; height: 10px; background: #f54545; border-radius: 50%;
            }
          }
        }

        .timeline-tracks {
          position: relative; height: 40px; overflow: hidden;

          .subtitle-clip {
            position: absolute; top: 4px; height: 32px; min-width: 20px;
            background: rgba(67, 74, 249, 0.85);
            border: 1px solid #434af9; border-radius: 3px;
            display: flex; align-items: center; cursor: grab; overflow: hidden;
            transition: background 0.15s;

            &:hover { background: rgba(67, 74, 249, 1); }
            &.active { border-color: #fff; box-shadow: 0 0 0 1px #fff, 0 0 6px rgba(67, 74, 249, 0.6); z-index: 5; }
            &.dragging { cursor: grabbing; opacity: 0.9; z-index: 10; }

            .clip-handle {
              flex: none; width: 6px; height: 100%; cursor: ew-resize;
              background: rgba(255, 255, 255, 0.15);
              &:hover { background: rgba(255, 255, 255, 0.4); }
            }
            .clip-handle-left { border-right: 1px solid rgba(255,255,255,0.2); }
            .clip-handle-right { border-left: 1px solid rgba(255,255,255,0.2); }

            .clip-body {
              flex: 1; overflow: hidden; padding: 0 4px;
              .clip-text {
                font-size: 11px; color: #fff; white-space: nowrap;
                overflow: hidden; text-overflow: ellipsis; display: block; line-height: 30px;
              }
            }
          }
        }
      }
    }

    .subtitle-pane {
      width: 460px; flex: none; display: flex; flex-direction: column;
      border-left: 1px solid var(--app-border); background: var(--app-bg-surface);

      .pane-section {
        display: flex; flex-direction: column; overflow: hidden;
        &.list-section { flex: 1; min-height: 0; }
        &.style-section { flex: none; max-height: 48%; border-top: 1px solid var(--app-border); }
      }

      .section-header {
        display: flex; align-items: center; gap: 12px; padding: 12px 20px;
        border-bottom: 1px solid var(--app-border); flex: none;
        .pane-title { font-weight: 500; font-size: 14px; color: var(--app-text-1); }
        .pane-count { font-size: 12px; color: var(--app-text-3); flex: 1; }
      }

      .subtitle-list {
        flex: 1; overflow-y: auto; padding: 12px 16px;

        .subtitle-item {
          padding: 10px 12px; margin-bottom: 8px;
          background: var(--app-bg-input); border: 1px solid var(--app-border); border-radius: 6px;
          cursor: pointer; transition: border-color 0.2s;
          &:hover { border-color: #434af9; }
          &.active { border-color: #434af9; box-shadow: 0 0 0 1px #434af9; }

          .subtitle-item-header {
            display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
            .seg-index {
              flex: none; width: 20px; height: 20px; border-radius: 4px;
              background: #434af9; color: #fff; font-size: 11px;
              display: flex; align-items: center; justify-content: center;
            }
            .seg-time { flex: 1; font-size: 11px; color: var(--app-text-2); font-family: monospace; }
            .seg-jump, .seg-delete { font-size: 11px; color: var(--app-text-3); cursor: pointer; &:hover { color: #434af9; } }
            .seg-delete:hover { color: #f54545; }
          }
          :deep(.seg-text) {
            .t-textarea__inner {
              background: transparent; color: var(--app-text-1);
              border-color: var(--app-border); font-size: 13px; line-height: 20px;
            }
          }
        }
      }

      .subtitle-empty {
        flex: 1; display: flex; align-items: center; justify-content: center;
        color: var(--app-text-3); font-size: 13px; padding: 20px;
      }

      .style-body {
        overflow-y: auto; padding: 12px 20px;

        .style-row {
          display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;
          .style-label { font-size: 12px; color: var(--app-text-2); width: 64px; flex: none; text-align: right; }
          .style-value { font-size: 11px; color: var(--app-text-3); min-width: 30px; }
        }

        .preset-list {
          display: flex; flex-wrap: wrap; gap: 6px;
          .preset-item {
            width: 36px; height: 28px; border-radius: 4px; border: 1px solid var(--app-border);
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; font-size: 12px; font-weight: bold; background: #333;
            transition: all 0.15s;
            &:hover { border-color: #434af9; transform: scale(1.08); }
          }
        }

        .alignment-grid {
          display: grid; grid-template-columns: repeat(3, 24px); grid-template-rows: repeat(3, 24px); gap: 2px;
          .alignment-cell {
            border: 1px solid var(--app-border); border-radius: 3px;
            display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s;
            .alignment-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--app-text-3); }
            &.active { border-color: #434af9; background: rgba(67, 74, 249, 0.1); .alignment-dot { background: #434af9; } }
            &:hover { border-color: #434af9; }
          }
        }
      }
    }
  }

  .subtitle-loading { flex: 1; display: flex; align-items: center; justify-content: center; }
}

.burn-progress-box {
  padding: 20px 0; text-align: center;
  .burn-status-text { margin-top: 16px; font-size: 14px; color: var(--app-text-2); }
}
</style>
