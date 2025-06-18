'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';

// Fix for default markers
const icon = new Icon({
	iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
	iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
	shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
	iconSize: [25, 41],
	iconAnchor: [12, 41],
	popupAnchor: [1, -34],
	shadowSize: [41, 41]
});

interface LocationData {
	nom_ville: string;
	latitude: number | null;
	longitude: number | null;
	population: number | null;
	departement: string;
	region: string;
}

interface DynamicMapContentProps {
	data: LocationData;
}

export default function DynamicMapContent({ data }: DynamicMapContentProps) {
	if (!data.latitude || !data.longitude) {
		return (
			<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
				<h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Location Map</h3>
				<div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
					<p className="text-gray-500 dark:text-gray-400">Location coordinates not available</p>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
			<h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Location Map</h3>
			<div className="h-64 rounded-lg overflow-hidden">
				<MapContainer
					center={[data.latitude, data.longitude]}
					zoom={13}
					scrollWheelZoom={false}
					style={{ height: '100%', width: '100%' }}
				>
					<TileLayer
						attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
						url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
					/>
					<Marker position={[data.latitude, data.longitude]} icon={icon}>
						<Popup>
							<div className="p-2">
								<h4 className="font-semibold">{data.nom_ville}</h4>
								<p className="text-sm">{data.departement}, {data.region}</p>
								{data.population && (
									<p className="text-sm">Population: {data.population.toLocaleString()}</p>
								)}
							</div>
						</Popup>
					</Marker>
				</MapContainer>
			</div>
		</div>
	);
}
