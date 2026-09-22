import '@/styles/globals.css';
import type { Metadata } from 'next';
import { Space_Grotesk, Manrope } from 'next/font/google';
import { NavbarWrapper } from '@/components/layout/NavbarWrapper';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });

export const metadata: Metadata = {
  title: 'Digital Heroes | Golf Performance & Charity',
  description: 'Track your golf performance and support incredible charities simultaneously with Digital Heroes.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${spaceGrotesk.variable} ${manrope.variable} font-sans min-h-screen bg-brand-bg text-brand-text antialiased flex flex-col selection:bg-brand-primary selection:text-white`}>
        <NavbarWrapper />
        <div className="flex-1 flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
