/**
 * 解析 SRT 字幕文本为结构化数组
 * @param {string} srtText SRT 格式文本
 * @returns {Array<{index:number, start:string, end:string, text:string}>}
 */
export function parseSrt(srtText) {
  if (!srtText || typeof srtText !== 'string') return []
  const normalized = srtText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  const blocks = normalized.split(/\n\s*\n/)
  const segments = []
  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim() !== '')
    if (lines.length < 2) continue
    let idxLine = lines[0].trim()
    let timeLine = lines[1].trim()
    // 容错：第一行不是数字时，尝试从第二行找时间
    if (!/^\d+$/.test(idxLine)) {
      const timeMatch = lines.find((l) => l.includes('-->'))
      if (!timeMatch) continue
      timeLine = timeMatch.trim()
      idxLine = String(segments.length + 1)
    }
    const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/)
    if (!timeMatch) continue
    const textLines = lines.slice(2)
    segments.push({
      index: parseInt(idxLine, 10) || segments.length + 1,
      start: timeMatch[1].replace(',', ','),
      end: timeMatch[2].replace(',', ','),
      text: textLines.join('\n').trim()
    })
  }
  return segments
}

/**
 * 将结构化字幕数组序列化为 SRT 文本
 * @param {Array<{start:string, end:string, text:string}>} segments
 * @returns {string}
 */
export function serializeSrt(segments) {
  if (!Array.isArray(segments) || segments.length === 0) return ''
  return segments
    .map((seg, i) => {
      const idx = i + 1
      const start = seg.start || '00:00:00,000'
      const end = seg.end || '00:00:00,000'
      const text = (seg.text || '').trim()
      return `${idx}\n${start} --> ${end}\n${text}`
    })
    .join('\n\n') + '\n'
}

/**
 * 将秒数格式化为 SRT 时间戳 HH:MM:SS,mmm
 * @param {number} seconds
 * @returns {string}
 */
export function formatSrtTime(seconds) {
  const ms = Math.round(seconds * 1000)
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const milli = ms % 1000
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(milli).padStart(3, '0')}`
}

// ==================== ASS 字幕工具 ====================

/**
 * 将 SRT 时间戳 (HH:MM:SS,mmm) 转为 ASS 时间戳 (H:MM:SS.cc)
 */
export function srtTimeToAssTime(srtTime) {
  const match = String(srtTime).match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/)
  if (!match) return '0:00:00.00'
  const h = parseInt(match[1])
  const m = match[2]
  const s = match[3]
  const cs = String(Math.floor(parseInt(match[4]) / 10)).padStart(2, '0')
  return `${h}:${m}:${s}.${cs}`
}

/**
 * CSS 颜色 (#RRGGBB) 转 ASS 颜色 (&H00BBGGRR，alpha=00 不透明)
 */
export function cssToAssColor(cssHex) {
  if (!cssHex || typeof cssHex !== 'string') return '&H00FFFFFF'
  let hex = cssHex.replace('#', '')
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('')
  if (hex.length !== 6) return '&H00FFFFFF'
  const r = hex.slice(0, 2)
  const g = hex.slice(2, 4)
  const b = hex.slice(4, 6)
  return `&H00${b}${g}${r}`.toUpperCase()
}

/**
 * ASS 颜色 (&H00BBGGRR) 转 CSS 颜色 (#RRGGBB)
 */
export function assToCss(assColor) {
  if (!assColor) return '#FFFFFF'
  const hex = assColor.replace('&H', '').replace('&', '')
  const bgr = hex.length === 8 ? hex.slice(2) : hex
  if (bgr.length !== 6) return '#FFFFFF'
  const b = bgr.slice(0, 2)
  const g = bgr.slice(2, 4)
  const r = bgr.slice(4, 6)
  return `#${r}${g}${b}`.toLowerCase()
}

/**
 * 默认字幕样式
 */
export function defaultSubtitleStyle() {
  return {
    fontName: 'Microsoft YaHei',
    fontSize: 24,
    primaryColor: '#FFFFFF',
    outlineColor: '#000000',
    backColor: '#000000',
    bold: false,
    italic: false,
    outline: 2,
    shadow: 1,
    alignment: 2, // 2=底部居中
    marginL: 30,
    marginR: 30,
    marginV: 40,
    maxCharsPerLine: 0 // 0=按宽度自动换行，>0=按字数换行
  }
}

/**
 * 根据 style 对象生成 ASS Style 行
 * @param {object} style 样式对象
 * @returns {string} ASS Style 行文本
 */
export function buildAssStyle(style) {
  const s = { ...defaultSubtitleStyle(), ...style }
  const primary = cssToAssColor(s.primaryColor)
  const secondary = cssToAssColor(s.primaryColor)
  const outline = cssToAssColor(s.outlineColor)
  const back = cssToAssColor(s.backColor)
  const bold = s.bold ? -1 : 0
  const italic = s.italic ? -1 : 0
  // Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour,
  //         Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle,
  //         BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
  return `Style: Default,${s.fontName},${s.fontSize},${primary},${secondary},${outline},${back},${bold},${italic},0,0,100,100,0,0,1,${s.outline},${s.shadow},${s.alignment},${s.marginL},${s.marginR},${s.marginV},1`
}

