// app/layout.tsx
import "./globals.css";

export const metadata = {
  title: "Restaurant Demo",
  description: "A demo restaurant web app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased font-sans bg-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}

