/**
 * Assinatura VMP da castLabs (EVS) para o app empacotado pelo electron-builder.
 *
 * Regra da castLabs no Windows: a assinatura VMP deve ser aplicada DEPOIS da assinatura de código
 * (Authenticode). Por isso:
 *   - com certificado (CSC_LINK / WIN_CSC_LINK definidos) → assina no hook "afterSign";
 *   - sem certificado (caso comum em builds pessoais)      → assina no hook "afterPack"
 *     (o electron-builder nem executa o afterSign quando nenhuma assinatura de código acontece).
 *
 * Pré-requisitos (uma vez):  python -m pip install --upgrade castlabs-evs
 *                            python -m castlabs_evs.account signup   (ou "reauth" para entrar)
 * Para pular (build de teste): defina SKIP_VMP_SIGN=1.
 */
const { execFileSync } = require('node:child_process')

const hasCodeSigning = () => Boolean(process.env.CSC_LINK || process.env.WIN_CSC_LINK)

function vmpSign(context, hook) {
  const platform = context.electronPlatformName
  if (platform !== 'win32') {
    console.log(`[vmp] ${hook}: plataforma ${platform}, nada a fazer.`)
    return
  }
  if (hook === 'afterPack' && hasCodeSigning()) return // será feito no afterSign
  if (hook === 'afterSign' && !hasCodeSigning()) return // já foi feito no afterPack
  if (process.env.SKIP_VMP_SIGN) {
    console.warn('[vmp] SKIP_VMP_SIGN definido — o app NÃO terá assinatura VMP (o Spotify pode recusar a licença).')
    return
  }
  const python = process.env.PYTHON || 'python'
  const dir = context.appOutDir
  console.log(`[vmp] ${hook}: assinando com castLabs EVS → ${dir}`)
  try {
    execFileSync(python, ['-m', 'castlabs_evs.vmp', 'sign-pkg', dir], { stdio: 'inherit' })
    execFileSync(python, ['-m', 'castlabs_evs.vmp', 'verify-pkg', dir], { stdio: 'inherit' })
  } catch (err) {
    throw new Error(
      '[vmp] Falha na assinatura VMP. Instale o castlabs-evs (python -m pip install --upgrade castlabs-evs), ' +
        'faça login (python -m castlabs_evs.account reauth) e tente de novo. Detalhe: ' + err.message
    )
  }
}

module.exports = { vmpSign }
