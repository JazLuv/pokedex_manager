import './globals.css';

export const metadata = {
  title: 'POKEDEX MANAGER',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}