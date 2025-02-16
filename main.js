import './style.css';
import p5 from 'p5';
import { FFmpeg } from '@ffmpeg/ffmpeg';

const ffmpeg = new FFmpeg();

const durationInSecs = 5;
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
  ffmpeg.on('progress', ({ progress, time }) => console.log(progress, time));
}

async function startCapture() {
  capturing = true;

  const capturingDiv = document.createElement('div');
  capturingDiv.id = "capturingDiv"
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

  document.getElementById("capturingDiv").innerHTML = "Converting to PNGs..."

  frames.forEach((frame, index) => {
    console.log("Writing frame", index);
    ffmpeg.writeFile(`frame_${index}.png`, frame);
  });


  document.getElementById("capturingDiv").innerHTML = "Converting to video..."
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

  capturingDiv.innerHTML = "Done!"
  capturingDiv.style.backgroundColor = "#00ff00"
  capturingDiv.style.color = "#000000"

  URL.revokeObjectURL(url);

  frames.forEach((_, index) => ffmpeg.deleteFile(`frame_${index}.png`));
}

const sketch = (s) => {
  let circles = [];
  const numCircles = 1000;

  s.setup = () => {
    s.frameRate(frameRate);
    s.createCanvas(frameWidth, frameHeight);
    s.noStroke();

    // Initialize circles with random positions, colors, and velocities
    for (let i = 0; i < numCircles; i++) {
      circles.push({
        x: s.random(frameWidth),
        y: s.random(frameHeight),
        color: s.color(s.random(255), s.random(255), s.random(255)),
        xVelocity: s.random(-2, 2),
        yVelocity: s.random(-2, 2),
      });
    }
  };

  s.draw = () => {
    const currentFrame = s.frameCount;

    if(currentFrame === 30) {
      startCapture();
    }

    s.background(120);
    
    // Draw and update each circle
    for (let i = 0; i < numCircles; i++) {
      s.fill(circles[i].color);
      s.ellipse(circles[i].x, circles[i].y, 20, 20); // Draw circle

      // Update position
      circles[i].x += circles[i].xVelocity;
      circles[i].y += circles[i].yVelocity;

      // Bounce off the walls
      if (circles[i].x < 0 || circles[i].x > frameWidth) {
        circles[i].xVelocity *= -1;
      }
      if (circles[i].y < 0 || circles[i].y > frameHeight) {
        circles[i].yVelocity *= -1;
      }
    }

    // Capture the current frame as an image if capturing is enabled
    if (capturing) {
      const frame = s.get(0, 0, frameWidth, frameHeight).canvas;
      rawFrames.push({frame, currentFrame})
      console.log("Captured frame", rawFrames.length);
      
    }

    // Stop capturing after the duration has passed
    if (capturing && currentFrame >= durationInSecs * frameRate) {

      s.noLoop();
      console.log("=== initializing conversion to Uint8Array");
      document.getElementById("capturingDiv").innerHTML = "Converting to Unit8..."

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