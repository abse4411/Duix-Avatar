<template>
  <div class="modal">
    <t-dialog
      v-model:visible="state.show"
      @close="action.close(false)"
      @closed="onClosed"
      :header="state.presetId ? '编辑音色预设' : '新建音色预设'"
      :closeOnEscKeydown="false"
      :closeOnOverlayClick="false"
    >
      <VoicePresetForm ref="formRef" :presetData="state.presetData" class="modal-box" />
      <template #footer>
        <t-button @click="action.close(false)">取消</t-button>
        <t-button theme="primary" @click="action.submit" :loading="state.loading.submit">保存</t-button>
      </template>
    </t-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, watchEffect } from 'vue'
import { isBoolean, isObject } from 'lodash-es'
import { MessagePlugin } from 'tdesign-vue-next'
import VoicePresetForm from './VoicePresetForm.vue'
import { addVoicePreset, updateVoicePreset, findVoicePreset } from '@renderer/api'

const props = defineProps({
  visible: { type: Boolean, default: false },
  presetId: { type: [Number, String], default: null },
  onClose: { type: Function, default: () => {} },
  onClosed: { type: Function, default: () => {} }
})

const formRef = ref(null)

const state = reactive({
  show: false,
  presetId: null,
  presetData: null,
  loading: { submit: false }
})

watchEffect(async () => {
  state.show = props.visible
  if (props.visible && props.presetId) {
    state.presetId = props.presetId
    try {
      state.presetData = await findVoicePreset(props.presetId)
    } catch (err) {
      console.error('加载预设失败', err)
    }
  } else if (props.visible) {
    state.presetId = null
    state.presetData = null
  }
})

const action = {
  async submit() {
    if (!formRef.value || !formRef.value.validate()) return
    state.loading.submit = true
    const form = formRef.value.form
    try {
      const payload = JSON.parse(JSON.stringify({
        name: form.name,
        coverImagePath: form.coverImagePath || null,
        promptAudioPath: form.promptAudioPath,
        emoAudioPath: form.emoAudioPath || null,
        emo_control_method: form.emo_control_method,
        emo_weight: form.emo_weight,
        emo_vector: form.emo_vector,
        emo_text: form.emo_text,
        emo_random: form.emo_random,
        advanced_params: form.advanced
      }))

      let result
      if (state.presetId) {
        payload.id = state.presetId
        result = await updateVoicePreset(payload)
      } else {
        result = await addVoicePreset(payload)
      }

      if (result) {
        MessagePlugin.success(state.presetId ? '预设已更新' : '预设已创建')
        action.close({ isSubmitOK: true })
      } else {
        throw new Error('保存失败')
      }
    } catch (err) {
      MessagePlugin.error(err.toString() || '保存失败')
    } finally {
      state.loading.submit = false
    }
  },
  close(params = false) {
    const result = { isSubmitOK: false }
    if (isBoolean(params)) {
      result.isSubmitOK = params
    } else if (isObject(params)) {
      Object.assign(result, params)
    }
    state.show = false
    props.onClose(result)
  }
}
</script>

<style lang="less" scoped>
.modal {
  --td-text-color-primary: var(--app-text-1);
  --td-bg-color-specialcomponent: var(--app-bg-surface);
  --td-bg-color-secondarycontainer: var(--app-bg-input);

  :deep(.t-dialog__position) {
    align-items: center;
    padding: 0;
  }

  :deep(.t-dialog) {
    padding: 0;
    width: 720px;
    max-width: 90vw;
    overflow: hidden;
    max-height: 86vh;
    background: var(--app-bg-surface);
    box-shadow: 0px 4px 16px 0px rgba(0, 0, 0, 0.25);
    border-radius: 4px;
    border: 1px solid var(--app-border);
    color: var(--app-text-1);
    display: flex;
    flex-direction: column;
  }

  :deep(.t-dialog__header) {
    padding: 16px;
    font-weight: 500;
    font-size: 14px;
    color: var(--app-text-1);
  }

  :deep(.t-dialog__close) {
    color: var(--app-text-1);
    &:hover { background-color: var(--app-bg-surface-hover); }
  }

  :deep(.t-dialog__body) {
    padding: 20px 32px;
    color: var(--app-text-1);
    overflow-y: auto;
    max-height: calc(86vh - 120px);
  }

  :deep(.t-dialog__footer) {
    padding: 16px 32px;
    border-top: 1px solid var(--app-border);
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
}
</style>
