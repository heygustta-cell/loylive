/**
 * Assistente de configuração do Sonora (rode com: npm run setup, ou dê dois cliques no instalar.cmd).
 *
 *  1. Confere Node.js e Git
 *  2. Pede o Client ID do Spotify e grava o arquivo .env
 *  3. Instala as dependências (inclui o Electron da castLabs com Widevine)
 *  4. Assinatura VMP (castLabs EVS): instala o cliente, cria conta/entra e assina o Electron
 *  5. Abre o Sonora
 *
 * Opções: --client-id <id>  --skip-vmp  --no-start
 */
const { spawnSync } = require('node:child_process')
const { existsSync, readFileSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')
const readline = require('node:readline')
const { findPython, runPython } = require('./python.cjs')

const ROOT = join(__dirname, '..')
const ENV_FILE = join(ROOT, '.env')
const REDIRECT_URI = 'http://127.0.0.1:5173/callback'
const DASHBOARD = 'https://developer.spotify.com/dashboard'
const isWin = process.platform === 'win32'

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const option = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}

// ─── Saída colorida (o Terminal do Windows 11 entende ANSI) ──────────────────────────────
const c = (code) => (s) => `\x1b[${code}m${s}\x1b[0m`
const bold = c('1')
const dim = c('2')
const cyan = c('36')
const green = c('32')
const yellow = c('33')
const red = c('31')

let stepNo = 0
const TOTAL = 5
function step(title) {
  stepNo++
  console.log(`\n${cyan(bold(`[${stepNo}/${TOTAL}] ${title}`))}`)
}
const ok = (msg) => console.log(`  ${green('✔')} ${msg}`)
const warn = (msg) => console.log(`  ${yellow('!')} ${msg}`)
const fail = (msg) => console.log(`  ${red('✖')} ${msg}`)
const info = (msg) => console.log(`  ${msg}`)

// Uma pergunta por vez: o readline é fechado antes de rodar programas interativos (EVS).
function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question(`  ${bold('?')} ${question} `, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}
async function confirm(question, defaultYes = true) {
  const a = (await ask(`${question} ${dim(defaultYes ? '(S/n)' : '(s/N)')}`)).toLowerCase()
  if (!a) return defaultYes
  return a.startsWith('s') || a.startsWith('y')
}

function run(cmd, cmdArgs, options = {}) {
  // npm/npx no Windows são .cmd → precisam de shell.
  return spawnSync(cmd, cmdArgs, { stdio: 'inherit', cwd: ROOT, shell: isWin, ...options })
}

function openUrl(url) {
  try {
    if (isWin) spawnSync('explorer.exe', [url], { windowsHide: true })
    else if (process.platform === 'darwin') spawnSync('open', [url])
    else spawnSync('xdg-open', [url], { stdio: 'ignore' })
  } catch {
    /* sem navegador: o link já foi mostrado */
  }
}

