// app.js
const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')

const PIXEL_BOX_SIZE = 15 // pixels
const LEFT_OFFSET = 100 // pixels from the left edge
const TOP_OFFSET = 50 // pixels from the top edge
const BACKGROUND_COLOUR = '#191919' // almost black, but not quite, so you can see black as a pixel colour
const BORDER_COLOUR = '#CCCCCC' // used around colour selection boxes and pixels
const COLOURS = {
  'pastelblue': '#1E90FF',
  'aqua': '#00FFFF',
  'black': '#000000',
  'fuchsia': '#FF00FF',
  'gray': '#808080',
  'green': '#008000',
  'maroon': '#800000',
  'navy': '#000080',
  'olive': '#808000',
  'red': '#FF0000',
  'silver': '#C0C0C0',
  'teal': '#008080',
  'yellow': '#FFFF00'
}


class Pixel {
  constructor(x, y, colour) {
    this.x = x
    this.y = y
    this.colour = colour
  }
}

class ColourButton {
  constructor(colourName, colourValue, x, y, width, height) {
    this.colourName = colourName
    this.colourValue = colourValue
    this.x = x
    this.y = y
    this.width = width
    this.height = height
  }
}

const state = {
  backgroundImageData: undefined,
  mouse: { x: undefined, y: undefined, isDown: false, wasDown: false },
  selectedColour: 'pastelblue',
  colourButtons: [],
  pixels: []
}

const canvasPositionToGridPosition = (canvasX, canvasY) => {
  const gridX = Math.floor((canvasX - LEFT_OFFSET) / PIXEL_BOX_SIZE)
  const gridY = Math.floor((canvasY - TOP_OFFSET) / PIXEL_BOX_SIZE)
  return [gridX, gridY]
}

const gridPositionToCanvasPosition = (gridX, gridY) => {
  const canvasX = gridX * PIXEL_BOX_SIZE + LEFT_OFFSET
  const canvasY = gridY * PIXEL_BOX_SIZE + TOP_OFFSET
  return [canvasX, canvasY]
}

const update = (tick) => {
  // handle the mouse click
  const mouseClicked = state.mouse.wasDown && !state.mouse.isDown
  const { x: mouseX, y: mouseY } = state.mouse
  if (mouseClicked) {
    // check if click is in the left panel
    if (mouseX < LEFT_OFFSET && mouseY > TOP_OFFSET) {
      // left panel
      // since the only thing currently in the left panel is the colour
      // selectors, check if a colour selector was hit
      const hitColourButton = state.colourButtons.find(
        ({ x, y, width, height }) => (
          mouseX >= x &&
          mouseY >= y &&
          mouseX <= x + width && 
          mouseY <= y + height
        )
      )
      if (hitColourButton instanceof ColourButton) {
        console.log(`You selected ${hitColourButton.colourName}`)
        state.selectedColour = hitColourButton.colourName
      }
    }
  }
  
  // Check if mouse is down in the drawing area
  if (state.mouse.isDown && mouseX > LEFT_OFFSET && mouseY > TOP_OFFSET) {
    // drawing area
    const [gridX, gridY] = canvasPositionToGridPosition(mouseX, mouseY)
    const hasPixelPosition = state.pixels.some(({ x, y }) => x === gridX && y === gridY)
    if (!hasPixelPosition && gridX >= 0 && gridY >= 0) {
      const pixel = new Pixel(gridX, gridY, COLOURS[state.selectedColour])
      state.pixels.push(pixel)
    }
  }    

  state.mouse.wasDown = state.mouse.isDown
}

