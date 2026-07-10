// Stub: OpenCV.js contour detection + pixel-to-cm calibration
// Uses a reference object of known size in frame to calibrate measurements.
// Returns bowl diameter (cm) and handle length (cm).

export interface SpoonMeasurements {
  bowlDiameterCm: number;
  handleLengthCm: number;
}

export async function measureSpoon(_imageData: ImageData): Promise<SpoonMeasurements> {
  // TODO: load opencv.js, find spoon contour, calibrate via reference object
  return { bowlDiameterCm: 4.5, handleLengthCm: 16 };
}
