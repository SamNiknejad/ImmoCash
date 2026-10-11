# ImmoCash

**Mobile-First-Investmentrechner für deutsche Eigentumswohnungen – ohne Backend und ohne Registrierung.**

Die Anwendung basiert auf **Next.js** mit `output: 'export'`. Die Finance-Engine, Berechnungen, Projekte und alle Exporte laufen ausschließlich im Browser. Für Betrieb und Veröffentlichung sind weder eine Datenbank noch API-Routen oder Serverfunktionen notwendig.

## Funktionsumfang

- 100-%, 110-%, frei gewählte sowie vollständige Finanzierung der ausgewählten Anschaffungskosten; mehrere Kreditbausteine
- Kaufkosten, Prozentsatz-/Euro-Modus bei Notar/Grundbuch/Makler, Liquiditätspuffer
- Monatschrittiger Annuitäten- und Sondertilgungsplan, Zinsbindung und Anschlussfinanzierung
- Kaltmiete, Mieten für Stellplatz/Extras, Vorauszahlungen, Leerstand und Zahlungsausfälle
- Einzelpositionen der Betriebskosten, Umlageanteile, WEG-Erhaltungsrücklage und Hausgeld-Kontrolle
- Tatsächliche Kontobewegung **getrennt** vom normalisierten Eigentümer-Cashflow und einer vereinfachten steuerlichen Simulation
- Steuer-AfA, Verlustverrechnungsvarianten, Break-even-Kaltmiete, maximaler Kaufpreis
- Jahresprognose, Finanzierungsdiagramme, Verkaufssimulation, vier Szenarien und Kauf-Checkliste
- Mehrere lokale Projekte; JSON-Import/-Export, CSV-Export von Jahresprognose/Tilgungsplan und direkter PDF-Bericht (jsPDF)
- Responsive Bedienung mit fünf Navigationsbereichen, Hell/Dunkel und deutschen Zahlenformaten

## Lokale Entwicklung

Node.js **20.9 oder neuer** empfohlen, Node.js 22 für die Deployment-Pipeline.

```bash
npm install
npm run dev
```

Lokale Adresse: <http://localhost:3000>.

Finanzmathematische Tests:

```bash
npm test
```

Produktions-Build für die **Root-Domain** (ohne Unterpfad):

```bash
NEXT_PUBLIC_BASE_PATH= npm run build
npm run preview
```

Die Ausgabe liegt im Verzeichnis `out/`. Es gibt **keinen benötigten Next.js-Server**; der lokale Python-Server zeigt nur statische Dateien an.

### Deployment unter einem Unterpfad lokal überprüfen

```bash
NEXT_PUBLIC_BASE_PATH=/ImmoCash npm run build
mkdir -p .preview/ImmoCash
cp -a out/. .preview/ImmoCash/
python3 -m http.server 4173 --directory .preview
```

Anschließend `http://localhost:4173/ImmoCash/` öffnen. Die Konfiguration des `basePath` erfolgt **zur Build-Zeit** (nicht erst zur Laufzeit).

## GitHub Pages – automatische Veröffentlichung

1. Diesen gesamten Projektordner als Inhalt eines GitHub-Repositories (z. B. `ImmoCash`) auf den Branch **`main`** hochladen. `app/`, `legacy/`, `public/`, `next.config.mjs`, `package.json` und `.github/workflows/pages.yml` müssen im Repository liegen.
2. Auf GitHub unter **Settings → Pages → Build and deployment → Source** die Option **GitHub Actions** wählen.
3. Bei jedem Push auf `main` bzw. bei `workflow_dispatch` startet der Workflow `.github/workflows/pages.yml` automatisch: Node.js einrichten → Abhängigkeiten installieren → Finanztests ausführen → `next build` → `.nojekyll` im `out/` erzeugen → `out/` mit `upload-pages-artifact@v3` hochladen → mit `deploy-pages@v4` veröffentlichen.
4. Für ein übliches Projekt-Repository `Benutzer/ImmoCash` setzt der Workflow den `NEXT_PUBLIC_BASE_PATH` auf `/ImmoCash`. Das Ergebnis ist unter `https://Benutzer.github.io/ImmoCash/` erreichbar.
5. Für ein User-/Organization-Repository `Benutzer/Benutzer.github.io` bleibt der `basePath` automatisch leer. Die Website liegt dann auf `https://Benutzer.github.io/`.

