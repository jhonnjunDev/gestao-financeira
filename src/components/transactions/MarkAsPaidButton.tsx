"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";

export function MarkAsPaidButton({ transactionId, status }: { transactionId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (status === "PAID") {
    return <span className="badge bg-emerald-50 text-emerald-700">Pago</span>;
  }

  async function markPaid() {
    setLoading(true);
    try {
      await fetch(`/api/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID", paymentDate: new Date().toISOString() }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={markPaid}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50"
      title="Marcar como pago"
    >
      <CheckCircle className="w-3.5 h-3.5" />
      {loading ? "..." : "Pagar"}
    </button>
  );
}