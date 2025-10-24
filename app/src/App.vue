<template>
  <div class="app-shell">
    <header class="app-header">
      <div>
        <h1>zbar-wasm Scanner</h1>
        <p>多種類のバーコード/QRコードをシームレスに読み取り</p>
      </div>
      <button class="install-hint" @click="promptInstall" v-if="deferredPrompt">
        アプリをインストール
      </button>
    </header>

    <main class="app-main">
      <ScannerView
        v-if="activeTab === 'scan'"
        :paused="activeTab !== 'scan'"
        :last-result="lastResult"
        @scan="handleScan"
        @error="handleScannerError"
      />
      <HistoryPanel
        v-else
        :items="historyItems"
        @clear="clearHistory"
      />
    </main>

    <nav class="tab-bar">
      <button
        :class="['tab-button', { active: activeTab === 'scan' }]"
        @click="activeTab = 'scan'"
      >
        スキャン
      </button>
      <button
        :class="['tab-button', { active: activeTab === 'history' }]"
        @click="activeTab = 'history'"
      >
        履歴
      </button>
    </nav>

    <transition name="toast">
      <div v-if="toastMessage" class="toast">
        {{ toastMessage }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import ScannerView from '@/components/ScannerView.vue';
import HistoryPanel from '@/components/HistoryPanel.vue';
import {
  initHistoryStore,
  addScanRecord,
  getAllRecords,
  clearAllRecords
} from '@/db/historyStore.js';

const activeTab = ref('scan');
const historyItems = ref([]);
const lastResult = ref(null);
const toastMessage = ref('');
let toastTimer;
const deferredPrompt = ref(null);

const handleBeforeInstallPrompt = (event) => {
  event.preventDefault();
  deferredPrompt.value = event;
};

onMounted(async () => {
  await initHistoryStore();
  historyItems.value = await getAllRecords();

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
});

async function handleScan(symbols) {
  if (!symbols.length) {
    return;
  }

  const savedEntries = [];
  for (const symbol of symbols) {
    const saved = await addScanRecord({
      type: symbol.type,
      typeName: symbol.typeName,
      data: symbol.data,
      createdAt: symbol.capturedAt
    });
    savedEntries.push(saved);
  }

  if (savedEntries.length) {
    historyItems.value = [...savedEntries, ...historyItems.value];
    lastResult.value = savedEntries[0];
    showToast(`${savedEntries.length}件のコードを保存しました`);
  }
}

async function clearHistory() {
  await clearAllRecords();
  historyItems.value = [];
  lastResult.value = null;
  showToast('履歴をクリアしました');
}

function handleScannerError(message) {
  showToast(message || 'カメラで問題が発生しました');
}

async function promptInstall() {
  if (!deferredPrompt.value) {
    return;
  }
  deferredPrompt.value.prompt();
  await deferredPrompt.value.userChoice;
  deferredPrompt.value = null;
}

function showToast(message) {
  toastMessage.value = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastMessage.value = '';
  }, 2600);
}
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  position: relative;
  color: #e2e8f0;
}

.app-header {
  padding: 1.75rem 1.25rem 1rem;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.app-header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.app-header p {
  margin: 0.4rem 0 0;
  color: rgba(148, 163, 184, 0.9);
  font-size: 0.9rem;
}

.install-hint {
  background: rgba(13, 148, 136, 0.15);
  border: 1px solid rgba(94, 234, 212, 0.4);
  color: rgba(94, 234, 212, 0.95);
  border-radius: 9999px;
  padding: 0.5rem 1rem;
  font-weight: 600;
  cursor: pointer;
}

.app-main {
  overflow-y: auto;
}

.tab-bar {
  position: sticky;
  bottom: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: rgba(2, 6, 23, 0.9);
  backdrop-filter: blur(16px);
  border-top: 1px solid rgba(148, 163, 184, 0.2);
}

.tab-button {
  padding: 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: rgba(148, 163, 184, 0.85);
  background: transparent;
  border: none;
  position: relative;
}

.tab-button.active {
  color: #0ea5e9;
}

.tab-button.active::after {
  content: '';
  position: absolute;
  left: 20%;
  right: 20%;
  bottom: 0.4rem;
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, #0ea5e9, #38bdf8);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 5.5rem;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(94, 234, 212, 0.2);
  padding: 0.85rem 1.5rem;
  border-radius: 9999px;
  box-shadow: 0 15px 35px rgba(15, 23, 42, 0.45);
  font-size: 0.95rem;
  z-index: 50;
}

@media (min-width: 768px) {
  .app-shell {
    border-radius: 2rem;
    margin: 1.5rem auto;
    max-width: 480px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    box-shadow: 0 40px 60px rgba(15, 23, 42, 0.35);
    overflow: hidden;
  }
}
</style>
