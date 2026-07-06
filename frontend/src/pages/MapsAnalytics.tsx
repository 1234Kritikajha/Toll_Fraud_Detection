import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, Map as MapIcon, RadioTower } from "lucide-react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { fetchDashboard, fetchMapMarkers } from "../services/api";
import { Card } from "../components/ui/Card";

export function MapsAnalytics() {
  const { data: markers = [], isLoading, error } = useQuery({ queryKey: ["map-markers"], queryFn: fetchMapMarkers });
  const { data: dashboard } = useQuery({ queryKey: ["dashboard"], queryFn: fetchDashboard });

  if (isLoading) return <div className="text-sm text-slate-500">Loading map data...</div>;
  if (error) return <div className="text-sm text-red-600">Map API is not available.</div>;

  const fraudMetric = dashboard?.metrics.find((metric) => metric.label === "Fraud Alerts")?.value ?? "0";
  const transactionMetric = dashboard?.metrics.find((metric) => metric.label === "Transactions")?.value ?? "0";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Configured Plazas" value={String(markers.length)} icon={RadioTower} />
        <Metric label="Transactions" value={transactionMetric} icon={Activity} />
        <Metric label="Fraud Alerts" value={fraudMetric} icon={AlertTriangle} />
        <Metric label="Map Source" value="Database" icon={MapIcon} />
      </section>

      <Card className="p-3">
        <h3 className="mb-2 text-sm font-bold">Toll Plaza Map From Your Database</h3>
        {markers.length ? (
          <div className="h-[420px] overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            <MapContainer center={[22.9734, 78.6569]} zoom={5} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
              <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {markers.map((marker) => (
                <CircleMarker
                  key={marker.name}
                  center={marker.position}
                  radius={8 + Math.min(marker.risk, 100) / 8}
                  pathOptions={{
                    color: marker.risk > 80 ? "#dc2626" : marker.risk > 50 ? "#f59e0b" : "#0f766e",
                    fillOpacity: 0.35,
                    weight: 1,
                  }}
                >
                  <Popup>
                    <strong>{marker.name}</strong>
                    <br />
                    {marker.state}
                    <br />
                    Risk: {marker.risk}
                    <br />
                    Transactions: {marker.transactions}
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        ) : (
          <div className="flex min-h-[320px] items-center justify-center rounded border border-dashed border-slate-200 text-sm text-slate-400">
            No plaza coordinates found in your database.
          </div>
        )}
      </Card>
    </motion.div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof MapIcon }) {
  return (
    <Card className="p-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600">
        <Icon size={16} />
      </div>
      <p className="mt-2 text-xl font-bold">{value}</p>
      <p className="text-[11px] font-semibold text-slate-500">{label}</p>
    </Card>
  );
}
