<template>
  <div class="form">
    <!-- 创建方式 -->
    <div class="form-item --mode">
      <span class="label">创建方式</span>
      <t-radio-group class="value" v-model="form.mode" variant="default-filled" size="small">
        <t-radio-button value="audio">含音频(克隆声音)</t-radio-button>
        <t-radio-button value="noaudio">无音频(仅形象)</t-radio-button>
      </t-radio-group>
      <span class="mode-tip" v-if="form.mode === 'noaudio'">该模式不调用语音克隆服务，合成视频时需自行上传音频</span>
    </div>

    <!-- 模特名称 -->
    <div class="form-item --name">
      <span class="label required">{{ $t('common.modelCreateView.avatarNameText') }}</span>
      <t-input
        class="value"
        v-model="form.name"
        :placeholder="$t('common.input.avatarNamePlaceholder')"
      />
    </div>

    <!-- 上传文件 -->
    <div class="form-item --upload">
      <ModalBoxUpload class="invoke" v-model="form.uploadInfo" />
      <ModalBoxGuide class="guide" />
    </div>
  </div>
</template>
<script setup>
import ModalBoxUpload from './ModalBoxUpload.vue'
import ModalBoxGuide from './ModalBoxGuide.vue'

const form = defineModel({ uploadInfo: {}, name: '', mode: 'noaudio' })
</script>
<style lang="less" scoped>
.form {
  &-item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;

    &:not(:last-child) {
      margin-bottom: 26px;
    }

    .label,
    .value {
      white-space: nowrap;
    }

    .label.required::before {
      content: '*';
      color: #eb5757;
      font-size: 12px;
      display: inline-block;
      margin-right: 2px;
    }

    :deep(.t-input) {
      border: 1px solid var(--app-border);
      box-shadow: none;
      font-size: 12px;
      color: var(--app-text-1);
    }

    &.--mode {
      align-items: center;
      gap: 12px;

      .label {
        color: var(--app-text-1);
        font-size: 12px;
      }

      .value {
        flex: none;
        padding: 4px;
        background: var(--app-bg-input);
        border-radius: 6px;
        --td-brand-color: #434af9;
        --td-bg-color-container-select: #434af9;

        :deep(.t-radio-button) {
          border-radius: 4px;
          background: transparent;
          color: var(--app-text-2);
          font-size: 12px;
          line-height: 22px;
          border: none;
          box-shadow: none;
        }

        :deep(.t-radio-button:hover) {
          color: var(--app-text-1);
        }

        :deep(.t-radio-button.t-is-checked) {
          background: #434af9;
          color: #ffffff;
        }

        :deep(.t-radio-button.t-is-checked .t-radio-button__label) {
          color: #ffffff;
        }
      }

      .mode-tip {
        font-size: 12px;
        color: #ff932f;
        line-height: 18px;
      }
    }

    &.--name {
      width: 37%;
      --td-text-color-placeholder: var(--app-text-2);
    }

    &.--upload {
      align-items: stretch;
      height: 436px;
      gap: 40px;

      .invoke {
        flex: 5.6;
        overflow: hidden;
      }

      .guide {
        flex: 4.4;
      }
    }
  }
}
</style>
