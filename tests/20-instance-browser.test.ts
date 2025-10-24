import { JSDOM } from 'jsdom'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { testZBarInstance } from './10-instance.test'

type ZBarModule = typeof import('../dist/index.js')

const createFileResponse = (href: string, data: Buffer): Response => {
  const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
  const response = new Response(arrayBuffer, {
    status: 200,
    headers: {
      'content-type': 'application/wasm'
    }
  })

  if (!response.url) {
    try {
      Object.defineProperty(response, 'url', { value: href })
    } catch {
      // Ignore inability to override url; some implementations keep it read-only
    }
  }

  return response
}

const createLocalFetch = (baseHref: string) => {
  return async (input: string | URL) => {
    const target = new URL(typeof input === 'string' ? input : input.href, baseHref)
    if (target.protocol !== 'file:') {
      throw new Error(`Unsupported protocol for fetch: ${target.protocol}`)
    }

    const filePath = fileURLToPath(target)
    const fileData = await readFile(filePath)
    return createFileResponse(target.href, fileData)
  }
}

let zbarWasm: ZBarModule | undefined
let originalFetch: typeof fetch | undefined

const ensureZbarModule = (): ZBarModule => {
  if (!zbarWasm) {
    throw new Error('zbarWasm module is not loaded yet')
  }

  return zbarWasm
}

beforeAll(async () => {
  const dom = await JSDOM.fromFile('tests/20-instance-browser.test.html', {
    runScripts: 'dangerously',
    resources: 'usable'
  })

  const fileFetch = createLocalFetch(dom.window.location.href)
  dom.window.fetch = fileFetch as typeof fetch
  originalFetch = globalThis.fetch
  globalThis.fetch = fileFetch as typeof fetch

  await new Promise<void>(resolve => {
    // Wait until the HTML page has been loaded
    dom.window.addEventListener('load', ev => {
      zbarWasm = dom.window.zbarWasm as ZBarModule
      resolve()
    })
  })
})

afterAll(() => {
  if (originalFetch) {
    globalThis.fetch = originalFetch
  } else {
    delete (globalThis as Partial<typeof globalThis> & { fetch?: typeof fetch }).fetch
  }
})


test('zbarWasm variable exists', () => {
  const module = ensureZbarModule()
  expect(typeof module).toEqual('object')
  expect(typeof module.getInstance).toEqual('function')
})


test('ZBarInstance created', async () => {
  const module = ensureZbarModule()
  const inst = await module.getInstance()
  testZBarInstance(inst)
});


test('ZBarInstance created from a custom WASM file', async () => {
  const module = ensureZbarModule()
  module.setModuleArgs({
    locateFile: () => '../dist/zbar.wasm'
  })

  const inst = await module.getInstance()
  testZBarInstance(inst)
})
