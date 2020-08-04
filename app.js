// app.js
const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')

const HEXIDECIMAL_RADIX = 16 // values per digit (0-9,a-f)
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

  // converts this.colour (hex colour) to array of 3 values: red, green, blue
  getRGB() {
    const colours = new Array(3).fill(0)
    if (typeof this.colour === 'string'
      && this.colour[0] === '#'
      && this.colour.length === 7 // 2 hex chars per colour, and a hash
    ) {
      colours[0] = parseInt(this.colour[1] + this.colour[2], HEXIDECIMAL_RADIX)
      colours[1] = parseInt(this.colour[3] + this.colour[4], HEXIDECIMAL_RADIX)
      colours[2] = parseInt(this.colour[5] + this.colour[6], HEXIDECIMAL_RADIX)
    }
    return colours
  }
}

class Button {
  constructor(x, y, width, height) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
  }

  // returns boolean indicating if x,y provided lands within button area
  isInBounds(x, y) {
    return (x >= this.x && y >= this.y)
      && (x < this.x + this.width && y < this.y + this.height)
  }

  draw(ctx) {
    ctx.fillStyle = 'white'
    ctx.fillRect(this.x, this.y, this.width, this.height)
  }

  onClick() {
    console.log('Click!')
  }
}

class ColourButton extends Button {
  constructor(colourName, colourValue, x, y, width, height) {
    super(x, y, width, height)
    this.colourName = colourName
    this.colourValue = colourValue
  }

  draw(ctx, isSelected) {
    ctx.fillStyle = this.colourValue
    ctx.fillRect(this.x, this.y, this.width, this.height)
    ctx.strokeStyle = BORDER_COLOUR
    ctx.strokeRect(this.x, this.y, this.width, this.height)
    if (isSelected) {
      // draw a yellow border around to show it is selected
      ctx.strokeStyle = 'yellow'
      const padding = 4
      ctx.strokeRect(
        this.x - padding,
        this.y - padding,
        this.width + padding * 2,
        this.height + padding * 2
      )
    }
  }

  onClick() {
    state.selectedColour = this.colourName
  }
}

class SaveButton extends Button {
  constructor(x, y, width, height, iconImage, iconSize) {
    super(x, y, width, height)
    if (iconImage instanceof Image) {
      this.iconImage = iconImage
    } else {
      throw Error('Invalid iconImage; must be an Image type')
    }
    if (typeof iconSize === 'number' && iconSize > 0 && iconSize <= width) {
      this.iconSize = iconSize
    } else {
      throw Error('Invalid iconSize; must be a number between 0 and width')
    }
  }

  draw(ctx) {
    super.draw(ctx) // draw a white box using button dimensions
    if (this.iconImage instanceof Image) {
      const imageOffsetX = 2
      const imageOffsetY = 1
      ctx.drawImage(this.iconImage, this.x + imageOffsetX, this.y + imageOffsetY, this.iconSize, this.iconSize)
    }
  }

