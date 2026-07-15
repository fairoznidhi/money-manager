"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { todayStr } from "@/lib/supabase";

interface Props {
  initial: string;
  onCancel: () => void;
  onConfirm: (iso: string) => void;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function toIso(y: number, m: number, d: number) {
  const mm = String(m + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

// Mon=0 .. Sun=6 offset for a JS Date.getDay() (Sun=0 .. Sat=6)
function mondayIndex(jsDay: number) {
  return (jsDay + 6) % 7;
}

export default function DatePicker({ initial, onCancel, onConfirm }: Props) {
  const initialDate = new Date(initial + "T00:00:00");
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  const today = todayStr();

  function changeMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  }

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
  const leadingBlanks = mondayIndex(firstOfMonth.getDay());

  const cells: { day: number; y: number; m: number; muted: boolean }[] = [];
  for (let i = leadingBlanks - 1; i >= 0; i--) {
    const m = viewMonth === 0 ? 11 : viewMonth - 1;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    cells.push({ day: daysInPrevMonth - i, y, m, muted: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, y: viewYear, m: viewMonth, muted: false });
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1];
    const nextDay = last.muted && last.m !== viewMonth ? last.day + 1 : 1;
    const m = viewMonth === 11 ? 0 : viewMonth + 1;
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    const isNext = !last.muted || last.m === viewMonth;
    cells.push({
      day: isNext ? cells.filter((c) => c.m === m && c.y === y).length + 1 : nextDay,
      y,
      m,
      muted: true,
    });
    if (cells.length >= 42) break;
  }

  return (
    <div className="absolute inset-0 z-10 bg-[#1c1c1e] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0 bg-[#2c2c2e]">
        <h2 className="text-lg text-gray-200">Date</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => onConfirm(today)}
            className="text-blue-400 text-base"
          >
            Today
          </button>
          <button onClick={onCancel} className="text-gray-300">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={() => changeMonth(-1)} className="text-gray-300 p-1">
          <ChevronLeft size={20} />
        </button>
        <span className="text-base font-medium text-white">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button onClick={() => changeMonth(1)} className="text-gray-300 p-1">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 px-2 text-center text-sm text-gray-400 pb-1">
        {WEEKDAYS.map((w, i) => (
          <span key={w} className={i === 5 ? "text-blue-400" : i === 6 ? "text-red-400" : ""}>
            {w}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 px-2">
        {cells.map((c, i) => {
          const iso = toIso(c.y, c.m, c.day);
          const isSelected = iso === initial;
          const isToday = iso === today;
          const weekday = i % 7;
          const weekendClass = c.muted
            ? "text-gray-700"
            : weekday === 5
              ? "text-blue-400"
              : weekday === 6
                ? "text-red-400"
                : "text-white";
          const circleClass = isSelected
            ? "bg-white text-black font-semibold"
            : isToday
              ? `border border-blue-400 ${weekendClass}`
              : weekendClass;
          return (
            <button
              key={i}
              onClick={() => onConfirm(iso)}
              className="aspect-square flex items-center justify-center"
            >
              <span
                className={`w-9 h-9 flex items-center justify-center rounded-full text-base ${circleClass}`}
              >
                {c.day}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
