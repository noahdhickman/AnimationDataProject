export interface AnimationManifest {
  id: string;
  name: string;
  description?: string;
  frames: number;
  fps: number;
  generator: string;
  replications: string[];
}

export interface SharedVisualConfig {
  [x: string]: any;
  theme: string;
  loop: boolean;
  speedMultiplier: number;
}

export interface Resource {
  id: string;
  type: string;
  path: string;
}
