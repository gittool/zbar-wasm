<template>
  <section class="scanner-view">
    <div class="preview-container">
      <video
        ref="videoRef"
        class="camera-preview"
        autoplay
        playsinline
        muted
      ></video>
      <canvas ref="canvasRef" class="capture-canvas" aria-hidden="true"></canvas>
      <div v-if="!isActive" class="overlay">
        <p>{{ statusMessage }}</p>
      </div>
    </div>

    <div class="status-area">
      <p class="status-text">{{ statusMessage }}</p>
      <button
        v-if="!isActive"
        class="primary-button"
        @click="startScanning"
      >
        カメラを開始
      </button>
      <button
        v-else
        class="secondary-button"
        @click="stopScanning"
      >
        一時停止
      </button>
    </div>

    <div v-if="lastResult" class="last-result">
      <h2>最新の結果</h2>
      <p class="result-type">{{ lastResult.typeName }}</p>
      <p class="result-data">{{ lastResult.data }}</p>
    </div>
  </section>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { scanForSupportedSymbols } from '@/utils/zbar.js';

const props = defineProps({
  paused: {
    type: Boolean,
    default: false
  },
  lastResult: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['scan', 'error']);

const videoRef = ref(null);
const canvasRef = ref(null);
const isActive = ref(false);
const statusMessage = ref('カメラを初期化しています…');

let mediaStream;
let animationFrameId;
let scanning = false;
let processing = false;
const recentEmits = new Map();
const DEDUPE_INTERVAL = 1200;

async function startScanning() {
  if (scanning || props.paused) {
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    statusMessage.value = 'この端末ではカメラを利用できません。';
    emit('error', 'MediaDevices API is not available in this browser.');
    return;
  }

  try {
    statusMessage.value = 'カメラにアクセスしています…';
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });

    const video = videoRef.value;
    video.srcObject = mediaStream;
    await video.play();

    statusMessage.value = 'スキャン中…';
    isActive.value = true;
    scanning = true;
    scheduleNextFrame();
  } catch (error) {
    statusMessage.value = 'カメラを開始できません。設定をご確認ください。';
    emit('error', error.message ?? String(error));
  }
}

function stopScanning() {
  scanning = false;
  isActive.value = false;
  statusMessage.value = 'カメラを停止しました。';
  cancelAnimationFrame(animationFrameId);
  animationFrameId = undefined;

  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = undefined;
  }

  const video = videoRef.value;
  if (video) {
    video.pause();
    video.srcObject = null;
  }
}

function scheduleNextFrame() {
  if (!scanning || props.paused) {
    animationFrameId = undefined;
    return;
  }
  animationFrameId = requestAnimationFrame(loop);
}

async function loop() {
  if (!scanning || props.paused) {
    animationFrameId = undefined;
    return;
  }

  const video = videoRef.value;
  const canvas = canvasRef.value;
  if (!video || !canvas) {
    scheduleNextFrame();
    return;
  }

  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    scheduleNextFrame();
    return;
  }

  if (processing) {
    scheduleNextFrame();
    return;
  }

  processing = true;

  try {
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      processing = false;
      scheduleNextFrame();
      return;
    }

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(video, 0, 0, width, height);

    const imageData = context.getImageData(0, 0, width, height);
    const symbols = await scanForSupportedSymbols(imageData);

    if (symbols.length) {
      const now = Date.now();
      const uniqueSymbols = symbols.filter((symbol) => {
        const key = `${symbol.type}:${symbol.data}`;
        const lastTime = recentEmits.get(key) ?? 0;
        if (now - lastTime > DEDUPE_INTERVAL) {
          recentEmits.set(key, now);
          return true;
        }
        return false;
      });

      if (uniqueSymbols.length) {
        emit('scan', uniqueSymbols);
      }
    }
  } catch (error) {
    emit('error', error.message ?? String(error));
  } finally {
    processing = false;
    scheduleNextFrame();
  }
}

watch(
  () => props.paused,
  (value) => {
    if (value) {
      stopScanning();
    } else {
      startScanning();
    }
  },
  { immediate: true }
);

onMounted(() => {
  if (!props.paused) {
    startScanning();
  }
});

onBeforeUnmount(() => {
  stopScanning();
});
</script>

<style scoped>
.scanner-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem 1.25rem 7rem;
}

.preview-container {
  position: relative;
  border-radius: 1.25rem;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.2);
  aspect-ratio: 9 / 16;
}

.camera-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.capture-canvas {
  display: none;
}

.overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.75);
  padding: 1rem;
  text-align: center;
  font-size: 1rem;
  line-height: 1.5;
}

.status-area {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.status-text {
  margin: 0;
  font-size: 0.95rem;
  color: rgba(226, 232, 240, 0.8);
}

.primary-button,
.secondary-button {
  width: 100%;
  border: none;
  border-radius: 9999px;
  padding: 0.9rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.primary-button {
  background: linear-gradient(135deg, #0d9488, #14b8a6);
  color: #0f172a;
  box-shadow: 0 10px 30px rgba(13, 148, 136, 0.35);
}

.secondary-button {
  background: transparent;
  color: #94a3b8;
  border: 1px solid rgba(148, 163, 184, 0.35);
}

.primary-button:active,
.secondary-button:active {
  transform: scale(0.98);
}

.last-result {
  padding: 1rem 1.25rem;
  border-radius: 1rem;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.25);
}

.last-result h2 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
  color: rgba(241, 245, 249, 0.85);
}

.result-type {
  margin: 0;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(94, 234, 212, 0.8);
}

.result-data {
  margin: 0.25rem 0 0;
  font-size: 1.05rem;
  word-break: break-all;
  color: rgba(248, 250, 252, 0.9);
}

@media (min-width: 480px) {
  .scanner-view {
    padding-bottom: 2rem;
  }
}
</style>