function readClientId() {
  if (!existsSync(ENV_FILE)) return ''
  const m = /^\s*MAIN_VITE_SPOTIFY_CLIENT_ID\s*=\s*(.*)\s*$/m.exec(readFileSync(ENV_FILE, 'utf8').replace(/^﻿/, ''))
  return m ? m[1].replace(/^["']|["']$/g, '').trim() : ''
}

function writeClientId(id) {
  // UTF-8 sem BOM (com BOM o Vite não reconheceria a primeira variável).
  const content =
    '# Client ID do app no Spotify Developer Dashboard (gerado pelo assistente de configuração)\n' +
    `MAIN_VITE_SPOTIFY_CLIENT_ID=${id}\n`
  writeFileSync(ENV_FILE, content, { encoding: 'utf8' })
}

// ─── Etapas ──────────────────────────────────────────────────────────────────────────────
function checkTools() {
  step('Conferindo os programas')
  const [major, minor] = process.versions.node.split('.').map(Number)
  if (major < 22 || (major === 22 && minor < 12)) {
    fail(`Node.js ${process.versions.node} é antigo demais (precisa do 22.12 ou mais novo).`)
    info(isWin ? 'Atualize com:  winget upgrade OpenJS.NodeJS.LTS   (ou baixe em https://nodejs.org)' : 'Atualize em https://nodejs.org')
    process.exit(1)
  }
  ok(`Node.js ${process.versions.node}`)
  const git = spawnSync('git', ['--version'], { encoding: 'utf8', shell: isWin })
  if (git.status === 0) ok(git.stdout.trim())
  else warn('Git não encontrado — normalmente não é necessário, mas se o "npm install" falhar, instale em https://git-scm.com')
}

async function setupClientId() {
  step('Client ID do Spotify')
  let current = readClientId()
  const fromArg = option('--client-id')
  if (fromArg) {
    writeClientId(fromArg.trim())
    ok(`Client ID salvo no .env (${fromArg.trim().slice(0, 6)}…)`)
    return
  }
  if (current) {
    ok(`Já configurado no .env (${current.slice(0, 6)}…)`)
    if (!(await confirm('Quer trocar?', false))) return
  }
  console.log(`
  Crie (ou abra) o seu app no Spotify Developer Dashboard:
    ${bold('1.')} Entre em ${cyan(DASHBOARD)} e clique em ${bold('Create app')}
    ${bold('2.')} App name: ${bold('Sonora')}   •   App description: ${bold('Player pessoal')}
    ${bold('3.')} Redirect URIs: ${bold(REDIRECT_URI)}  ${dim('(clique em Add)')}
    ${bold('4.')} Em "Which API/SDKs…" marque ${bold('Web API')} e ${bold('Web Playback SDK')}
    ${bold('5.')} Aceite os termos, clique em ${bold('Save')} e copie o ${bold('Client ID')}
`)
  if (await confirm('Abrir o Dashboard no navegador agora?')) openUrl(DASHBOARD)

  for (;;) {
    const id = (await ask('Cole aqui o Client ID:')).replace(/\s+/g, '')
    if (!id) {
      warn('Nada foi colado. (Também dá para colar o Client ID depois, na tela de login do app.)')
      if (await confirm('Pular esta etapa?', false)) return
      continue
    }
    if (!/^[0-9a-f]{32}$/i.test(id)) {
      warn('Isso não parece um Client ID (são 32 letras/números). Cuidado para não colar o "Client secret".')
      if (!(await confirm('Usar mesmo assim?', false))) continue
    }
    writeClientId(id)
    ok(`Client ID salvo em ${dim('.env')}`)
    return
  }
}

function installDeps() {
  step('Instalando as dependências (pode levar alguns minutos)')
  info(dim('Baixa o React, o Fluent UI e o Electron da castLabs com Widevine (~110 MB).'))
  const r = run('npm', ['install', '--no-audit', '--no-fund'])
  if (r.status !== 0) {
    fail('O "npm install" falhou. Confira sua internet e rode este assistente de novo.')
    process.exit(1)
  }
  // Garante o binário do Electron (o postinstall normalmente já baixa).
  const electronDist = join(ROOT, 'node_modules', 'electron', 'dist')
  if (!existsSync(join(ROOT, 'node_modules', 'electron', 'path.txt'))) {
    run('npx', ['install-electron'])
  }
  if (!existsSync(electronDist)) {
    fail('O Electron da castLabs não foi baixado. Rode: npx install-electron')
    process.exit(1)
  }
  ok('Dependências instaladas')
}

async function setupVmp() {
  step('Assinatura VMP (castLabs EVS) — necessária para o Spotify liberar o áudio')
  if (flag('--skip-vmp')) {
    warn('Pulado (--skip-vmp). Depois rode: npm run vmp:sign-dev')
    return true
  }
  const py = findPython()
  if (!py) {
    fail('Python 3 não encontrado.')
    info(isWin ? 'Instale com:  winget install Python.Python.3.12   e rode este assistente de novo.' : 'Instale o Python 3 e rode de novo.')
    return false
  }
  ok(`Python ${py.version} (${[py.cmd, ...py.pre].join(' ')})`)

  info('Instalando/atualizando o cliente castlabs-evs…')
  if (runPython(py, ['-m', 'pip', 'install', '--upgrade', '--disable-pip-version-check', 'castlabs-evs']).status !== 0) {
    fail('Não foi possível instalar o castlabs-evs.')
    return false
  }
  ok('castlabs-evs instalado')

  const hasAccount = await confirm('Você já tem uma conta no castLabs EVS?', false)
  if (!hasAccount) {
    console.log(`
  Vamos criar sua conta gratuita. O programa vai perguntar (em inglês):
    ${bold('E-mail Address')}  seu e-mail ${dim('(vai receber um código)')}
    ${bold('First Name / Last Name')}  seu nome e sobrenome
    ${bold('Organization')}  pode ser ${bold('Pessoal')}
    ${bold('Account Name')}  um nome de usuário ${dim('(guarde-o!)')}
    ${bold('Password')}  senha com 8+ caracteres ${dim('(não aparece enquanto você digita)')}
    ${bold('Confirmation Code')}  o código que chegou no seu e-mail
  Quando perguntar ${bold('"... [y/N]"')}, responda ${bold('y')} para confirmar.
`)
    if (runPython(py, ['-m', 'castlabs_evs.account', 'signup']).status !== 0) {
      fail('O cadastro não foi concluído. Você pode tentar de novo depois com:')
      info(`  ${[py.cmd, ...py.pre].join(' ')} -m castlabs_evs.account signup`)
      return false
    }
  } else {
    info('Entre com o nome da conta (Account Name) e a senha do EVS:')
    if (runPython(py, ['-m', 'castlabs_evs.account', 'reauth']).status !== 0) {
      fail('Não foi possível entrar na conta EVS.')
      return false
    }
  }
  ok('Conta EVS pronta')

  info('Assinando o Electron (node_modules/electron/dist)…')
  const dist = join(ROOT, 'node_modules', 'electron', 'dist')
  if (runPython(py, ['-m', 'castlabs_evs.vmp', 'sign-pkg', dist]).status !== 0) {
    fail('A assinatura falhou. Tente de novo mais tarde com: npm run vmp:sign-dev')
    return false
  }
  const verify = runPython(py, ['-m', 'castlabs_evs.vmp', 'verify-pkg', dist])
  if (verify.status !== 0) {
    warn('A verificação reclamou de algo — veja a mensagem acima.')
    return false
  }
  ok('Electron assinado com VMP de produção')
  return true
}

async function finish(vmpOk) {
  step('Pronto!')
  console.log(`
  ${green(bold('O Sonora está configurado.'))}
  ${vmpOk ? '' : yellow('Atenção: a assinatura VMP não foi concluída — o app abre, mas o Spotify pode recusar o áudio.\n  Rode depois: npm run vmp:sign-dev\n')}
  Para abrir depois:  ${bold('iniciar.cmd')} ${dim('(dois cliques)')}  ou  ${bold('npm run dev')}
  Na primeira vez, o app baixa o Widevine (DRM) — aguarde a tela "Preparando o Widevine".
  Depois é só clicar em ${bold('Entrar com o Spotify')}.
`)
  if (flag('--no-start')) return
  if (await confirm('Abrir o Sonora agora?')) run('npm', ['run', 'dev'])
}

;(async () => {
  console.log(`\n  ${bold('Sonora')} ${dim('— assistente de configuração')}`)
  checkTools()
  await setupClientId()
  installDeps()
  const vmpOk = await setupVmp()
  await finish(vmpOk)
})().catch((err) => {
  fail(err && err.message ? err.message : String(err))
  process.exit(1)
})
