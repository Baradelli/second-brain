import type { Capture } from '../../domain/capture.js';

export interface CaptureRepository {
  save(capture: Capture): Promise<Capture>;
}
