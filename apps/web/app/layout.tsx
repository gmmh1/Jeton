import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'Jeton Cargo Control Tower',
  description: 'Booking, tracking, and operations portal for Jeton Cargo.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
