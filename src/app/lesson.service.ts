import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { parseLesson } from './lesson-validation';
import { Lesson, LessonSummary } from './models';

const LESSON_ID = /^[a-z0-9-]+$/;

@Injectable({ providedIn: 'root' })
export class LessonService {
  private readonly http = inject(HttpClient);

  list(): Promise<LessonSummary[]> {
    return firstValueFrom(this.http.get<LessonSummary[]>('lessons/index.json'));
  }

  async load(id: string): Promise<Lesson> {
    if (!LESSON_ID.test(id)) {
      throw new Error(`Ungültige Lektions-ID "${id}".`);
    }
    return parseLesson(await firstValueFrom(this.http.get<unknown>(`lessons/${id}.json`)));
  }
}
