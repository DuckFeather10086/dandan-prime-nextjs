import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { NavbarProvider } from "@/context/NavbarContext";

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
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}>
        <NavbarProvider>
          <div className="sticky top-0 z-50 bg-base-100 dark:bg-gray-800">
            <Navbar />
          </div>
          <main className="flex-1 w-full">
            {children}
          </main>
        </NavbarProvider>
      </body>
    </html>
  );
}
