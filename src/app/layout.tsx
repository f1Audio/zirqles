import type { Metadata } from "next";
import "./globals.css";
import { Providers } from '@/components/providers/Providers'
import { AuthProvider } from '@/lib/auth'
import { Toaster } from 'sonner'
import { StreamChatProvider } from '@/contexts/StreamChatContext'

export const metadata: Metadata = {
  title: "Zirqles",
  description: "Zirqles is a social media platform for sharing thoughts, ideas, and experiences.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <StreamChatProvider>
          <Providers>
            <AuthProvider>
              {children}
            </AuthProvider>
            <Toaster />
          </Providers>
        </StreamChatProvider>
      </body>
    </html>
  );
}

