/**
 * Atalho para o castLabs EVS (assinatura VMP) que funciona com "py", "python" ou "python3".
 * Uso: node scripts/vmp.cjs sign-pkg node_modules/electron/dist
 */
const { findPython, runPython } = require('./python.cjs')

const py = findPython()
if (!py) {
  console.error('[vmp] Python 3 não encontrado. Instale em https://www.python.org (ou rode o instalar.cmd).')
  process.exit(1)
}
const r = runPython(py, ['-m', 'castlabs_evs.vmp', ...process.argv.slice(2)])
if (r.status !== 0) {
  console.error('\n[vmp] O comando falhou. Se o castlabs-evs não estiver instalado:')
  console.error(`      ${py.cmd} ${py.pre.join(' ')} -m pip install --upgrade castlabs-evs`.replace(/\s+/g, ' '))
}
process.exit(r.status ?? 1)
