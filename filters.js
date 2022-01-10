// Formatted by StandardJS

async function loadImage (source, width, height) {
  return new Promise(resolve => {
    const image = new Image(width, height)
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', error => reject(error))
    image.src = source
  })
}

async function getImage (data, width = 768, height = 576, env) {
  const { canvas, context } = env || getEnvironment(width, height)
  const imageData = new ImageData(data, width, height)
  context.putImageData(imageData, 0, 0)
  return loadImage(canvas.toDataURL())
}

function getEnvironment (width = 768, height = 576, smooth = false) {
  const env = { canvas: document.createElement('canvas') }
  env.canvas.width = width
  env.canvas.height = height
  env.context = env.canvas.getContext('2d')
  env.context.imageSmoothingEnabled = smooth
  return env
}

function getData (image, width = 768, height = 576, env) {
  const w = image.width || width
  const h = image.height || height
  const { context } = env || getEnvironment(w, h)
  context.drawImage(image, 0, 0, w, h)
  return context.getImageData(0, 0, w, h).data
}

function drawImage (context, image, filter = x => x, props = [], x = 0, y = 0) {
  const data = filter(getData(image), ...props)
  const imageData = new ImageData(data, image.width, image.height)
  context.putImageData(imageData, x, y)
}

function clamp (value, min = 0, max = 255) {
  return Math.max(min, Math.min(max, value))
}

function getAlpha (beta) {
  return beta === 255 ? Infinity : (255 + beta) / (255 - beta)
}

function getLuminance (r, g, b) {
  return (r + g + b) / 3
}

function getBrightness (r, g, b) {
  const rr = 0.299
  const rg = 0.587
  const rb = 0.114
  const tr = rr + rg + rg
  return (r * rr + g * rg + b * rb) / tr
}

function getAverage (data, luminance = false) {
  d = data.slice()

  const f = luminance ? getLuminance : getBrightness

  let total = 0
  let min = 255
  let max = 0

  for (let i = 0; i < d.length; i = i + 4) {
    const luma = f(d[i + 0], d[i + 1], d[i + 2])
    total += luma
    if (luma > max) max = luma
    if (luma < min) min = luma
  }

  const mean = Math.round((total * 4) / d.length)

  min = Math.round(min)
  max = Math.round(max)

  return { mean, min, max }
}

function filter (data = [], f = () => {}) {
  const d = data.slice()
  for (let i = 0; i < d.length; i = i + 4) {
    const c = f(d[i + 0], d[i + 1], d[i + 2], d[i + 3])
    const { r, g, b, a } = c
    d[i + 0] = r
    d[i + 1] = g
    d[i + 2] = b
    d[i + 3] = a
  }
  return d
}

function grayscale (data) {
  return filter(data, (r, g, b) => {
    const luma = getBrightness(r, g, b)
    return { r: luma, g: luma, b: luma, a: 255 }
  })
}

// threshold: 0 to 255
function threshold (data, threshold = 127, light = 191, dark = 63) {
  return filter(data, (r, g, b) => {
    const luma = getBrightness(r, g, b)
    const value = luma < threshold ? dark : light
    return { r: value, g: value, b: value, a: 255 }
  })
}

// delta: -255 to 255
function brightness (data, delta = 0) {
  const c = clamp
  const d = delta
  return filter(data, (r, g, b) => {
    return { r: c(r + d), g: c(g + d), b: c(b + d), a: 255 }
  })
}

// beta: -255 to 255
function contrast (data, beta = 0) {
  const { mean } = getAverage(data)
  const alpha = getAlpha(beta)
  return filter(data, (r, g, b) => {
    const cr = clamp(alpha * (r - mean) + mean)
    const cg = clamp(alpha * (g - mean) + mean)
    const cb = clamp(alpha * (b - mean) + mean)
    return { r: cr, g: cg, b: cb, a: 255 }
  })
}

// beta: -255 to 255
function saturation (data, beta = 0) {
  const alpha = getAlpha(beta)
  return filter(data, (r, g, b) => {
    const m = (r + g + b) / 3
    const sr = clamp(alpha * (r - m) + m)
    const sg = clamp(alpha * (g - m) + m)
    const sb = clamp(alpha * (b - m) + m)
    return { r: sr, g: sg, b: sb, a: 255 }
  })
}

// gamma: > 0
function gamma (data, gamma = 1) {
  return filter(data, (r, g, b) => {
    const gr = 255 * Math.pow(r / 255, gamma)
    const gg = 255 * Math.pow(g / 255, gamma)
    const gb = 255 * Math.pow(b / 255, gamma)
    return { r: gr, g: gg, b: gb, a: 255 }
  })
}

// size: > 1
function pixelate (data, width = 768, height = 576, size = 8, env) {
  const { canvas, context } = env || getEnvironment(width, height, false)
  const scaleX = width / size
  const scaleY = height / size
  const imageData = new ImageData(data, width, height)
  context.putImageData(imageData, 0, 0)
  context.drawImage(canvas, 0, 0, scaleX, scaleY)
  context.drawImage(canvas, 0, 0, scaleX, scaleY, 0, 0, width, height)
  return context.getImageData(0, 0, width, height).data
}
