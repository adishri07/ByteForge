// Page frame used by every screen.
// Owner: Member 5
import type { Metadata } from "next";
import type { ReactNode } from "react";
import NavBar from "../components/NavBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "BrandProof — check content before it's published",
  description: "Checks posts, ads, emails and documents against your brand rules, approved facts and terminology, with cited fixes and human approval.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <NavBar />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-slate-500">
          BrandProof by Team ByteForge · Demo brand &quot;BrightPath Learning&quot; is fictional · AI checks use Google Gemini; every AI finding must cite a
          brand rule or approved fact.
        </footer>
      </body>
    </html>
  );
}
