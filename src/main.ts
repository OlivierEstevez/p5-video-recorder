import '../style.css';
import p5 from 'p5';
import VideoRecorder from "../lib/video-recorder"

const durationInSecs = 1;
const frameRate = 60;
const sketchWidth = 800;
const sketchHeight = 800;

const sketch = (s: p5) => {
  let circles : {x: number; y: number; color: p5.Color; xVelocity: number; yVelocity: number; }[] = [];
  const numCircles = 1000;

  const videoRecorder = new VideoRecorder({ buffer: s, framerate: frameRate, width: sketchWidth, height: sketchHeight });

  s.setup = () => {
    s.frameRate(frameRate);
    s.createCanvas(sketchWidth, sketchHeight);
    s.noStroke();

    // Initialize circles with random positions, colors, and velocities
    for (let i = 0; i < numCircles; i++) {
      circles.push({
        x: s.random(sketchWidth),
        y: s.random(sketchHeight),
        color: s.color(s.random(255), s.random(255), s.random(255)),
        xVelocity: s.random(-2, 2),
        yVelocity: s.random(-2, 2),
      });
    }
  };

  s.draw = () => {
    const currentFrame = s.frameCount;

    if(currentFrame === 30) {
      videoRecorder.startRecording();
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
      if (circles[i].x < 0 || circles[i].x > sketchWidth) {
        circles[i].xVelocity *= -1;
      }
      if (circles[i].y < 0 || circles[i].y > sketchHeight) {
        circles[i].yVelocity *= -1;
      }
    }

    // Capture the current frame as an image if capturing is enabled
    if (videoRecorder.isRecording()) {
      videoRecorder.captureFrame();
    }

    // Stop capturing after the duration has passed
    if (videoRecorder.isRecording() && currentFrame >= durationInSecs * frameRate) {
      s.noLoop();
      videoRecorder.endRecording();
    }
  };
};

// Start p5 sketch
new p5(sketch, document.body);