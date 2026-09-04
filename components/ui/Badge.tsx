const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  issued: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  issued: "Dikeluarkan",
  rejected: "Ditolak",
};

export default function Badge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        STATUS_STYLES[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
