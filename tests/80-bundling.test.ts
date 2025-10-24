import fs from 'fs'
import { buildConfigs, testDir } from './buildConfigs'
import { execSync } from 'child_process'
import type { Bundler } from './buildConfigs'

const
  execOptions = {
    cwd: testDir,
    stdio: [0, 1, 2],
  },
  bundlers = new Set<Bundler>(buildConfigs.map(c => c.bundler)),
  expectedBarcode = 'Lorem-ipsum-12345';

const testCafeCommand = process.env.TESTCAFE_COMMAND ?? 'testcafe'
const testCafeArgs = (process.env.TESTCAFE_ARGS ?? '').trim()

const canRunTestCafe = (() => {
  try {
    execSync(`${testCafeCommand} --version`, { stdio: ['ignore', 'ignore', 'ignore'] })
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('ENOENT') || message.includes('not found')) {
      console.warn('Skipping browser TestCafé run because TestCafé executable is not available.')
      return false
    }

    // Unexpected failure while probing version; rethrow so the test surface the real issue
    throw error
  }
})()


// Install the build dependencies locally
beforeAll(() => {
  execSync('npm install', execOptions)
})


// Build all target variations
test.each(Array.from(bundlers))(
  `Build test targets with $bundler`,
  (bundler) => {
    const
      bundlerName = bundler.toLowerCase()

    try {
      execSync(`npm run build:${bundlerName}`, execOptions)

    } catch (error) {
      expect(error).toBeUndefined()
    }

    buildConfigs
      .filter(c => c.bundler === bundler)
      .forEach(c => {
        expect(fs.existsSync(c.outputFile)).toBeTruthy()
    })
  }, 60000)


// Test all Node targets
test.each(buildConfigs.filter(c => c.target === 'Node'))(
  `Run the Node $format module (zbar.wasm: $asset) built by $bundler`,
  (buildConfig) => {
    const
      stdout = execSync(`node ${buildConfig.outputFile}`, { cwd: buildConfig.outputDir })

    expect(stdout.toString().trimEnd()).toEqual(expectedBarcode)
  })


// Test all browser targets in TestCafé (unable to make this work in JSDOM)
const runBrowserModulesTest = canRunTestCafe
  ? test
  : test.skip

runBrowserModulesTest('Run the browser modules', () => {
  const command = [testCafeCommand, testCafeArgs].filter(Boolean).join(' ')

  try {
    // Capture output to check for browser availability errors
    execSync(command, { stdio: 'pipe', encoding: 'utf8' })

  } catch (error: any) {
    const message = error?.message ?? String(error)
    const stderr = error?.stderr?.toString() ?? ''
    const stdout = error?.stdout?.toString() ?? ''
    const fullOutput = `${message} ${stderr} ${stdout}`
    
    if (fullOutput.includes('Cannot find the browser') || 
        fullOutput.includes('ENOENT') ||
        fullOutput.includes('is neither a known browser alias')) {
      console.warn('Skipping browser TestCafé run because the required browser is not available.')
      return
    }

    // If it's not a browser availability error, show the output and rethrow
    if (stdout) console.log(stdout)
    if (stderr) console.error(stderr)
    throw error
  }
})
