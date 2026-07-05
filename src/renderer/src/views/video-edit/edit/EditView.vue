<template>
  <div class="edit">
    <div class="edit-header">{{ $t('common.editView.headerText') }}</div>
    <t-radio-group class="edit-tabs" variant="default-filled" size="large" v-model="state.activeTab"
      @change="action.onChangeTab">
      <t-radio-button :value="EDIT_TABS.TEXT">{{ $t('common.editView.text') }}</t-radio-button>
      <t-radio-button :value="EDIT_TABS.AUDIO">{{ $t('common.editView.audio') }}</t-radio-button>
    </t-radio-group>
    <div class="edit-body edit-body-text" v-show="getter.isTextTab.value">
      <EditText v-model="select" class="content" :listener="listener" />
    </div>
    <div class="edit-body" v-show="getter.isAudioTab.value">
      <EditUpload v-model="select" class="content" :listener="listener" />
    </div>
    <EditListener ref="listener" />
  </div>
</template>
<script setup>
import { computed, reactive, ref } from 'vue'
import EditListener from './EditListener.vue'
import EditUpload from './EditUpload.vue';
import EditText from './EditText.vue';

const select = defineModel({})


const EDIT_TABS = {
  TEXT: '1',
  AUDIO: '2'
}

const state = reactive({
  activeTab: EDIT_TABS.TEXT,
  textToAudioLoading: false,
})

const listener = ref()

const getter = {
  isTextTab: computed(() => {
    return state.activeTab === EDIT_TABS.TEXT
  }),
  isAudioTab: computed(() => {
    return state.activeTab === EDIT_TABS.AUDIO
  })
}

const action = {
  onChangeTab() {
    listener.value?.pause()
  }
}

</script>
<style lang="less" scoped>
.edit {
  display: flex;
  height: 100%;
  flex-direction: column;

  &-header {
    font-weight: 500;
    padding: 18px;
    font-size: 14px;
    color: var(--app-text-1);
    line-height: 22px;
    text-align: center;
    border-bottom: 1px solid var(--app-border);
  }

  &-tabs {
    margin: 12px 20px 0;
    display: flex;
    width: auto;
    padding: 6px;
    border-radius: 4px;
    background-color: var(--app-bg-input);
    --td-bg-color-container-select: #2B3B52;

    :deep(.t-radio-button) {
      width: 50%;
      border-radius: 4px;
    }

    :deep(.t-radio-button__label) {
      margin: auto;
      font-weight: 400;
      font-size: 14px;
      color: var(--app-text-1);
      line-height: 20px;
    }

    :deep(.t-radio-button.t-is-checked) {
      background: #434af9;
      border-color: #434af9;
    }

    :deep(.t-is-checked .t-radio-button__label) {
      font-weight: 400;
      color: #ffffff;
    }
  }

  &-body {
    flex: 1;
    width: 100%;
    height: 100%;
    padding: 12px 20px;
    display: flex;
    justify-content: center;
    align-items: start;
    position: relative;

    .content {
      border-radius: 8px 8px 8px 8px;
      width: 100%;
      --td-bg-color-specialcomponent: var(--app-bg-input);
      --td-brand-color-focus: var(--app-bg-input);
    }

    &-text {
      padding-bottom: 91px;

      .content {
        background-color: var(--app-bg-input);
      }
    }

  }
}
</style>
