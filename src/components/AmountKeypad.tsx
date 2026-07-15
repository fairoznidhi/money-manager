"use client";
import { useState } from "react";
import { X, Globe } from "lucide-react";

interface Props {
  initial: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}

const KEYS = [
  ["+", "-", "×", "÷"],
  ["7", "8", "9", "="],
  ["4", "5", "6", "."],
  ["1", "2", "3", "⌫"],
];

// Evaluates a plain +-×÷ arithmetic expression left-to-right with normal
// operator precedence, no parentheses (matches what the keypad can type).
function evaluate(expr: string): string {
  const normalized = expr.replace(/×/g, "*").replace(/÷/g, "/");
  if (!/^[0-9.+\-*/]+$/.test(normalized)) return expr;
  try {
    const tokens = normalized.match(/(\d+\.?\d*|[+\-*/])/g);
    if (!tokens) return expr;
    // first pass: * and /
    const pass1: (string | number)[] = [Number(tokens[0])];
    for (let i = 1; i < tokens.length; i += 2) {
      const op = tokens[i];
      const num = Number(tokens[i + 1]);
      if (num === undefined || Number.isNaN(num)) return expr;
      if (op === "*" || op === "/") {
        const prev = pass1.pop() as number;
        pass1.push(op === "*" ? prev * num : prev / num);
      } else {
        pass1.push(op, num);
      }
    }
    // second pass: + and -
    let result = pass1[0] as number;
    for (let i = 1; i < pass1.length; i += 2) {
      const op = pass1[i];
      const num = pass1[i + 1] as number;
      result = op === "+" ? result + num : result - num;
    }
    if (!Number.isFinite(result)) return expr;
    return String(Math.round(result * 100) / 100);
  } catch {
    return expr;
  }
}

export default function AmountKeypad({ initial, onCancel, onConfirm }: Props) {
  const [expr, setExpr] = useState(initial);

  function press(key: string) {
    if (key === "⌫") {
      setExpr((e) => e.slice(0, -1));
      return;
    }
    if (key === "=") {
      setExpr((e) => evaluate(e));
      return;
    }
    setExpr((e) => e + key);
  }

  function confirm() {
    const final = evaluate(expr);
    onConfirm(final);
  }

  return (
    <div className="absolute inset-0 z-30 bg-[#1c1c1e] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#2c2c2e] shrink-0">
        <h2 className="text-lg text-gray-200">Amount</h2>
        <div className="flex items-center gap-4">
          <Globe size={18} className="text-gray-400" />
          <button onClick={onCancel} className="text-gray-300">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="px-5 py-6 text-right">
        <span className="text-3xl text-white font-light break-all">{expr || "0"}</span>
      </div>

      <div className="flex-1 grid grid-rows-5 gap-px bg-white/5">
        {KEYS.map((row, i) => (
          <div key={i} className="grid grid-cols-4 gap-px">
            {row.map((k) => (
              <button
                key={k}
                onClick={() => press(k)}
                className="bg-[#1c1c1e] text-white text-2xl flex items-center justify-center hover:bg-white/5"
              >
                {k}
              </button>
            ))}
          </div>
        ))}
        <div className="grid grid-cols-4 gap-px">
          <div className="col-span-2 bg-[#1c1c1e]" />
          <button
            onClick={() => press("0")}
            className="bg-[#1c1c1e] text-white text-2xl flex items-center justify-center hover:bg-white/5"
          >
            0
          </button>
          <button
            onClick={confirm}
            className="bg-red-500 text-white text-xl font-bold flex items-center justify-center hover:bg-red-600"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
