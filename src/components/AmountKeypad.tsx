"use client";
import { useRef, useState } from "react";
import { X } from "lucide-react";

interface Props {
  initial: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
  onChange?: (value: string) => void;
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

const isOperator = (k: string) => k === "+" || k === "-" || k === "×" || k === "÷";

export default function AmountKeypad({ initial, onCancel, onConfirm, onChange }: Props) {
  const [expr, setExpr] = useState(initial);
  const exprRef = useRef(expr);
  exprRef.current = expr;
  const holdTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  function update(next: string) {
    setExpr(next);
    onChange?.(next);
  }

  function backspace() {
    update(exprRef.current.slice(0, -1));
  }

  function startBackspaceHold() {
    holdTimeout.current = setTimeout(() => {
      holdInterval.current = setInterval(backspace, 80);
    }, 400);
  }

  function stopBackspaceHold() {
    if (holdTimeout.current) clearTimeout(holdTimeout.current);
    if (holdInterval.current) clearInterval(holdInterval.current);
    holdTimeout.current = null;
    holdInterval.current = null;
  }

  function press(key: string) {
    if (key === "⌫") {
      backspace();
      return;
    }
    if (key === "=") {
      update(evaluate(expr));
      return;
    }
    if (isOperator(key)) {
      // if there's already a pending operator chain, resolve it first
      if (/[+\-×÷]$/.test(expr)) update(expr.slice(0, -1) + key);
      else if (expr) update(expr + key);
      return;
    }
    update(expr + key);
  }

  function confirm() {
    const final = evaluate(expr);
    update(final);
    onConfirm(final);
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end">
      <div className="flex-1" onClick={onCancel} />

      <div className="bg-[#2c2c2e] rounded-t-2xl flex flex-col shrink-0 shadow-2xl h-[440px] relative">
        <div className="w-9 h-1 rounded-full bg-white/20 absolute left-1/2 -translate-x-1/2 top-1.5" />

        <div className="flex items-center justify-end px-4 pt-4 pb-2">
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-200 shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center gap-px bg-white/5">
          {KEYS.map((row, i) => (
            <div key={i} className="grid grid-cols-4 gap-px">
              {row.map((k) => (
                <button
                  key={k}
                  onClick={() => press(k)}
                  onPointerDown={k === "⌫" ? startBackspaceHold : undefined}
                  onPointerUp={k === "⌫" ? stopBackspaceHold : undefined}
                  onPointerLeave={k === "⌫" ? stopBackspaceHold : undefined}
                  style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
                  className={`h-[4.5rem] text-lg flex items-center justify-center select-none touch-none ${
                    isOperator(k)
                      ? "bg-[#2c2c2e] text-blue-400 font-medium"
                      : k === "⌫"
                      ? "bg-[#2c2c2e] text-gray-300"
                      : "bg-[#1c1c1e] text-white"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          ))}
          <div className="grid grid-cols-4 gap-px">
            <div className="bg-[#2c2c2e]" />
            <button
              onClick={() => press("0")}
              style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
              className="h-[4.5rem] text-lg flex items-center justify-center bg-[#1c1c1e] text-white select-none touch-none"
            >
              0
            </button>
            <div className="bg-[#2c2c2e]" />
            <button
              onClick={confirm}
              style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
              className="h-[4.5rem] text-base font-bold flex items-center justify-center bg-red-500 text-white select-none touch-none"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
