import type { Capture } from '../../domain/capture.js';
import type { CaptureRepository } from '../ports/capture-repository.js';

export class CaptureRepositoryFake implements CaptureRepository {
  readonly saved: Capture[] = [];

  async save(capture: Capture): Promise<Capture> {
    this.saved.push(capture);
    return capture;
  }
}
