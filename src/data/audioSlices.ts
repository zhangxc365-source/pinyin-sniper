export interface Slice {
  file: string;
  start: number;
  duration: number;
}

export interface AudioSlices {
  [word: string]: {
    male?: Slice;
    female?: Slice;
  };
}

export const AUDIO_SLICES: AudioSlices = {
  // This will be populated by the AudioAnalyzer utility
};
