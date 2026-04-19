#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SMALL_SIZE = 16;
const SCALE = 4;
const WIDTH = SMALL_SIZE * SCALE;
const HEIGHT = SMALL_SIZE * SCALE;
const FRAME_DELAY_CS = 10;

const PALETTE = [
  [0, 0, 0],
  [24, 26, 32],
  [250, 211, 168],
  [255, 95, 86],
  [88, 126, 255],
  [255, 245, 232],
  [18, 214, 201],
  [255, 215, 0],
];

const TRANSPARENT_INDEX = 0;
const OUTLINE = 1;
const SKIN = 2;
const SHIRT = 3;
const SHORTS = 4;
const SHOE = 5;
const ACCENT = 6;
const SPARK = 7;

const OUTPUT_PATH = path.join(__dirname, '..', 'assets', 'images', 'retro-runner.gif');

function setPixel(frame, x, y, color) {
  if (x < 0 || y < 0 || x >= SMALL_SIZE || y >= SMALL_SIZE) {
    return;
  }
  frame[y * SMALL_SIZE + x] = color;
}

function drawRect(frame, x, y, w, h, color) {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) {
      setPixel(frame, xx, yy, color);
    }
  }
}

function drawOutlineRect(frame, x, y, w, h, fill, outline = OUTLINE) {
  drawRect(frame, x, y, w, h, outline);
  if (w > 2 && h > 2) {
    drawRect(frame, x + 1, y + 1, w - 2, h - 2, fill);
  }
}

function drawLine(frame, points, color) {
  for (const [x, y] of points) {
    setPixel(frame, x, y, color);
  }
}

function scaleFrame(frame) {
  const scaled = new Uint8Array(WIDTH * HEIGHT);
  for (let y = 0; y < SMALL_SIZE; y += 1) {
    for (let x = 0; x < SMALL_SIZE; x += 1) {
      const color = frame[y * SMALL_SIZE + x];
      for (let yy = 0; yy < SCALE; yy += 1) {
        for (let xx = 0; xx < SCALE; xx += 1) {
          const sx = x * SCALE + xx;
          const sy = y * SCALE + yy;
          scaled[sy * WIDTH + sx] = color;
        }
      }
    }
  }
  return scaled;
}

function createBaseFrame() {
  return new Uint8Array(SMALL_SIZE * SMALL_SIZE).fill(TRANSPARENT_INDEX);
}

function createRunnerFrame(phase) {
  const frame = createBaseFrame();

  const bob = phase % 2 === 0 ? 0 : 1;
  const torsoY = 5 + bob;

  drawOutlineRect(frame, 7, 2 + bob, 4, 4, SKIN);
  setPixel(frame, 11, 3 + bob, ACCENT);

  drawOutlineRect(frame, 6, torsoY + 3, 6, 5, SHIRT);
  drawRect(frame, 8, torsoY + 4, 2, 1, ACCENT);
  drawOutlineRect(frame, 7, torsoY + 8, 4, 3, SHORTS);

  const armFrames = [
    {
      front: [[11, torsoY + 4], [12, torsoY + 5], [13, torsoY + 6]],
      back: [[6, torsoY + 4], [5, torsoY + 3], [4, torsoY + 2]],
    },
    {
      front: [[11, torsoY + 4], [12, torsoY + 4], [13, torsoY + 3]],
      back: [[6, torsoY + 4], [5, torsoY + 5], [4, torsoY + 6]],
    },
    {
      front: [[11, torsoY + 4], [12, torsoY + 3], [13, torsoY + 2]],
      back: [[6, torsoY + 4], [5, torsoY + 5], [4, torsoY + 6]],
    },
    {
      front: [[11, torsoY + 4], [12, torsoY + 5], [13, torsoY + 6]],
      back: [[6, torsoY + 4], [5, torsoY + 4], [4, torsoY + 3]],
    },
    {
      front: [[11, torsoY + 4], [12, torsoY + 5], [13, torsoY + 5]],
      back: [[6, torsoY + 4], [5, torsoY + 3], [4, torsoY + 2]],
    },
    {
      front: [[11, torsoY + 4], [12, torsoY + 3], [13, torsoY + 3]],
      back: [[6, torsoY + 4], [5, torsoY + 5], [4, torsoY + 5]],
    },
  ];

  const legFrames = [
    {
      front: [[10, torsoY + 10], [11, torsoY + 11], [12, torsoY + 12], [13, torsoY + 12]],
      back: [[8, torsoY + 10], [7, torsoY + 11], [6, torsoY + 12], [5, torsoY + 12]],
    },
    {
      front: [[10, torsoY + 10], [11, torsoY + 11], [11, torsoY + 12], [11, torsoY + 13]],
      back: [[8, torsoY + 10], [7, torsoY + 11], [7, torsoY + 12], [6, torsoY + 13]],
    },
    {
      front: [[10, torsoY + 10], [11, torsoY + 11], [12, torsoY + 11], [13, torsoY + 10]],
      back: [[8, torsoY + 10], [7, torsoY + 11], [6, torsoY + 12], [5, torsoY + 13]],
    },
    {
      front: [[10, torsoY + 10], [11, torsoY + 11], [12, torsoY + 12], [13, torsoY + 13]],
      back: [[8, torsoY + 10], [7, torsoY + 11], [7, torsoY + 12], [7, torsoY + 13]],
    },
    {
      front: [[10, torsoY + 10], [11, torsoY + 11], [12, torsoY + 12], [13, torsoY + 12]],
      back: [[8, torsoY + 10], [7, torsoY + 11], [6, torsoY + 11], [5, torsoY + 10]],
    },
    {
      front: [[10, torsoY + 10], [11, torsoY + 11], [11, torsoY + 12], [12, torsoY + 13]],
      back: [[8, torsoY + 10], [7, torsoY + 11], [6, torsoY + 12], [5, torsoY + 13]],
    },
  ];

  const armPose = armFrames[phase];
  const legPose = legFrames[phase];

  drawLine(frame, armPose.front, SKIN);
  drawLine(frame, armPose.back, SKIN);
  drawLine(frame, legPose.front.slice(0, 3), SHORTS);
  drawLine(frame, legPose.back.slice(0, 3), SHORTS);
  setPixel(frame, legPose.front[3][0], legPose.front[3][1], SHOE);
  setPixel(frame, legPose.back[3][0], legPose.back[3][1], SHOE);

  setPixel(frame, 3 - (phase % 2), 12, SPARK);
  setPixel(frame, 2 + (phase % 2), 13, ACCENT);
  setPixel(frame, 14, 3 + ((phase + 1) % 2), SPARK);

  return scaleFrame(frame);
}