  onClick() {
    saveImage()
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
  const { mouse, colourButtons, saveButton, pixels } = state

  // handle the mouse click
  const mouseClicked = mouse.wasDown && !mouse.isDown
  if (mouseClicked) {
    // check if click is in the left panel
    if (mouse.x < LEFT_OFFSET && mouse.y > TOP_OFFSET) {
      // left panel: check if a button was hit
      [...colourButtons, saveButton]
        .filter(button => button.isInBounds(mouse.x, mouse.y))
        .forEach(button => button.onClick())
    }
  }
  
  // Check if mouse is down in the drawing area
  if (mouse.isDown && mouse.x > LEFT_OFFSET && mouse.y > TOP_OFFSET) {
    // drawing area
    const [gridX, gridY] = canvasPositionToGridPosition(mouse.x, mouse.y)
    const matchingPixel = pixels.find(({ x, y }) => x === gridX && y === gridY)
    const hasPixel = matchingPixel !== undefined
    if (hasPixel) {
      // update the colour to the selected colour
      matchingPixel.colour = COLOURS[state.selectedColour]
    } else if (gridX >= 0 && gridY >= 0) {
      const pixel = new Pixel(gridX, gridY, COLOURS[state.selectedColour])
      pixels.push(pixel)
    }
  }    

  mouse.wasDown = mouse.isDown
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

  // draw the preview window
  const previewWindowScale = 2 // each pixel is doubled in size
  const previewWindowHeight = ((canvas.height - TOP_OFFSET) / PIXEL_BOX_SIZE) * previewWindowScale
  const previewWindowWidth = ((canvas.width - LEFT_OFFSET) / PIXEL_BOX_SIZE) * previewWindowScale
  const previewWindowMargin = TOP_OFFSET * 0.2 // ~20% seems good enough
  const previewWindowTop = TOP_OFFSET + previewWindowMargin
  const previewWindowLeft = canvas.width - previewWindowWidth - previewWindowMargin
  ctx.fillStyle = BACKGROUND_COLOUR
  ctx.fillRect(previewWindowLeft-1, previewWindowTop-1, previewWindowWidth+2, previewWindowHeight+2)
  ctx.strokeStyle = BORDER_COLOUR
  ctx.strokeRect(previewWindowLeft-1, previewWindowTop-1, previewWindowWidth+2, previewWindowHeight+2)
  // iterate over the pixels and draw them in the preview window
  pixels.forEach(({ x, y, colour }) => {
    ctx.fillStyle = colour
    ctx.fillRect(
      previewWindowLeft + (x * previewWindowScale),
      previewWindowTop + (y * previewWindowScale),
      previewWindowScale,
      previewWindowScale
    )
  })

  // draw the colour selectors
  ctx.lineWidth = 2
  colourButtons.forEach(colourButton => {
    colourButton.draw(ctx, colourButton.colourName === selectedColour)
  })

  // draw a dividing line just below the last colour box
  const lastColourButton = colourButtons[colourButtons.length - 1]
  ctx.strokeStyle = BORDER_COLOUR
  const dividerMargin = 20 // pixels
  const dividerY = lastColourButton.y  + lastColourButton.height + dividerMargin
  ctx.beginPath()
  ctx.moveTo(dividerMargin, dividerY)
  ctx.lineTo(LEFT_OFFSET - dividerMargin, dividerY)
  ctx.stroke()

  // draw the save icon
  state.saveButton.draw(ctx)

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
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
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

// Mouse event handlers
const mouseMove = (e) => {
  Object.assign(state.mouse, { x: e.clientX, y: e.clientY })
}
const mouseUp = (e) => {
  state.mouse.isDown = false
}
const mouseDown = (e) => {
  state.mouse.isDown = true
}

const saveImage = () => {
  // create a new canvas with only the pixels we have in state
  const { pixels } = state
  const imageWidth = Math.max(0, ...pixels.map(pixel => pixel.x)) + 1
  const imageHeight = Math.max(0, ...pixels.map(pixel => pixel.y)) + 1

  // Create a new canvas to paint on, appending to the body to ensure it works on most browsers  
  const imageCanvas = document.createElement('canvas')
  imageCanvas.width = imageWidth
  imageCanvas.height = imageHeight
  document.body.appendChild(imageCanvas)
  const imageContext = imageCanvas.getContext('2d')

  // imageData is an object with a 'data' property as a Uint8ClampedArray storing RGBA values (0-255) for each pixel
  const imageData = ctx.createImageData(imageWidth, imageHeight)
  pixels.forEach(pixel => {
    const [red, green, blue] = pixel.getRGB()
    const offset = (pixel.y * imageWidth + pixel.x) * 4 // 4 values for each pixel: RGBA
    imageData.data[offset] = red
    imageData.data[offset + 1] = green
    imageData.data[offset + 2] = blue
    imageData.data[offset + 3] = 255 // max alpha value
  })
  imageContext.putImageData(imageData, 0, 0)

  // For best compatibility, a link is created and added to the document.
  // This allows the use of canvas.toDataURL() to set the link href for download
  const link = document.createElement('a')
  link.download = `Pixel Paint Image - ${new Date().toUTCString()}.png`
  link.href = imageCanvas.toDataURL('image/png')
  link.click()
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

  // Create the save button, just below the divider
  const dividerMargin = 20 // pixels
  const lastColourButton = state.colourButtons[state.colourButtons.length - 1]
  const saveButtonY = lastColourButton.y  + lastColourButton.height + dividerMargin * 2
  const saveButtonX = state.colourButtons[0].x
  const saveButtonIconImage = document.getElementById('save-icon')
  const saveButtonIconImageSize = 25 // pixels, actual is 52 pixels
  const saveButtonWidth = saveButtonIconImageSize + 5
  const saveButtonHeight = saveButtonIconImageSize + 4
  state.saveButton = new SaveButton(saveButtonX, saveButtonY, saveButtonWidth, saveButtonHeight, saveButtonIconImage, saveButtonIconImageSize)

  requestAnimationFrame(loop)
}
init()
