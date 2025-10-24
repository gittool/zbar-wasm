import {
  setModuleArgs,
  getDefaultScanner,
  scanImageData,
  ZBarSymbolType,
  ZBarConfigType
} from '@dist/index.mjs';
import wasmUrl from '@dist/zbar.wasm?url';

const SUPPORTED_TYPES = new Set([
  ZBarSymbolType.ZBAR_QRCODE,
  ZBarSymbolType.ZBAR_CODABAR
]);

setModuleArgs({
  locateFile: (file) => {
    if (file === 'zbar.wasm') {
      return wasmUrl;
    }
    return file;
  }
});

let scannerPromise;

async function ensureScanner() {
  if (!scannerPromise) {
    scannerPromise = (async () => {
      const scanner = await getDefaultScanner();
      scanner.setConfig(ZBarSymbolType.ZBAR_NONE, ZBarConfigType.ZBAR_CFG_ENABLE, 0);
      scanner.setConfig(ZBarSymbolType.ZBAR_QRCODE, ZBarConfigType.ZBAR_CFG_ENABLE, 1);
      scanner.setConfig(ZBarSymbolType.ZBAR_CODABAR, ZBarConfigType.ZBAR_CFG_ENABLE, 1);
      scanner.enableCache(true);
      return scanner;
    })();
  }
  return scannerPromise;
}

export async function scanForSupportedSymbols(imageData) {
  const scanner = await ensureScanner();
  const symbols = await scanImageData(imageData, scanner);

  return symbols
    .filter((symbol) => SUPPORTED_TYPES.has(symbol.type))
    .map((symbol) => ({
      type: symbol.type,
      typeName: symbol.typeName,
      data: symbol.decode('utf-8'),
      points: symbol.points,
      quality: symbol.quality ?? null,
      capturedAt: Date.now()
    }));
}

export { ZBarSymbolType };
