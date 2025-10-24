<template>
  <section class="history-panel">
    <header class="history-header">
      <div>
        <h2>スキャン履歴</h2>
        <p class="history-count">{{ items.length }} 件</p>
      </div>
      <button
        class="clear-button"
        :disabled="!items.length"
        @click="$emit('clear')"
      >
        履歴をクリア
      </button>
    </header>

    <ul v-if="items.length" class="history-list">
      <li v-for="item in items" :key="item.id ?? item.createdAt" class="history-card">
        <p class="history-type">{{ item.typeName }}</p>
        <p class="history-data">{{ item.data }}</p>
        <p class="history-meta">{{ formatTimestamp(item.createdAt) }}</p>
      </li>
    </ul>

    <div v-else class="empty-state">
      <p>まだスキャン履歴がありません。</p>
      <p>バーコードやQRコードを読み取るとここに表示されます。</p>
    </div>
  </section>
</template>

<script setup>
const props = defineProps({
  items: {
    type: Array,
    default: () => []
  }
});

function formatTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}
</script>

<style scoped>
.history-panel {
  padding: 1.5rem 1.25rem 6rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.history-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: rgba(244, 244, 245, 0.92);
}

.history-count {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  color: rgba(148, 163, 184, 0.85);
}

.clear-button {
  border: 1px solid rgba(239, 68, 68, 0.4);
  background: transparent;
  color: rgba(248, 113, 113, 0.85);
  border-radius: 9999px;
  padding: 0.5rem 1.25rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.clear-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.history-card {
  padding: 1rem 1.25rem;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.history-type {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(94, 234, 212, 0.9);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.history-data {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  word-break: break-all;
  color: rgba(248, 250, 252, 0.95);
}

.history-meta {
  margin: 0.1rem 0 0;
  font-size: 0.8rem;
  color: rgba(148, 163, 184, 0.7);
}

.empty-state {
  padding: 2rem 1.5rem;
  text-align: center;
  border-radius: 1rem;
  background: rgba(15, 23, 42, 0.6);
  border: 1px dashed rgba(148, 163, 184, 0.4);
  color: rgba(148, 163, 184, 0.8);
  line-height: 1.6;
}
</style>
