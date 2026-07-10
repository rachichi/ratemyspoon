// Shim for @mediapipe/hands — only needed by hand-pose-detection's mediapipe
// runtime, which we don't use (we use runtime: "tfjs"). Exporting a no-op class
// satisfies the static import without breaking the tfjs runtime path.
export class Hands {}
export class Camera {}
export const VERSION = "0.4.0";
