import './style.css';
import p5 from 'p5';
import { FFmpeg } from '@ffmpeg/ffmpeg';

const ffmpeg = new FFmpeg();

const durationInSecs = 1;
const frameRate = 60;
const frameWidth = 800;
const frameHeight = 800;
let frames = [];
let rawFrames = [];
let capturing = false;

async function setupFFmpeg() {
  if (!ffmpeg.loaded) {
    await ffmpeg.load({
      coreURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js",
    });
  }
  ffmpeg.on('log', ({ message }) => console.log(message));
}

async function startCapture() {
  capturing = true;

  const capturingDiv = document.createElement('div');
  capturingDiv.innerHTML = "Capturing..."
  capturingDiv.style.position = "absolute"
  capturingDiv.style.left = "0px"
  capturingDiv.style.color = "white"
  capturingDiv.style.backgroundColor = "#565656"
  capturingDiv.style.padding = "8px 16px"
  capturingDiv.style.borderRadius = "999px"
  document.body.appendChild(capturingDiv)
}

async function finishCapture() {
  capturing = false;
  await setupFFmpeg();

  console.log("=== Converting frames to video...");

  frames.forEach((frame, index) => {
    console.log("Writing frame", index);
    ffmpeg.writeFile(`frame_${index}.png`, frame);
  });

  console.log(await ffmpeg.listDir("/"));
  
  console.log("=== Writing frames done");

  const frameInputPattern = 'frame_%d.png';  // Image pattern for frames
  await ffmpeg.exec([
    '-framerate', String(frameRate),      // Set frame rate
    '-i', frameInputPattern,              // Input pattern
    // '-pix_fmt', 'yuv420p',                // Video pixel format
    "-vcodec", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le",
    'output.mov',                         // Output file
  ]);

  const output = await ffmpeg.readFile('output.mov');

  const blob = new Blob([output.buffer], { type: 'video/mp4' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'output.mov';
  a.click();

  URL.revokeObjectURL(url);

  frames.forEach((_, index) => ffmpeg.deleteFile(`frame_${index}.png`));
}

const sketch = (s) => {
  s.setup = () => {
    s.frameRate(frameRate);
    s.createCanvas(frameWidth, frameHeight);
    s.noStroke();
    startCapture();  // Start capturing frames
  };

  s.draw = () => {
    const currentFrame = s.frameCount;

    s.background(120);
    s.fill(255, 0, 0);
    s.rect(currentFrame % s.width, 0, 150, 250);

    s.fill(0);
    s.textSize(24);
    s.text(currentFrame, 500, 240);

    // Capture the current frame as an image if capturing is enabled
    if (capturing) {
      const frame = s.get(0, 0, frameWidth, frameHeight).canvas;
      // frame.toBlob(async (blob) => {
      //   frames.push(new Uint8Array(await blob.arrayBuffer()));
      // }, 'image/png');
      rawFrames.push({frame, currentFrame})
      console.log("Captured frame", rawFrames.length);
      
    }

    // Stop capturing after the duration has passed
    if (currentFrame >= durationInSecs * frameRate) {

      s.noLoop();
      console.log("=== initializing conversion to Uint8Array");

      const framePromises = rawFrames.map((frame, i) => {
        return new Promise((resolve) => {
          frame.frame.toBlob(async (blob) => {
            const buffer = new Uint8Array(await blob.arrayBuffer());
            resolve(buffer);
            console.log("Converted frame to Uint8Array", i);
            
          }, 'image/png');
        });
      });
      
      // Once all frames are converted to Uint8Array, store them in the frames array
      Promise.all(framePromises).then((convertedFrames) => {
        frames = convertedFrames;  // Now frames array is populated with all frame data
        finishCapture();
      });
      
    }
  };
};

// Start p5 sketch
new p5(sketch, document.body);