/**
 * Encontra um Python 3.8+ que funcione de verdade.
 * No Windows 11, "python" pode ser só o atalho da Microsoft Store (que não executa nada),
 * por isso tentamos o lançador "py" primeiro e testamos a versão de cada candidato.
 */
const { spawnSync } = require('node:child_process')

function findPython() {
  const candidates = process.env.PYTHON
    ? [[process.env.PYTHON]]
    : process.platform === 'win32'
      ? [['py', '-3'], ['python'], ['python3']]
      : [['python3'], ['python']]
  for (const [cmd, ...pre] of candidates) {
    const r = spawnSync(cmd, [...pre, '-c', 'import sys; print("%d.%d" % sys.version_info[:2])'], {
      encoding: 'utf8',
      windowsHide: true
    })
    if (r.status !== 0 || !r.stdout) continue
    const [major, minor] = r.stdout.trim().split('.').map(Number)
    if (major === 3 && minor >= 8) return { cmd, pre, version: r.stdout.trim() }
  }
  return null
}

/** Executa o Python encontrado com os argumentos dados (saída no terminal). */
function runPython(py, args, options = {}) {
  return spawnSync(py.cmd, [...py.pre, ...args], { stdio: 'inherit', ...options })
}

module.exports = { findPython, runPython }
