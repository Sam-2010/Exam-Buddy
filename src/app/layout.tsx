import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Exam Buddy | AI Study & Interview Coach",
  description: "An adaptive, AI-powered study and mock interview assistant using Gemini and Supabase.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
