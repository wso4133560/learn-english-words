<template>
  <main class="selection-shell">
    <section class="hero-copy"><div class="brand-mark">W<span>+</span></div><p class="kicker">LANGUAGE LAB / 01</p><h1>把今天的<br><em>一个词</em>学会。</h1><p class="intro">轻量、专注的英语单词练习。每次只面对一张卡片，听见它、理解它，然后继续前进。</p></section>
    <section class="selector-card glass"><div class="card-header"><div><p class="section-label">START A SESSION</p><h2>选择你的词库</h2></div><span class="card-index">01</span></div><div class="selector-grid"><label class="field"><span>词库分类</span><select v-model="selectedFolder" :disabled="isLoading" @change="handleFolderChange"><option v-if="folders.length === 0" value="">暂无文件夹</option><option v-for="folder in folders" :key="folder" :value="folder">{{ folder }}</option></select></label><label class="field"><span>练习文件</span><select v-model="selectedFile" :disabled="isLoading || !selectedFolder"><option v-if="files.length === 0" value="">暂无文件</option><option v-for="file in files" :key="file" :value="file">{{ file }}</option></select></label></div><div v-if="error" class="error">{{ error }}</div><div class="mode-row"><div class="mode-note"><span class="mode-dot"></span><div><strong>{{ studyPlan.label }} · 建议今日 {{ studyPlan.dailyTarget }} 张</strong><small>建议每组 {{ studyPlan.batchSize }} 张 · 自动播放重复 {{ studyPlan.repeatCount }} 次</small></div></div><div class="button-group"><ActionButton variant="secondary" :disabled="!selectedFolder || !selectedFile || isLoading" @click="handleStartAutoplay">自动播放</ActionButton><ActionButton variant="primary" :disabled="!selectedFolder || !selectedFile || isLoading" :loading="isLoading" @click="handleStart">开始学习 <span aria-hidden="true">→</span></ActionButton></div></div></section>
  </main>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ActionButton from './ActionButton.vue'
import { getStudyPlan } from '@/services/studyPlan'
interface Props { folders: string[]; files: string[]; isLoading?: boolean; error?: string | null }
const props = withDefaults(defineProps<Props>(), { isLoading: false, error: null })
const emit = defineEmits<{ folderChange: [folder: string]; start: [folder: string, file: string]; startAutoplay: [folder: string, file: string] }>()
const selectedFolder = ref(''); const selectedFile = ref('')
const studyPlan = computed(() => getStudyPlan('gentle'))
// A remounted selector must load files for its initial folder as well as user changes.
watch(() => props.folders, (items) => {
  if (items.length && !selectedFolder.value) {
    selectedFolder.value = items[0] || ''
    emit('folderChange', selectedFolder.value)
  }
}, { immediate: true })
watch(() => props.files, (items) => { selectedFile.value = items[0] || '' }, { immediate: true })
const handleFolderChange = () => { selectedFile.value = ''; emit('folderChange', selectedFolder.value) }
const handleStart = () => { if (selectedFolder.value && selectedFile.value) emit('start', selectedFolder.value, selectedFile.value) }
const handleStartAutoplay = () => { if (selectedFolder.value && selectedFile.value) emit('startAutoplay', selectedFolder.value, selectedFile.value) }
</script>
<style scoped>
.selection-shell { width:min(1120px,calc(100% - 48px)); min-height:100vh; margin:auto; display:grid; grid-template-columns:.82fr 1.18fr; align-items:center; gap:clamp(40px,8vw,120px); padding:56px 0; }.hero-copy{max-width:430px}.brand-mark{width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:var(--primary);color:#191b23;border-radius:13px;font-weight:850;font-size:21px;margin-bottom:40px}.brand-mark span{color:#fff}.kicker,.section-label{margin:0 0 14px;font-size:11px;letter-spacing:.2em;color:var(--text-tertiary);font-weight:800}.hero-copy h1{font-size:clamp(44px,5.2vw,72px);line-height:1.05;letter-spacing:-.06em;margin:0}.hero-copy h1 em{color:var(--primary);font-style:normal}.intro{color:var(--text-secondary);line-height:1.85;margin-top:25px;max-width:360px}.selector-card{padding:clamp(26px,4vw,48px);border-radius:var(--radius-xl);box-shadow:var(--shadow-card)}.card-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:34px}.card-header h2{margin:0;font-size:27px;letter-spacing:-.04em}.card-index{color:var(--primary);font-size:13px;font-weight:800}.selector-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.field{display:flex;flex-direction:column;gap:10px}.field span{color:var(--text-secondary);font-size:12px}.field select{width:100%;height:52px;color:var(--text-primary);background:#252c3b;border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:0 14px}.mode-row{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-top:34px}.mode-note{display:flex;gap:11px;align-items:center}.mode-dot{width:9px;height:9px;border-radius:50%;background:var(--success);box-shadow:0 0 0 5px rgba(104,211,145,.12)}.mode-note strong,.mode-note small{display:block}.mode-note strong{font-size:13px}.mode-note small{color:var(--text-tertiary);font-size:11px;margin-top:3px}.button-group{display:flex;gap:10px}.error{color:var(--error);margin-top:14px;font-size:13px}@media(max-width:820px){.selection-shell{grid-template-columns:1fr;width:min(620px,calc(100% - 32px));padding:38px 0;align-content:center;gap:38px}.hero-copy{max-width:none}.brand-mark{margin-bottom:26px}.hero-copy h1 br{display:none}.intro{margin-top:16px}.mode-row{flex-direction:column;align-items:stretch}.button-group button{flex:1}}@media(max-width:480px){.selector-grid{grid-template-columns:1fr}.button-group{flex-direction:column-reverse}.button-group button{width:100%}.selector-card{padding:24px 20px}}
</style>
