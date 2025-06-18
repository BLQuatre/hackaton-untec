'use client';

import { useEffect, useState } from 'react';
import { MapPin, ExternalLink } from 'lucide-react';

interface LocationData {
	nom_ville: string | null;
	latitude: number | null;
	longitude: number | null;
	population: number | null;
	departement: string | null;
	region: string | null;
}

interface MapComponentProps {
	data: LocationData;
}

export function MapComponent({ data }: MapComponentProps) {
	const [mapUrl, setMapUrl] = useState<string>('');

	useEffect(() => {
		if (data.latitude && data.longitude) {
			// Create OpenStreetMap URL
			const osmUrl = `https://www.openstreetmap.org/#map=15/${data.latitude}/${data.longitude}`;
			setMapUrl(osmUrl);
		}
	}, [data.latitude, data.longitude]);

	if (!data.latitude || !data.longitude) {
		return (
			<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
				<h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
					<MapPin className="h-5 w-5 mr-2" />
					Location Map
				</h3>
				<div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
					<p className="text-gray-500 dark:text-gray-400">Location coordinates not available</p>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
			<h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
				<MapPin className="h-5 w-5 mr-2" />
				Location Map
			</h3>

			<div className="space-y-4">
				{/* Coordinates Display */}
				<div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
					<h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Coordinates</h4>
					<div className="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span className="text-blue-700 dark:text-blue-300 font-medium">Latitude:</span>
							<p className="text-blue-800 dark:text-blue-200">{data.latitude.toFixed(6)}</p>
						</div>
						<div>
							<span className="text-blue-700 dark:text-blue-300 font-medium">Longitude:</span>
							<p className="text-blue-800 dark:text-blue-200">{data.longitude.toFixed(6)}</p>
						</div>
					</div>
				</div>

				{/* Static Map Placeholder */}
				<div className="h-48 bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
					<div className="text-center">
						<MapPin className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
						<p className="text-gray-600 dark:text-gray-400 font-medium">{data.nom_ville}</p>
						<p className="text-sm text-gray-500 dark:text-gray-500">{data.departement}, {data.region}</p>
					</div>
				</div>

				{/* External Map Link */}
				{mapUrl && (
					<div className="flex justify-center">
						<a
							href={mapUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
						>
							<ExternalLink className="h-4 w-4 mr-2" />
							View on OpenStreetMap
						</a>
					</div>
				)}
			</div>
		</div>
	);
}
