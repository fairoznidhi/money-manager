export default function SummaryStat({
  label,
  value,
  colorClass = "text-white",
}: {
  label: string;
  value: React.ReactNode;
  colorClass?: string;
}) {
  return (
    <div>
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-sm font-semibold ${colorClass}`}>{value}</div>
    </div>
  );
}
