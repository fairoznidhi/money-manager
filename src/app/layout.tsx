import type { Metadata } from "next";
import "./globals.css";
import { AppDataProvider } from "@/lib/AppDataContext";
import BottomTabBar from "@/components/BottomTabBar";
import Toast from "@/components/Toast";

export const metadata: Metadata = {
  title: "Money Manager",
  description: "Track your monthly income and expenses",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#1c1c1e] text-white pb-24">
        <AppDataProvider>
          {children}
          <BottomTabBar />
          <Toast />
        </AppDataProvider>
      </body>
    </html>
  );
}
