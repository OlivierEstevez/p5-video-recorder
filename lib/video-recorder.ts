import p5 from 'p5';
import { FFmpeg } from '@ffmpeg/ffmpeg';

export default class VideoRecorder {
  private ffmpeg = new FFmpeg();

  private s : p5 | null = null;

  private framerate: number;
  private recording: boolean = false;
  private capturingDiv: HTMLDivElement = document.createElement('div');
  private rawFrames: { frame: HTMLCanvasElement; currentFrame: number; }[] = [];
  private frames : Array<Uint8Array> = [];

  constructor(s?: p5, framerate?: number) {
    this.s = s || (window as any).p5;
    
    if (framerate === undefined) {
      console.warn("VideoRecorder:", "Framerate not defined. Defaulting to 60 FPS.");
      this.framerate = 60;
    } else {
      this.framerate = framerate;
    }
    
    this.capturingDiv.id = "capturingDiv";
    document.body.appendChild(this.capturingDiv);  
  }

  async setupFFmpeg() {
    if (!this.ffmpeg.loaded) {
      await this.ffmpeg.load({
        coreURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js",
      });
    }
    this.ffmpeg.on('log', ({ message }) => console.log(message));
    this.ffmpeg.on('progress', ({ progress, time }) => console.log(progress, time));
  }

  startRecording() {
    if (this.s) {
      console.log("Recording");
      this.capturingDiv.classList.toggle('visible');
      this.capturingDiv.innerHTML = "Capturing..."

      this.recording = true;
    } else {
      console.error("p5 instance is null. Cannot initialize.");
    }
  }

  captureFrame() {
    if (this.s) {
      const frame = (this.s.get(0, 0, this.s.width, this.s.height) as any).canvas;
      this.rawFrames.push({frame, currentFrame: this.s.frameCount});
  
      console.log("Captured frame", this.rawFrames.length);
    } else {
      console.error("p5 instance is null. Cannot capture frame.");
    }
  }


  async endRecording() {
    if (this.recording) {
      console.log('End recording');
      this.recording = false;
      
      this.capturingDiv.innerHTML = "Converting to Unit8..."
      
      const framePromises = this.rawFrames.map((frame, i) => {
        return new Promise<Uint8Array>((resolve) => {
          frame.frame.toBlob(async (blob : Blob | null) => {
            if(blob)
              {const buffer = new Uint8Array(await blob.arrayBuffer());
              resolve(buffer);
              console.log("Converted frame to Uint8Array", i);
            }
          }, 'image/png');
        });
      });
      
      
      Promise.all(framePromises).then((convertedFrames) => {
        this.frames = convertedFrames;
        this.encode();
      });
    } else {
      console.error("Cannot end recording when not recording");
    }
  }

  async encode(){
    await this.setupFFmpeg();

    this.capturingDiv.innerHTML = "Converting to PNGs..."
    
    this.frames.forEach((frame, index) => {
      console.log("Writing frame", index);
      this.ffmpeg.writeFile(`frame_${index}.png`, frame);
    });

    this.capturingDiv.innerHTML = "Converting to video..."

    const frameInputPattern = 'frame_%d.png';
    await this.ffmpeg.exec([
      '-framerate', String(this.framerate),
      '-i', frameInputPattern,
      // '-pix_fmt', 'yuv420p',
      "-vcodec", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le",
      'output.mov',
    ]);

    const output = await this.ffmpeg.readFile('output.mov');

    const blob = new Blob([output], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'output.mov';
    a.click();
    a.remove();

    this.capturingDiv.innerHTML = "Done!"
    this.capturingDiv.style.backgroundColor = "#00ff00"
    this.capturingDiv.style.color = "#000000"

    URL.revokeObjectURL(url);

    this.frames.forEach((_, index) => this.ffmpeg.deleteFile(`frame_${index}.png`));
  }

  isRecording() {
    return this.recording;
  }
}