'use client';

import { useEffect, useState } from 'react';

/**
 * Next.js wird statisch exportiert. Die Finanz-Engine, Navigation und Exporte
 * werden ausschließlich nach dem Hydratisieren im Browser geladen.
 * Die Berechnungsbibliothek ist unabhängig von der Next.js-Oberfläche testbar.
 */
export default function Home() {
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    import('../legacy/app.js').catch((reason: unknown) => {
      if (live) setError(reason instanceof Error ? reason.message : 'Anwendung konnte nicht geladen werden');
    });
    return () => { live = false; };
  }, []);

  return <>
    <div id="app" suppressHydrationWarning>
      <div style={{ margin: 'min(15vh, 80px) auto', maxWidth: 520, padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        {error ? <><h1>ImmoCash</h1><p>Fehler: {error}</p><p>Bitte Browser aktualisieren und lokale JavaScript-Einstellungen überprüfen.</p></> : <p>ImmoCash wird geladen …</p>}
      </div>
    </div>
  </>;
}
