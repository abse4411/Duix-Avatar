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
