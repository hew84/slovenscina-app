# SloBuddy

Slowenisch lernen (Deutsch → Slowenisch, Niveau A1) als installierbare Angular-PWA.
Übungstypen: Vokabelkarten, Lückentexte, Übersetzung eintippen. Der Fortschritt wird lokal im Gerät gespeichert, es gibt kein Backend.

## Entwickeln

```bash
npm install
npm start          # Dev-Server auf http://localhost:4200 (ohne Service Worker)
npm test           # Unit-Tests (Vitest)
npm run build      # Production-Build nach dist/slovenscina-app/browser
```

**PWA und Offline testen:** Der Service Worker läuft nur im Production-Build.

```bash
npm run build
npx http-server dist/slovenscina-app/browser -p 8080 -c-1
```

Dann `http://localhost:8080` in Chrome öffnen, ca. 30 Sekunden warten (der Service Worker registriert sich erst, wenn die App stabil ist), den Server stoppen und die Seite neu laden. Sie muss weiter funktionieren.

## Lektionen schreiben

Lektionen liegen in `public/lessons/`:

- `index.json`: Liste aller Lektionen für die Übersicht (`id`, `title`, `level`, `description`)
- `<id>.json`: die Lektion selbst, z. B. `lesson-01.json`

Neue Lektion: Datei anlegen und in `index.json` eintragen. Die `id` muss dem Dateinamen entsprechen (nur `a-z`, `0-9`, `-`).
`schema/lesson.schema.json` liefert in VS Code Autovervollständigung und Fehlermeldungen. Zusätzlich prüft die App jede Lektion beim Laden und zeigt Fehler im Klartext an.

```jsonc
{
  "$schema": "../../schema/lesson.schema.json",
  "id": "lesson-01",
  "title": "Begrüßung & Vorstellung",
  "level": "A1",
  "description": "Optional, erscheint in der Übersicht.",
  "vocabulary": [
    { "id": "v-hvala", "sl": "Hvala", "de": "Danke", "note": "Optionaler Hinweis" }
  ],
  "exercises": [
    // Karteikarte: zeigt de, dreht auf sl um
    { "id": "f1", "type": "flashcard", "vocabId": "v-hvala" },

    // Lückentext: {{0}}, {{1}} … sind die Lücken.
    // "answers" hat pro Lücke eine Liste erlaubter Schreibweisen.
    { "id": "c1", "type": "cloze", "text": "Jaz {{0}} iz {{1}}.",
      "answers": [["sem"], ["Nemčije"]], "translation": "Ich bin aus Deutschland." },

    // Übersetzung: de → sl. Die erste Antwort wird als Lösung angezeigt.
    { "id": "t1", "type": "translate", "prompt": "Danke", "answers": ["Hvala"] }
  ]
}
```

Die Übungen laufen in der Reihenfolge von `exercises`. Jede `id` muss innerhalb der Lektion eindeutig sein.

### Regeln für die Antwortprüfung

Es gilt die **exakte Schreibweise**: Groß-/Kleinschreibung, `č š ž` und Satzzeichen müssen stimmen. Nur unsichtbare Unterschiede werden ignoriert (Leerzeichen am Rand, doppelte Leerzeichen und die Unicode-Schreibweise von `č`).

- Satzzeichen gehören zur Antwort. Soll `Kako si` genauso gelten wie `Kako si?`, trage beide in `answers` ein.
- Bei einer falschen Antwort weist die App darauf hin, wenn sie nur an Groß-/Kleinschreibung oder Sonderzeichen scheiterte. Bewertet wird trotzdem streng.
- Die Prüfung steht in `src/app/answer.ts`.

## Sprachausgabe

Die App liest Slowenisch mit den Stimmen des Geräts vor (Web Speech API). Der Lautsprecher-Button erscheint nur, wenn das Gerät eine slowenische Stimme hat. Android/Chrome hat meist eine, unter Windows und iOS muss ggf. ein Sprachpaket installiert sein.

## Hosting

Die PWA braucht **HTTPS** (außer auf `localhost`). Der Build ist rein statisch, jeder Static-Host reicht (Netlify, Cloudflare Pages, GitHub Pages, eigener Server).

- Unbekannte Pfade müssen auf `index.html` zeigen (SPA-Fallback), damit Direktlinks wie `/lesson/lesson-01` funktionieren. Bei Netlify und Cloudflare Pages ist eine Datei `_redirects` mit `/* /index.html 200` nötig.
- Liegt die App in einem Unterpfad (z. B. GitHub Pages unter `/slovenscina-app/`), muss beim Build `--base-href /slovenscina-app/` gesetzt werden. Bei GitHub Pages zusätzlich `404.html` als Kopie von `index.html` ablegen. `scope` und `start_url` im Manifest sind bereits relativ.
- Neue Lektionen kommen nach einem Deployment über den Service Worker an. Die App zeigt „Neue Version verfügbar“ und lädt auf Klick neu.

## Struktur

```
public/lessons/      Lerninhalte (JSON)
schema/              JSON-Schema für den Editor
src/app/answer.ts    exakte Antwortprüfung
src/app/lesson-*.ts  Laden und Validieren der Lektionen
src/app/exercises/   Flashcard, Cloze, Translate
src/app/pages/       Übersicht und Lektionsablauf
```