function packColorTable() {
  const table = Buffer.alloc(256 * 3, 0);
  PALETTE.forEach((rgb, index) => {
    table[index * 3] = rgb[0];
    table[index * 3 + 1] = rgb[1];
    table[index * 3 + 2] = rgb[2];
  });
  return table;
}

function lzwEncode(indices, minCodeSize) {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  let codeSize = minCodeSize + 1;

  const bytes = [];
  let bitBuffer = 0;
  let bitCount = 0;

  const writeCode = (code) => {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      bytes.push(bitBuffer & 0xff);
      bitBuffer >>= 8;
      bitCount -= 8;
    }
  };

  const resetDictionary = () => {
    const dictionary = new Map();
    for (let i = 0; i < clearCode; i += 1) {
      dictionary.set(String(i), i);
    }
    return {
      dictionary,
      nextCode: endCode + 1,
    };
  };

  let { dictionary, nextCode } = resetDictionary();

  writeCode(clearCode);

  let sequence = String(indices[0]);
  for (let i = 1; i < indices.length; i += 1) {
    const symbol = String(indices[i]);
    const candidate = `${sequence},${symbol}`;
    if (dictionary.has(candidate)) {
      sequence = candidate;
      continue;
    }

    writeCode(dictionary.get(sequence));
    dictionary.set(candidate, nextCode);
    nextCode += 1;

    if (nextCode === (1 << codeSize) && codeSize < 12) {
      codeSize += 1;
    } else if (nextCode >= 4096) {
      writeCode(clearCode);
      ({ dictionary, nextCode } = resetDictionary());
      codeSize = minCodeSize + 1;
    }

    sequence = symbol;
  }

  writeCode(dictionary.get(sequence));
  writeCode(endCode);

  if (bitCount > 0) {
    bytes.push(bitBuffer & 0xff);
  }

  const subBlocks = [];
  for (let i = 0; i < bytes.length; i += 255) {
    const chunk = bytes.slice(i, i + 255);
    subBlocks.push(Buffer.from([chunk.length]));
    subBlocks.push(Buffer.from(chunk));
  }
  subBlocks.push(Buffer.from([0]));
  return Buffer.concat(subBlocks);
}

function buildFrame(framePixels) {
  const graphicControl = Buffer.from([
    0x21, 0xf9, 0x04,
    0x05,
    FRAME_DELAY_CS & 0xff,
    (FRAME_DELAY_CS >> 8) & 0xff,
    TRANSPARENT_INDEX,
    0x00,
  ]);

  const imageDescriptor = Buffer.from([
    0x2c,
    0x00, 0x00,
    0x00, 0x00,
    WIDTH & 0xff,
    (WIDTH >> 8) & 0xff,
    HEIGHT & 0xff,
    (HEIGHT >> 8) & 0xff,
    0x00,
  ]);

  const minCodeSize = 3;
  const imageData = lzwEncode(framePixels, minCodeSize);

  return Buffer.concat([
    graphicControl,
    imageDescriptor,
    Buffer.from([minCodeSize]),
    imageData,
  ]);
}

function buildGif(frames) {
  const header = Buffer.from('GIF89a', 'ascii');
  const logicalScreenDescriptor = Buffer.from([
    WIDTH & 0xff,
    (WIDTH >> 8) & 0xff,
    HEIGHT & 0xff,
    (HEIGHT >> 8) & 0xff,
    0xf7,
    0x00,
    0x00,
  ]);

  const applicationExtension = Buffer.from([
    0x21, 0xff, 0x0b,
    0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30,
    0x03, 0x01,
    0x00, 0x00,
    0x00,
  ]);

  return Buffer.concat([
    header,
    logicalScreenDescriptor,
    packColorTable(),
    applicationExtension,
    ...frames.map(buildFrame),
    Buffer.from([0x3b]),
  ]);
}

const frames = Array.from({ length: 6 }, (_, index) => createRunnerFrame(index));
const gif = buildGif(frames);
fs.writeFileSync(OUTPUT_PATH, gif);
console.log(`Wrote ${OUTPUT_PATH}`);
