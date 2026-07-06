import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import type { TollMarker } from "../../types";

type IndiaNetworkMapProps = {
  markers: TollMarker[];
  compact?: boolean;
};

export function IndiaNetworkMap({ markers, compact = false }: IndiaNetworkMapProps) {
  return (
    <div className={compact ? "h-[300px] overflow-hidden rounded-lg" : "h-[420px] overflow-hidden rounded-lg"}>
      <MapContainer center={[22.9734, 78.6569]} zoom={compact ? 4 : 5} scrollWheelZoom={false} className="rounded-lg">
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((marker) => (
          <CircleMarker
            key={marker.name}
            center={marker.position}
            radius={Math.max(8, marker.risk / 7)}
            pathOptions={{
              color: marker.risk > 85 ? "#EF4444" : marker.risk > 70 ? "#F59E0B" : "#14B8A6",
              fillColor: marker.risk > 85 ? "#EF4444" : marker.risk > 70 ? "#F59E0B" : "#14B8A6",
              fillOpacity: 0.45,
              weight: 2,
            }}
          >
            <Popup>
              <strong>{marker.name}</strong>
              <br />
              {marker.state}
              <br />
              Risk score: {marker.risk}
              <br />
              Transactions: {marker.transactions}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
