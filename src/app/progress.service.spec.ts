import { TestBed } from '@angular/core/testing';
import { PROGRESS_STORAGE_KEY, ProgressService } from './progress.service';

describe('ProgressService', () => {
  beforeEach(() => localStorage.clear());

  it('records a run and keeps the best score', () => {
    const service = TestBed.inject(ProgressService);
    service.record('lesson-01', 15, 20);
    service.record('lesson-01', 10, 20);

    expect(service.get('lesson-01')).toMatchObject({ attempts: 2, bestPercent: 75, lastPercent: 50 });
  });

  it('persists to localStorage and restores it', () => {
    TestBed.inject(ProgressService).record('lesson-01', 20, 20);
    expect(JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY)!)['lesson-01'].bestPercent).toBe(100);

    TestBed.resetTestingModule();
    expect(TestBed.inject(ProgressService).get('lesson-01')?.bestPercent).toBe(100);
  });

  it('ignores corrupt stored data', () => {
    localStorage.setItem(PROGRESS_STORAGE_KEY, '{not json');
    expect(TestBed.inject(ProgressService).get('lesson-01')).toBeUndefined();
  });
});
