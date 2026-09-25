import { Routes } from '@angular/router';
import { Home } from './pages/home';

export const routes: Routes = [
  { path: '', component: Home, title: 'SloBuddy' },
  {
    path: 'lesson/:id',
    loadComponent: () => import('./pages/lesson-page').then((module) => module.LessonPage),
    title: 'Lektion – SloBuddy',
  },
  { path: '**', redirectTo: '' },
];
