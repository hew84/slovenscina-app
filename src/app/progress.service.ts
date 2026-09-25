import { Injectable, signal } from '@angular/core';

export const PROGRESS_STORAGE_KEY = 'slobuddy.progress.v1';

export interface LessonProgress {
  attempts: number;
  bestPercent: number;
  lastPercent: number;
  lastPlayed: string;
}

type ProgressMap = Record<string, LessonProgress>;

@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly state = signal<ProgressMap>(this.read());

  get(lessonId: string): LessonProgress | undefined {
    return this.state()[lessonId];
  }

  /** Stores the result of a full run through a lesson. */
  record(lessonId: string, correct: number, total: number): void {
    const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
    const previous = this.state()[lessonId];
    const next: ProgressMap = {
      ...this.state(),
      [lessonId]: {
        attempts: (previous?.attempts ?? 0) + 1,
        bestPercent: Math.max(previous?.bestPercent ?? 0, percent),
        lastPercent: percent,
        lastPlayed: new Date().toISOString(),
      },
    };
    this.state.set(next);
    this.write(next);
  }

  // Storage can be missing or throw (private mode, blocked site data): the app must work without it.
  private read(): ProgressMap {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) ?? '{}');
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        ? (parsed as ProgressMap)
        : {};
    } catch {
      return {};
    }
  }

  private write(value: ProgressMap): void {
    try {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(value));
    } catch {
      // Progress stays in memory for this session.
    }
  }
}
