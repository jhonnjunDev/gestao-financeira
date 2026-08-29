"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export function ImportButton({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; duplicates: number; duplicateExamples?: string[] } | null>(null);
  const [error, setError] = useState("");

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setError("");

    // Ler prévia
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result || "");
      setPreview(text.split(/\r?\n/).slice(0, 5));
    };
    reader.readAsText(f);
  }

  async function upload() {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("accountId", accountId);
      formData.append("file", file);
      const res = await fetch("/gestao/api/import", { method: "POST", body: formData });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Erro na importação");
      setResult(json.data);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Upload className="w-4 h-4" /> Importar
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Importar lançamentos (XLSX/CSV)" size="md">
        <div className="space-y-5">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
            <p className="font-medium mb-1">Formatos aceitos:</p>
            <ul className="list-disc list-inside text-xs space-y-1">
              <li>Arquivo <b>.csv</b> ou <b>.xlsx</b> com cabeçalho na primeira linha</li>
              <li>Colunas obrigatórias: <b>descricao</b>, <b>valor</b></li>
              <li>Opcionais: <b>tipo</b> (receita/despesa), <b>data</b>, <b>categoria</b>, <b>fornecedor</b>, <b>vencimento</b>, <b>documento</b></li>
              <li>Valor no formato brasileiro (1234,56) ou americano (1234.56)</li>
              <li>Lançamentos duplicados são identificados e ignorados</li>
            </ul>
          </div>

          <label className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-brand-500 hover:bg-brand-50/30 transition-colors">
            <FileSpreadsheet className="w-8 h-8 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">
              {file ? file.name : "Selecionar arquivo"}
            </span>
            <span className="text-xs text-gray-400">
              {file ? `${(file.size / 1024).toFixed(1)} KB` : "Clique para escolher"}
            </span>
            <input type="file" accept=".csv,.xlsx" className="hidden" onChange={handleFile} />
          </label>

          {preview.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Prévia:</p>
              <pre className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 overflow-x-auto border border-gray-200">
                {preview.join("\n")}
              </pre>
            </div>
          )}

          {result && (
            <div className={`rounded-xl p-4 text-sm ${result.created > 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`}>
              <div className="flex items-center gap-2 font-medium mb-2">
                <CheckCircle2 className="w-4 h-4" />
                Importação concluída
              </div>
              <ul className="text-xs space-y-1">
                <li>{result.created} lançamentos criados</li>
                <li>{result.skipped} ignorados (inválidos ou duplicados)</li>
                {result.duplicates > 0 && (
                  <li className="flex items-center gap-1 text-amber-700">
                    <AlertTriangle className="w-3 h-3" /> {result.duplicates} duplicados detectados
                    {result.duplicateExamples?.length ? `: ${result.duplicateExamples.join(", ")}` : ""}
                  </li>
                )}
              </ul>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Fechar</Button>
            <Button onClick={upload} disabled={!file} loading={uploading}>
              <Upload className="w-4 h-4" /> Importar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}