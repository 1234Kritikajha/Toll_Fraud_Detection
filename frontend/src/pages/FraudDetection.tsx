import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Cable, CarFront, Loader2, ScanLine, ShieldAlert, UploadCloud } from "lucide-react";
import { useState } from "react";
import { ChartFrame } from "../components/charts/ChartFrame";
import { FraudBarChart } from "../components/charts/FraudBarChart";
import { MetricCard } from "../components/cards/MetricCard";
import { HighRiskCasesTable } from "../components/tables/HighRiskCasesTable";
import { fetchFraud, uploadAndDetectPlate } from "../services/api";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

export function FraudDetection() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["fraud"], queryFn: fetchFraud });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [detectionResult, setDetectionResult] = useState<any>(null);

  const mutation = useMutation({
    mutationFn: (file: File) => uploadAndDetectPlate(file),
    onSuccess: (res) => {
      setDetectionResult(res);
      queryClient.invalidateQueries({ queryKey: ["fraud"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setDetectionResult(null);
  };

  if (!data) return <div className="text-sm text-slate-500">Loading fraud data...</div>;

  const icons = [Cable, ScanLine, CarFront, ShieldAlert];
  const metrics = data.categories.map((category, index) => {
    const tone: "red" | "amber" = category.name.toLowerCase().includes("tail") || category.name.toLowerCase().includes("black") ? "red" : "amber";
    return {
      label: category.name,
      value: `${category.value}%`,
      detail: "Share of saved alerts",
      tone,
      icon: icons[index % icons.length],
    };
  });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <Card className="p-4 border border-slate-200 dark:border-slate-800">
        <h3 className="mb-1 text-sm font-bold">Verify Plate With Your Trained Model</h3>
        <p className="mb-3 text-[11px] text-slate-400">Upload a vehicle image to run YOLO detection and OCR. Results are saved to your database.</p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="relative flex min-h-44 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white p-4 transition hover:border-teal-500 dark:border-slate-700 dark:bg-slate-900/50">
            <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
            {previewUrl ? (
              <img src={previewUrl} alt="Selected upload" className="max-h-40 rounded object-contain" />
            ) : (
              <div className="text-center">
                <UploadCloud className="mx-auto mb-2 text-slate-400" size={32} />
                <span className="block text-xs font-semibold text-slate-500">Click or drag an image here</span>
                <span className="mt-0.5 block text-[9px] text-slate-400">JPG and PNG supported</span>
              </div>
            )}
          </div>

          <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/50">
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase text-slate-400">Detection Results</h4>
              {mutation.isPending ? (
                <div className="flex flex-col items-center justify-center py-6">
                  <Loader2 className="mb-2 animate-spin text-teal-600" size={24} />
                  <span className="text-xs font-semibold text-slate-500">Running YOLO and OCR...</span>
                </div>
              ) : detectionResult ? (
                <div className="space-y-2 text-xs">
                  <ResultRow label="Plate Number" value={detectionResult.plate || "UNKNOWN"} strong />
                  <ResultRow label="YOLO Confidence" value={`${detectionResult.confidence}%`} />
                  <ResultRow label="Risk Assessment" value={`${detectionResult.risk_score}/100 (${detectionResult.category})`} />
                  <ResultRow label="Status Action" value={detectionResult.status} />
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">Upload an image and click Analyze to see trained-model output.</div>
              )}
            </div>

            <Button onClick={() => selectedFile && mutation.mutate(selectedFile)} disabled={!selectedFile || mutation.isPending} className="mt-2 h-8 w-full bg-teal-600 py-1.5 text-xs font-bold text-white">
              Analyze with YOLO Model
            </Button>
          </div>
        </div>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.length ? (
          metrics.map(({ icon, ...metric }) => <MetricCard key={metric.label} {...metric} icon={icon} />)
        ) : (
          <Card className="p-4 text-sm text-slate-400 sm:col-span-2 xl:col-span-5">No fraud alert categories found yet.</Card>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.2fr]">
        <ChartFrame title="Fraud Detection Trend" description="From saved transaction records" badge="Database">
          <FraudBarChart data={data.hourlyDetections} />
        </ChartFrame>
        <HighRiskCasesTable cases={data.cases} />
      </section>
    </motion.div>
  );
}

function ResultRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between border-b border-slate-100 pb-1.5 dark:border-slate-800">
      <span className="text-slate-400">{label}</span>
      <span className={strong ? "rounded bg-teal-500/10 px-2 py-0.5 font-mono text-sm font-bold" : "font-bold"}>{value}</span>
    </div>
  );
}
