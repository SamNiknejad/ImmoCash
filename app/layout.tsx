import type { Metadata, Viewport } from 'next';
import './globals.css';

const base = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, '') || '';

export const metadata: Metadata = {
  title: 'ImmoCash | Immobilien klar kalkulieren',
  description: 'Deutscher Immobilien-Investment-Rechner: Cashflow, Hausgeld, Finanzierung, Steuern, Risikoszenarien und Prognosen – vollständig lokal.',
  icons: { icon: `${base}/assets/icon.svg` }
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#f5f8fb' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="de"><body>{children}</body></html>;
}
