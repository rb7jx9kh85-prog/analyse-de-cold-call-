import Link from "next/link";
import type { CallRecord } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

export function CallListItem({ call }: { call: CallRecord }) {
  return (
    <Link
      href={`/call/${call.id}`}
      className="flex items-center justify-between border-b border-hair py-4 transition-colors duration-100 hover:bg-hair/20"
    >
      <div>
        <span className="block text-sm uppercase tracking-wide text-ink">{call.company ?? "Unknown company"}</span>
        <span className="label mt-1 block">{call.person ?? "—"}</span>
      </div>
      <div className="text-right">
        <span className="block text-sm text-ink">{call.threeTens.average.toFixed(1)} / 10</span>
        <span className="label mt-1 block">{formatDateTime(call.createdAt)}</span>
      </div>
    </Link>
  );
}
