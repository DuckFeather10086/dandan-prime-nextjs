import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { NavbarProvider } from "@/context/NavbarContext";
import { Toaster } from 'react-hot-toast';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "DanDan Prime",
  description: "DanDan Prime",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NavbarProvider>
          <a className="skip-link" href="#main-content">跳到主要内容</a>
          <header className="sticky top-0 z-50"><Navbar /></header>
          <main id="main-content" className="app-main">
            {children}
          </main>
          <Toaster position="bottom-center" toastOptions={{ style: { background: '#1f2937', color: '#ffffff' } }} />
        </NavbarProvider>
      </body>
    </html>
  );
}