/**
 * 使用 Canvas measureText 精确测量文本宽度并换行
 * 确保预览和实际烧录的换行完全一致
 * @param {string} text 原始文本
 * @param {string} fontName 字体名
 * @param {number} fontSize 字号
 * @param {number} maxWidth 最大行宽（像素）
 * @param {number} maxChars 每行最大字符数（0=不限制，按宽度换行）
 * @returns {string} 换行后的文本（\n 分隔）
 */
let _measureCanvas = null
export function wrapText(text, fontName, fontSize, maxWidth, maxChars = 0) {
  if (!text) return ''
  if (typeof document === 'undefined') return text
  if (!_measureCanvas) _measureCanvas = document.createElement('canvas')
  const ctx = _measureCanvas.getContext('2d')
  ctx.font = `${fontSize}px "${fontName}", sans-serif`

  const inputLines = String(text).split('\n')
  const outputLines = []
  for (const line of inputLines) {
    if (!line) { outputLines.push(''); continue }
    // 如果设置了 maxChars，只按字数换行（用户显式控制，不受 margin/宽度限制）
    if (maxChars > 0) {
      for (let i = 0; i < line.length; i += maxChars) {
        outputLines.push(line.slice(i, i + maxChars))
      }
      continue
    }
    // 否则按像素宽度换行
    if (ctx.measureText(line).width <= maxWidth) { outputLines.push(line); continue }
    // 逐字符测量换行（适用于中英文混合）
    let current = ''
    for (const char of line) {
      const test = current + char
      if (ctx.measureText(test).width > maxWidth && current) {
        outputLines.push(current)
        current = char
        } else {
          current = test
        }
      }
      if (current) outputLines.push(current)
    }
  return outputLines.join('\n')
}

/**
 * 将 SRT segments + 样式转为完整 ASS 字幕文本
 * @param {Array} segments SRT segments 数组
 * @param {object} style 样式对象
 * @param {number} playResX 渲染分辨率宽（默认1920）
 * @param {number} playResY 渲染分辨率高（默认1080）
 * @returns {string} ASS 格式文本
 */
export function srtToAss(segments, style, playResX = 1920, playResY = 1080) {
  const s = { ...defaultSubtitleStyle(), ...style }
  const styleLine = buildAssStyle(s)
  const maxLineWidth = playResX - s.marginL - s.marginR
  const dialogues = (segments || [])
    .filter((seg) => seg && seg.text && seg.text.trim())
    .map((seg) => {
      const start = srtTimeToAssTime(seg.start)
      const end = srtTimeToAssTime(seg.end)
      // 预换行：用 Canvas measureText 精确计算，确保和预览一致
      const wrapped = wrapText(seg.text, s.fontName, s.fontSize, maxLineWidth, s.maxCharsPerLine || 0)
      // ASS 中换行用 \N
      const text = wrapped.replace(/\n/g, '\\N')
      return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`
    })
    .join('\n')

  return `[Script Info]
Title: Duix Avatar Subtitle
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
PlayResX: ${playResX}
PlayResY: ${playResY}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
${styleLine}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${dialogues}
`
}

/**
 * ASS alignment (1-9 numpad) 转 CSS 定位样式
 * 1=左下 2=中下 3=右下 4=左中 5=中中 6=右中 7=左上 8=中上 9=右上
 * @returns {object} { position, textAlign, transform }
 */
export function alignmentToCssPosition(alignment) {
  const map = {
    1: { side: 'left', vert: 'bottom' },
    2: { side: 'center', vert: 'bottom' },
    3: { side: 'right', vert: 'bottom' },
    4: { side: 'left', vert: 'middle' },
    5: { side: 'center', vert: 'middle' },
    6: { side: 'right', vert: 'middle' },
    7: { side: 'left', vert: 'top' },
    8: { side: 'center', vert: 'top' },
    9: { side: 'right', vert: 'top' }
  }
  return map[alignment] || map[2]
}

/**
 * 根据样式生成 CSS 描边+阴影效果（使用 -webkit-text-stroke，接近 libass 渲染）
 * -webkit-text-stroke 描边宽度 = outline * 2（内外各一半），配合 paint-order: stroke fill
 * 填充覆盖内侧描边，视觉上只显示外侧 outline px，与 libass BorderStyle=1 一致
 * @param {object} style
 * @param {number} scale 缩放比例（预览缩放）
 * @returns {object} CSS 属性对象
 */
export function buildTextEffects(style, scale = 1) {
  const s = { ...defaultSubtitleStyle(), ...style }
  const outline = s.outline * scale
  const shadow = s.shadow * scale
  const effects = { color: s.primaryColor }

  if (outline > 0) {
    effects.paintOrder = 'stroke fill'
    effects.webkitTextStroke = `${outline * 2}px ${s.outlineColor}`
    effects.webkitTextFillColor = s.primaryColor
  }

  if (shadow > 0) {
    effects.textShadow = `${shadow}px ${shadow}px ${shadow * 0.5}px ${s.backColor}`
  }

  return effects
}
