import {
  setModuleArgs,
  getDefaultScanner,
  scanImageData,
  ZBarSymbolType,
  ZBarConfigType
} from '@dist/index.mjs';
import wasmUrl from '@dist/zbar.wasm?url';

const ENABLED_SYMBOL_TYPES = [
  ZBarSymbolType.ZBAR_CODE39,
  ZBarSymbolType.ZBAR_CODE93,
  ZBarSymbolType.ZBAR_CODE128,
  ZBarSymbolType.ZBAR_CODABAR,
  //ZBarSymbolType.ZBAR_DATABAR,
  //ZBarSymbolType.ZBAR_DATABAR_EXP,
  //ZBarSymbolType.ZBAR_EAN5,
  //ZBarSymbolType.ZBAR_EAN8,
  ZBarSymbolType.ZBAR_EAN13,
  //ZBarSymbolType.ZBAR_ISBN10,
  //ZBarSymbolType.ZBAR_ISBN13,
  //ZBarSymbolType.ZBAR_ADDON2,
  //ZBarSymbolType.ZBAR_ADDON5,
  //ZBarSymbolType.ZBAR_I25,
  ZBarSymbolType.ZBAR_QRCODE,
  //ZBarSymbolType.ZBAR_UPCA
];

const SUPPORTED_TYPES = new Set(ENABLED_SYMBOL_TYPES);

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
      for (const type of ENABLED_SYMBOL_TYPES) {
        scanner.setConfig(type, ZBarConfigType.ZBAR_CFG_ENABLE, 1);
      }
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
