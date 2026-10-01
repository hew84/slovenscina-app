import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { App } from './app';

describe('App', () => {
  let versionUpdates: Subject<VersionEvent>;

  beforeEach(async () => {
    versionUpdates = new Subject();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), { provide: SwUpdate, useValue: { versionUpdates } }],
    }).compileComponents();
  });

  it('shows a prominent update banner once a new version is ready, and hides it on "Später"', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.update')).toBeNull();

    versionUpdates.next({ type: 'VERSION_DETECTED', version: { hash: 'b' } });
    await fixture.whenStable();
    expect(element.querySelector('.update')).toBeNull();

    versionUpdates.next({ type: 'VERSION_READY', currentVersion: { hash: 'a' }, latestVersion: { hash: 'b' } });
    await fixture.whenStable();
    expect(element.querySelector('.update')?.textContent).toContain('Neue Version verfügbar');

    [...element.querySelectorAll('button')].find((button) => button.textContent?.includes('Später'))!.click();
    await fixture.whenStable();
    expect(element.querySelector('.update')).toBeNull();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show the app name in the toolbar', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('mat-toolbar')?.textContent).toContain('SloBuddy');
  });
});