const draw = (tick) => {
  const { pixels, backgroundImageData, colourButtons, selectedColour } = state

  // shift the pixels to make lines crisp (remove anti-aliasing)
  ctx.translate(0.5,0.5)

  // clear the background
  ctx.fillStyle = BACKGROUND_COLOUR
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // draw a background using an offscreen canvas for speed
  if (backgroundImageData !== undefined) {
    ctx.putImageData(backgroundImageData, LEFT_OFFSET, TOP_OFFSET)
  }

  // draw boxes for each of the pixels
  ctx.lineWidth = 1
  if (pixels.length > 0) {
    ctx.strokeStyle = BORDER_COLOUR
    pixels.forEach(({ x, y, colour }) => {
      const [canvasX, canvasY] = gridPositionToCanvasPosition(x, y)
      ctx.fillStyle = colour
      ctx.fillRect(canvasX, canvasY, PIXEL_BOX_SIZE, PIXEL_BOX_SIZE)
      ctx.strokeRect(canvasX, canvasY, PIXEL_BOX_SIZE, PIXEL_BOX_SIZE)
    })
  }

  // draw the offset border
  ctx.strokeStyle = BORDER_COLOUR
  ctx.beginPath()
  ctx.moveTo(canvas.width, TOP_OFFSET)
  ctx.lineTo(LEFT_OFFSET, TOP_OFFSET)
  ctx.lineTo(LEFT_OFFSET, canvas.height)
  ctx.stroke()

  // draw the colour selectors
  ctx.lineWidth = 2
  colourButtons.forEach(({ x, y, width, height, colourValue, colourName }) => {
    ctx.fillStyle = colourValue
    ctx.fillRect(x, y, width, height)
    ctx.strokeStyle = BORDER_COLOUR
    ctx.strokeRect(x, y, width, height)
    if (colourName === selectedColour) {
      // draw a yellow border around to show it is selected
      ctx.strokeStyle = 'yellow'
      const padding = 4
      ctx.strokeRect(x - padding, y - padding, width + padding * 2, height + padding * 2)
    }
  })

  // draw the title
  const fontSize = 40 // pixels
  ctx.textBaseline = 'bottom'
  ctx.textAlign = 'center'
  ctx.font = `${fontSize}px Pixelated`
  ctx.fillStyle = '#1E90FF'
  ctx.fillText('Pixel Paint', canvas.width / 2, fontSize)

  // shift the pixels to make lines crisp (remove anti-aliasing)
  ctx.translate(-0.5,-0.5)
}

const loop = (tick) => {
  update(tick)
  draw(tick)
  requestAnimationFrame(loop)
}

const createBackgroundImageData = (width, height) => {
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')
  const size = 5
  for (let x = 0; x < width; x += size) {
    for (let y = 0; y < height; y += size) {
      const isEven = ((x / size) + (y / size)) % 2 === 0
      ctx.fillStyle = isEven ? '#222' : '#111'
      ctx.fillRect(x, y, size, size)
    }
  }
  return ctx.getImageData(0, 0, canvas.width - LEFT_OFFSET, canvas.height - TOP_OFFSET)
}

const resize = () => {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  state.backgroundImageData = createBackgroundImageData(canvas.width, canvas.height)
}

const mouseMove = (e) => {
  Object.assign(state.mouse, { x: e.clientX, y: e.clientY })
}
const mouseUp = (e) => {
  state.mouse.isDown = false
}
const mouseDown = (e) => {
  state.mouse.isDown = true
}

const init = () => {
  console.log('Pixel Paint')
  canvas.addEventListener('mousemove', mouseMove)
  canvas.addEventListener('mouseup', mouseUp)
  canvas.addEventListener('mousedown', mouseDown)
  window.addEventListener('resize', resize)
  resize()

  /* Create the colour selectors
     --------------------------- 
     There will be two columns of 8 colours for all 16 colours
     60% will be the colour boxes with 40% padding (20% on each side)
     for example, if LEFT_OFFSET is 100, each column would be 50px
     and thus the box would be 30 pixels (60% of 50px)
     and the padding would be 10 pixels on each side (20% of 50px)
  */
  const NUM_COLOUR_COLUMNS = 2
  const columnWidth = (LEFT_OFFSET / NUM_COLOUR_COLUMNS)
  const padding = columnWidth * 0.25 // 20% of column
  const boxSize = columnWidth * 0.5 // 60% of column
  const colourNames = Object.keys(COLOURS)
  state.colourButtons = colourNames.map(colourName => {
    const index = colourNames.indexOf(colourName)
    const column = index % NUM_COLOUR_COLUMNS
    const row = Math.floor(index / NUM_COLOUR_COLUMNS)
    const x = column * columnWidth + padding
    const y = row * columnWidth + padding + TOP_OFFSET
    return new ColourButton(colourName, COLOURS[colourName], x, y, boxSize, boxSize)
  })

  requestAnimationFrame(loop)
}
init()