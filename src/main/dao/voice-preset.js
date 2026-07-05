import { connect } from '../db/index.js'

export function insert(preset) {
  const db = connect()
  const stmt = db.prepare(
    `INSERT INTO voice_preset
      (name, prompt_audio_path, emo_audio_path, cover_image_path, emo_control_method, emo_weight,
       emo_vector, emo_text, emo_random, advanced_params, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  const info = stmt.run(
    preset.name,
    preset.prompt_audio_path,
    preset.emo_audio_path || null,
    preset.cover_image_path || null,
    preset.emo_control_method ?? 0,
    preset.emo_weight ?? 0.65,
    preset.emo_vector || '[0,0,0,0,0,0,0,0]',
    preset.emo_text || '',
    preset.emo_random ? 1 : 0,
    preset.advanced_params || '{}',
    Date.now()
  )
  return info.lastInsertRowid
}

export function update(preset) {
  const db = connect()
  const stmt = db.prepare(
    `UPDATE voice_preset SET
      name = ?, prompt_audio_path = ?, emo_audio_path = ?, cover_image_path = ?,
      emo_control_method = ?, emo_weight = ?, emo_vector = ?,
      emo_text = ?, emo_random = ?, advanced_params = ?
     WHERE id = ?`
  )
  const info = stmt.run(
    preset.name,
    preset.prompt_audio_path,
    preset.emo_audio_path || null,
    preset.cover_image_path || null,
    preset.emo_control_method ?? 0,
    preset.emo_weight ?? 0.65,
    preset.emo_vector || '[0,0,0,0,0,0,0,0]',
    preset.emo_text || '',
    preset.emo_random ? 1 : 0,
    preset.advanced_params || '{}',
    preset.id
  )
  return info
}

export function selectPage({ page, pageSize, name = '' }) {
  const db = connect()
  const offset = (page - 1) * pageSize
  const rows = db
    .prepare(
      `SELECT * FROM voice_preset WHERE name LIKE '%${name}%'
       ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`
    )
    .all()
  return rows
}

export function count(name = '') {
  const db = connect()
  const row = db
    .prepare(`SELECT COUNT(*) as total FROM voice_preset WHERE name LIKE '%${name}%'`)
    .get()
  return row.total
}

export function selectByID(id) {
  const db = connect()
  const row = db.prepare('SELECT * FROM voice_preset WHERE id = ?').get(id)
  return row
}

export function remove(id) {
  const db = connect()
  db.prepare('DELETE FROM voice_preset WHERE id = ?').run(id)
}
