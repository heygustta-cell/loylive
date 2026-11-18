/** Gera a textura de "ruído" do material Acrylic uma única vez e publica em --noise. */
export function installNoiseTexture(): void {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const img = ctx.createImageData(size, size)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255
    img.data[i] = v
    img.data[i + 1] = v
    img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  canvas.toBlob((blob) => {
    if (!blob) return
    document.documentElement.style.setProperty('--noise', `url(${URL.createObjectURL(blob)})`)
  }, 'image/png')
}