Für GitHub Pages muss die Verwendung von GitHub Actions in den Repository-Einstellungen zugelassen sein. Die Datei `.nojekyll` verhindert, dass der `_next`-Ordner von Jekyll ausgespart wird.

**Wichtig:** GitHub Pages bietet keine allgemeine SPA-Rewrite-Regel. ImmoCash verwendet daher bewusst nur die eine statisch generierte Next.js-Seite (`/`) und regelt die Navigation clientseitig. Es sind keine serverseitigen Routen, API-Endpunkte oder andere Rewrites nötig.

### Manuelle Basis-Pfad-Konfiguration

In `.env.local` kann z. B. `NEXT_PUBLIC_BASE_PATH=/anderer-projektname` gesetzt werden. Die `next.config.mjs` entfernt überflüssige Schrägstriche und konfiguriert zugleich `output: 'export'`, `trailingSlash: true` und `images.unoptimized: true`.

## Daten und Datenschutz

Alle Projekte bleiben standardmäßig im **localStorage des aktiven Browsers** (`immocash-v1`). Die App überträgt keine Immobilien- oder Finanzdaten an Backend-Dienste. Beim Wechsel oder Löschen von Browserdaten kann lokaler Inhalt verloren gehen; regelmäßigen JSON-Export als Sicherung verwenden.

Der PDF-Export generiert die Seiten im Browser mittels `jsPDF` und speichert die Datei ohne Server. Die CSV-Dateien enthalten ein UTF-8-BOM sowie Semikolon-Trennzeichen für deutsche Tabellenprogramme. Die JSON-Datei dient als lokale Datensicherung und kann wieder importiert werden.

## Architektur

```text
app/
  layout.tsx             Next.js App Router: Layout und Seitentitel
  page.tsx               Client-only-Einstieg der Rechneroberfläche
  globals.css            Mobile-First-Design und Druckstil
legacy/
  core.js                UI-unabhängige, deterministische Finanzberechnung
  data.js                Projektmodell, Standards, localStorage
  app.js                 Client-Navigation, Eingaben, SVG-Charts, Exporte
public/assets/icon.svg  statisches Icon
.github/workflows/pages.yml
next.config.mjs         statische Ausgabe und konfigurierbarer basePath
tests/finance.test.js   automatisierte Finanztests
```

Die Abhängigkeiten `next`, `react`, `react-dom` und `jspdf` werden beim Build paketiert. Für die **deployed** Anwendung gibt es keinen Node-Server.

## Fachliche Hinweise und Einschränkungen

Die Anwendung ist eine **unverbindliche Rechenhilfe**, keine Bankfinanzierungszusage oder Steuer-/Rechtsberatung. Steuerlich ist eine vereinfachte Modellierung implementiert; Sonder-AfA, monatliche AfA-Anteile im Anschaffungsjahr, tatsächliche Beschränkungen von Verlustverrechnung, CO₂-Kosten-Stufenmodelle und spezielle Förderregeln erfordern die Prüfung im Einzelfall. Mietsteigerung und Immobilienwertentwicklung sind nicht garantiert.

Ein fehlender Anschlusszinssatz darf nicht stillschweigend als kostenlose Finanzierung angenommen werden: Ab dem Ende der Zinsbindung wird die betroffene Langfristprognose als unvollständig gekennzeichnet. Die Umsatz- und steuerliche Behandlung von Betriebskostenvorauszahlungen kann von den tatsächlichen Abrechnungszeitpunkten abweichen. Der PDF-Bericht dokumentiert Modellannahmen, ersetzt aber kein Gutachten.

Das bestehende UI nutzt clientseitiges JavaScript innerhalb einer statisch exportierten Next.js-/React-/TypeScript-Shell. Formulare und Diagramme verwenden eigene browserseitige Komponenten statt shadcn/ui bzw. Recharts. Ein vollständiger Prüfprozess komplexer Sonderfälle ist weiterhin Aufgabe einer individuell validierten Fachanwendung.
