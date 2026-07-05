<template>
  <div class="finished">
    <t-dialog
      v-model:visible="state.visible"
      @close="action.close(false)"
      :closeOnEscKeydown="false"
      :closeOnOverlayClick="false"
    >
      <div class="finished-body">
        <div class="title">{{ $t('common.selectView.modalFinishedObj.prompt') }}</div>
        <t-image class="image" :src="ImageSuccessSolid" />
        <div class="tips-line1">{{ $t('common.selectView.modalFinishedObj.videoOKText') }}</div>
        <div class="tips-line2">
          <slot>
            {{ $t('common.selectView.modalFinishedObj.text1')
            }}<span>{{ $t('common.selectView.modalFinishedObj.text2') }}</span
            >{{ $t('common.selectView.modalFinishedObj.text3') }}
          </slot>
        </div>
        <div class="btns">
          <t-button
            class="btn tosee"
            theme="default"
            variant="outline"
            @click="action.close(true)"
            >{{
              leftBtnText === ''
                ? $t('common.selectView.modalFinishedObj.progressBtnText')
                : leftBtnText
            }}</t-button
          >
          <t-button class="btn iknow" @click="action.close(false)">{{
            rightBtnText === '' ? $t('common.selectView.modalFinishedObj.okBtnText') : rightBtnText
          }}</t-button>
        </div>
      </div>
    </t-dialog>
  </div>
</template>
<script setup>
import { reactive } from 'vue'
import ImageSuccessSolid from '@renderer/assets/images/icons/icon-success-solid.png'

defineProps({
  leftBtnText: {
    type: String,
    default: ''
  },
  rightBtnText: {
    type: String,
    default: ''
  }
})

const state = reactive({
  visible: false
})

let resolver = () => {}

const action = {
  show() {
    state.visible = true
    return new Promise((resolve) => {
      resolver = resolve
    })
  },
  close(isToSee = false) {
    state.visible = false
    resolver(isToSee)
  }
}
defineExpose({
  show: action.show
})
</script>
<style lang="less" scoped>
.finished {
  --td-text-color-primary: var(--app-text-1);
  --td-bg-color-specialcomponent: var(--app-bg-surface);
  --td-bg-color-secondarycontainer: var(--app-bg-input);

  :deep(.t-dialog__position) {
    align-items: center;
    padding: 0;
  }

  :deep(.t-dialog) {
    padding: 0;
    width: 560px;
    overflow: hidden;
    height: 380px;
    background: var(--app-bg-surface);
    box-shadow: 0px 4px 16px 0px rgba(0, 0, 0, 0.25);
    border-radius: 4px 4px 4px 4px;
    border: 1px solid var(--app-border);
    color: var(--app-text-1);
    display: flex;
    flex-direction: column;
  }

  :deep(.t-dialog__header),
  :deep(.t-dialog__footer) {
    display: none;
  }

  :deep(.t-dialog__close) {
    color: var(--app-text-1);

    &:hover {
      background-color: var(--app-bg-surface-hover);
    }
  }

  :deep(.t-dialog__body) {
    padding: 30px;
  }

  &-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    .title {
      font-weight: 500;
      font-size: 24px;
      color: var(--app-text-1);
      line-height: 28px;
    }

    .image {
      margin-top: 48px;
      width: 64px;
      height: 64px;
    }

    .tips-line1 {
      margin-top: 20px;
      font-weight: 500;
      font-size: 16px;
      color: var(--app-text-1);
      line-height: 19px;
    }

    .tips-line2 {
      margin-top: 8px;
      font-weight: 400;
      font-size: 12px;
      color: var(--app-text-2);
      line-height: 14px;

      span {
        color: #434af9;
      }
    }

    .btns {
      margin-top: 65px;
      display: flex;
      align-items: center;
      gap: 32px;

      .btn.tosee {
        color: var(--app-text-1);
        border: 1px solid var(--app-border);

        &:hover {
          color: var(--td-brand-color-hover);
          border-color: var(--td-brand-color-hover);
        }
      }
    }
  }
}
</style>
