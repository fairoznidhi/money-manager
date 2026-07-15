"use client";
import { useAppData } from "@/lib/AppDataContext";

export default function Toast() {
  const { toast } = useAppData();
  if (!toast) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#3a3a3c] text-white px-6 py-4 rounded-2xl text-xl shadow-xl z-50 whitespace-nowrap">
      {toast}
    </div>
  );
}
