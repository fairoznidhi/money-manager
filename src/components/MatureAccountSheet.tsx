"use client";
import { useState } from "react";
import { ChevronLeft, X } from "lucide-react";
import { Account, fmtUSD, todayStr } from "@/lib/supabase";
import AmountKeypad from "@/components/AmountKeypad";
import DatePicker from "@/components/DatePicker";

interface Props {
  account: Account;
  balance: number;
  destinationOptions: Account[];
  onClose: () => void;
  onSubmit: (values: {
    destinationAccountId: number;
    principal: number;
    interest: number;
    occurredAt: string;
  }) => Promise<void>;
}

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${days[d.getDay()]}, ${dd}/${mm}/${yyyy}`;
}

export default function MatureAccountSheet({
  account,
  balance,
  destinationOptions,
  onClose,
  onSubmit,
}: Props) {
  const [destinationAccountId, setDestinationAccountId] = useState<number | null>(
    destinationOptions[0]?.id ?? null,
  );
  const [principal, setPrincipal] = useState(String(balance));
  const [interest, setInterest] = useState("0");
  const [date, setDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);

  const [showPrincipalKeypad, setShowPrincipalKeypad] = useState(false);
  const [showInterestKeypad, setShowInterestKeypad] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const selectedDestination = destinationOptions.find((a) => a.id === destinationAccountId);
  const total = (parseFloat(principal) || 0) + (parseFloat(interest) || 0);
  const canSave = !!destinationAccountId && total > 0;

  async function handleConfirm() {
    if (!destinationAccountId || !canSave || saving) return;
    setSaving(true);
    try {
      await onSubmit({
        destinationAccountId,
        principal: parseFloat(principal) || 0,
        interest: parseFloat(interest) || 0,
        occurredAt: date,
      });
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#1c1c1e] text-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <button onClick={onClose} className="flex items-center gap-0.5 text-gray-300">
          <ChevronLeft size={22} />
          <span className="text-base">Accounts</span>
        </button>
        <h1 className="text-lg font-semibold">Mature {account.name}</h1>
        <div className="w-14" />
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        <p className="text-sm text-gray-400 py-3">
          Transfers the principal and interest to another account, then
          removes {account.name} from your account list.
        </p>

        <Row label="Date" onClick={() => setShowDatePicker(true)}>
          <span className="text-base text-white">{fmtDate(date)}</span>
        </Row>

        <Row label="Transfer to" onClick={() => setShowAccountPicker(true)}>
          <span className="text-base text-white">
            {selectedDestination?.name ?? <span className="text-gray-600">Select</span>}
          </span>
        </Row>

        <Row label="Principal" onClick={() => setShowPrincipalKeypad(true)}>
          <span className="text-base text-white">
            {principal || <span className="text-gray-600">0</span>}
          </span>
        </Row>

        <Row label="Interest" onClick={() => setShowInterestKeypad(true)}>
          <span className="text-base text-white">
            {interest || <span className="text-gray-600">0</span>}
          </span>
        </Row>

        <Row label="Total">
          <span className="text-base text-white">{fmtUSD(total)}</span>
        </Row>

        <div className="py-6">
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!canSave || saving}
            className="w-full py-3.5 rounded-xl bg-blue-600 text-white text-base font-bold disabled:opacity-40"
          >
            {saving ? "Saving..." : "Mature account"}
          </button>
        </div>
      </div>

      {showPrincipalKeypad && (
        <AmountKeypad
          initial={principal}
          onCancel={() => setShowPrincipalKeypad(false)}
          onConfirm={(val) => { setPrincipal(val); setShowPrincipalKeypad(false); }}
        />
      )}

      {showInterestKeypad && (
        <AmountKeypad
          initial={interest}
          onCancel={() => setShowInterestKeypad(false)}
          onConfirm={(val) => { setInterest(val); setShowInterestKeypad(false); }}
        />
      )}

      {showDatePicker && (
        <DatePicker
          initial={date}
          onCancel={() => setShowDatePicker(false)}
          onConfirm={(iso) => { setDate(iso); setShowDatePicker(false); }}
        />
      )}

      {showAccountPicker && (
        <div className="absolute inset-0 z-10 bg-[#1c1c1e] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0 bg-[#2c2c2e]">
            <h2 className="text-lg text-gray-200">Transfer to</h2>
            <button onClick={() => setShowAccountPicker(false)} className="text-gray-300">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {destinationOptions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No other active account to transfer into.
              </p>
            ) : (
              <div className="grid grid-cols-3">
                {destinationOptions.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => { setDestinationAccountId(a.id); setShowAccountPicker(false); }}
                    className="flex items-center justify-center py-6 border-b border-r border-white/5 text-sm text-gray-200 text-center px-2"
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showConfirm && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 px-4"
          onClick={() => { if (!saving) setShowConfirm(false); }}
        >
          <div
            className="bg-[#2c2c2e] rounded-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">Confirm maturity</h3>

            <div className="mb-5 space-y-2.5">
              <ConfirmRow label="From" value={account.name} />
              <ConfirmRow label="To" value={selectedDestination?.name ?? "-"} />
              <ConfirmRow label="Date" value={fmtDate(date)} />
              <ConfirmRow label="Principal" value={fmtUSD(parseFloat(principal) || 0)} />
              <ConfirmRow label="Interest" value={fmtUSD(parseFloat(interest) || 0)} />
              <div className="pt-2 border-t border-white/10">
                <ConfirmRow label="Total" value={fmtUSD(total)} emphasize />
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-5">
              {account.name} will be removed from your account list after this.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={saving}
                className="px-4 py-2.5 rounded-lg border border-white/15 text-gray-300 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="px-4 py-2.5 rounded-lg bg-blue-600 text-white font-bold disabled:opacity-40"
              >
                {saving ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfirmRow({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={`text-base ${emphasize ? "font-bold text-white" : "text-gray-200"}`}>
        {value}
      </span>
    </div>
  );
}

function Row({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className="w-full flex items-center justify-between py-3.5 border-b border-white/10 text-left"
    >
      <span className="text-gray-400 text-base">{label}</span>
      <div className="flex-1 max-w-[65%] text-right">{children}</div>
    </Tag>
  );
}
