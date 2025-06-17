"use client"

import type React from "react"
import Image from "next/image"

import { useState, useEffect, useRef } from "react"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, Moon, Sun, Search, ArrowLeft, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { useLanguage } from "@/contexts/LanguageContext"

interface Coords {
	lat: number
	lon: number
}

interface LocationData {
	nom_ville: string
	type_commune: string
	code_postal: string
	code_insee: string
	population: number | null
	superficie_km2: number | null
	densite: number | null
	departement: string
	region: string
	latitude: number | null
	longitude: number | null
	type_ville: string
	nbr_unemployed: number | null
	unemployment_commune: string
	job_offers: number | null
	job_offer_department: string
}

interface AutocompleteSuggestion {
	id: number
	type: "city" | "street" | "landmark" | "coordinates"
	fullAddress: string
	coordinates?: Coords
}

// App states
type AppState = "search" | "loading" | "results"
// Search methods
type SearchMethod = "address" | "coordinates"

export default function HackathonApp() {
	const { t } = useLanguage()

	// App state management
	const [appState, setAppState] = useState<AppState>("search")
	const [darkMode, setDarkMode] = useState(false)
	const [searchMethod, setSearchMethod] = useState<SearchMethod>("address")

	// Search data
	const [coords, setCoords] = useState<Coords | null>(null)
	const [address, setAddress] = useState("")

	const [locationData, setLocationData] = useState<LocationData | null>(null)
	const [error, setError] = useState("")

	const [latInput, setLatInput] = useState("")
	const [lonInput, setLonInput] = useState("")

	// Autocomplete state
	const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([])
	const [showSuggestions, setShowSuggestions] = useState(false)
	const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
	const inputRef = useRef<HTMLInputElement>(null)
	const suggestionsRef = useRef<HTMLDivElement>(null)

	// Toggle dark mode
	const toggleDarkMode = () => {
		setDarkMode(!darkMode)
	}

	// Apply dark mode class to document
	useEffect(() => {
		if (darkMode) {
			document.documentElement.classList.add("dark")
		} else {
			document.documentElement.classList.remove("dark")
		}
	}, [darkMode])

	const handleChangeSearchMethod = (method: SearchMethod) => {
		setSearchMethod(method)
		setCoords(null)
		setAddress("")
		setSuggestions([])
		setShowSuggestions(false)
		setSelectedSuggestionIndex(-1)
	}

	// Handle input change and show suggestions
	const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value.replace(/[^a-zA-Z0-9\s]/g, '')
		setAddress(value)

		if (address !== value)
			setCoords(null)
		setSelectedSuggestionIndex(-1)

		if (value.length < 5) {
			setSuggestions([])
			setShowSuggestions(false)
			return
		}

		setTimeout(async () => {
			const response = await axios.get(`https://data.geopf.fr/geocodage/completion?text=${value}`)
			if (response.status !== 200 || !response.data) {
				setSuggestions([])
				setShowSuggestions(false)
				return
			}

			if (!response.data || !response.data.results || response.data.results.length === 0) {
				setSuggestions([])
				setShowSuggestions(false)
				return
			}
			const data = response.data.results

			const suggestions = []
			for (let i = 0; i < Math.min(data.length, 10); i++) {
				const feature = data[i]

				if (feature.kind !== "housenumber" && feature.kind !== "street")
					continue

				console.log("Feature:", feature)

				suggestions.push({
					id: i,
					fullAddress: feature.fulltext,
					type: feature.kind,
					coordinates: {
						lat: feature.x,
						lon: feature.y,
					},
				})
			}
			setSuggestions(suggestions)
			setShowSuggestions(true)
		}, 1000)
	}

	// Handle suggestion selection
	const handleSuggestionSelect = (suggestion: AutocompleteSuggestion) => {
		setAddress(suggestion.fullAddress)
		setShowSuggestions(false)
		setSuggestions([])

		if (suggestion.coordinates) {
			setCoords(suggestion.coordinates)
		}
	}

	// Close suggestions when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				suggestionsRef.current &&
				!suggestionsRef.current.contains(event.target as Node) &&
				inputRef.current &&
				!inputRef.current.contains(event.target as Node)
			) {
				setShowSuggestions(false)
			}
		}

		document.addEventListener("mousedown", handleClickOutside)
		return () => document.removeEventListener("mousedown", handleClickOutside)
	}, [])

	const handleCoordsInputChange = (e: React.ChangeEvent<HTMLInputElement>, setFun: (value: React.SetStateAction<string>) => void) => {
		setFun(e.target.value);
		const lat = parseFloat(latInput);
		const lon = parseFloat(lonInput);
		setCoords(!isNaN(lat) && !isNaN(lon) ? { lat, lon } : null);
	}
	// Handle search
	const handleSearch = async () => {
		if (!coords && !address.trim()) return

		setAppState("loading")
		setError("")
		setShowSuggestions(false)

		try {
			const requestData: any = {}

			if (coords) {
				requestData.coordinates = coords
			}

			if (address.trim()) {
				requestData.address = address.trim()
			}

			const response = await axios.post("http://localhost:8000/api/search/", requestData)

			setLocationData(response.data)
			setAppState("results")
		} catch (err: any) {
			if (err.response?.data?.error) {
				setError(err.response.data.error)
			} else {
				setError("Failed to fetch location data")
			}
			setAppState("search")
			console.error(err)
		}

		setSelectedSuggestionIndex(-1)
		setShowSuggestions(false)
		setSuggestions([])
	}

	const getSuggestionIcon = (type: AutocompleteSuggestion["type"]) => {
		switch (type) {
			case "city":
				return "🏙️"
			case "street":
				return "🛣️"
			case "landmark":
				return "🏛️"
			case "coordinates":
				return "📍"
			default:
				return "📍"
		}
	}

	const resetSearch = () => {
		setAppState("search")
		setAddress("")
		setCoords(null)
		setSelectedSuggestionIndex(-1)
		setShowSuggestions(false)
		setSuggestions([])
		setLocationData(null)
		setError("")
		setSearchMethod("address")
		setLatInput("")
		setLonInput("")
	}

	return (
		<div
			className={`min-h-screen transition-all duration-300 ease-in-out relative overflow-hidden ${
				darkMode
					? "dark bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900"
					: "bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100"
			}`}
		>
			{/* Header */}
			<header className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-white/30 dark:border-gray-700/30 transition-all duration-500 animate-in slide-in-from-top-4 relative z-10 shadow-lg shadow-blue-500/5 dark:shadow-purple-500/10">
				{/* Subtle gradient overlay */}
				<div className="absolute inset-0 bg-gradient-to-r from-blue-50/30 via-purple-50/20 to-indigo-50/30 dark:from-blue-900/20 dark:via-purple-800/10 dark:to-indigo-900/20 pointer-events-none" />

				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 relative">
					<div className="flex items-center justify-between">
						{/* Logo and Title Section */}
						<div className="flex items-center space-x-3 group">
							<div className="relative group-hover:scale-105 transition-all duration-300">
								<Image
									src="/images/logo.png"
									alt="Logo"
									width={40}
									height={40}
									className="rounded-lg shadow-md group-hover:shadow-lg transition-all duration-300"
								/>
							</div>
							<div className="space-y-0.5">
								<h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent transition-all duration-300 group-hover:scale-105">
									{t('app.title')}
								</h1>
								<p className="text-xs text-gray-600 dark:text-gray-400 font-medium opacity-80 group-hover:opacity-100 transition-all duration-300">
									{t('app.description')}
								</p>
							</div>
						</div>

						{/* Controls Section */}
						<div className="flex items-center space-x-3">
							<div>
								<LanguageSwitcher />
							</div>

							<Button
								variant="outline"
								size="sm"
								onClick={toggleDarkMode}
								className="relative overflow-hidden bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/40 dark:border-gray-600/40 hover:border-blue-300 dark:hover:border-purple-400 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-purple-400 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/20 dark:hover:shadow-purple-500/20 cursor-pointer group"
							>
								<div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-all duration-300" />
								<div className="relative flex items-center justify-center">
									{darkMode ? (
										<Sun className="h-4 w-4 transition-all duration-300 group-hover:rotate-180 group-hover:scale-110" />
									) : (
										<Moon className="h-4 w-4 transition-all duration-300 group-hover:rotate-12 group-hover:scale-110" />
									)}
								</div>
							</Button>
						</div>
					</div>
				</div>
			</header>

			<main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
				{/* Search State */}
				{appState === "search" && (
					<div className="space-y-8 animate-in fade-in-0 duration-300">
						<div className="text-center animate-in slide-in-from-bottom-4 duration-300">
							<h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
								{t('search.title')}
							</h2>
							<p className="text-lg text-gray-600 dark:text-gray-300">
								{t('search.description')}
							</p>
						</div>

						<Card className="dark:bg-gray-800/80 bg-white/80 backdrop-blur-sm dark:border-gray-700/50 border-white/30 shadow-xl">
							<CardHeader>
								<CardTitle className="dark:text-white">Search Methods</CardTitle>
								<CardDescription className="dark:text-gray-300">
									Select how you'd like to search for locations
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Tabs
									value={searchMethod}
									onValueChange={(value) => handleChangeSearchMethod(value as SearchMethod)}
									className="transition-all duration-300"
								>
									<TabsList className="grid w-full grid-cols-2 transition-all duration-300">
										<TabsTrigger
											value="address"
											className="flex items-center space-x-2 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
										>
											<Search className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
											<span>{t('search.methods.address')}</span>
										</TabsTrigger>
										<TabsTrigger
											value="coordinates"
											className="flex items-center space-x-2 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
										>
											<MapPin className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
											<span>{t('search.methods.coordinates')}</span>
										</TabsTrigger>
									</TabsList>

									<TabsContent value="address" className="space-y-4 mt-6 animate-in slide-in-from-left-4 duration-300">
										<div className="relative">
											<Input
												ref={inputRef}
												type="text"
												placeholder={t('search.placeholder')}
												value={address}
												onChange={handleInputChange}
												onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
												className="w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white pr-10 text-lg py-6 transition-all duration-300 focus:scale-[1.02] focus:shadow-lg hover:shadow-md"
												autoComplete="off"
											/>
											<Search
												className={cn("absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 transition-all duration-300",
													coords ? "hover:text-primary hover:scale-[1.02] cursor-pointer" : "cursor-not-allowed"
												)}
												onClick={() => {
													if (coords) handleSearch();
												}}
											/>

											{/* Autocomplete Suggestions */}
											{showSuggestions && suggestions.length > 0 && (
												<div
													ref={suggestionsRef}
													className="absolute z-50 w-full mt-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-white/30 dark:border-gray-600/50 rounded-md shadow-xl max-h-64 overflow-y-auto animate-in slide-in-from-top-2 duration-300"
												>
													{suggestions.map((suggestion, index) => (
														<div
															key={suggestion.id}
															className={`px-4 py-3 cursor-pointer border-b dark:border-gray-700 last:border-b-0 transition-all duration-300 hover:bg-gray-200 dark:hover:bg-gray-700 ${
																index === selectedSuggestionIndex ? "bg-blue-50 dark:bg-blue-900/20 scale-[1.01]" : ""
															}`}
															style={{ animationDelay: `${index * 50}ms` }}
															onClick={() => handleSuggestionSelect(suggestion)}
														>
															<div className="flex items-center space-x-3">
																<span className="text-lg">{getSuggestionIcon(suggestion.type)}</span>
																<div className="flex-1 min-w-0">
																	<div className="font-medium text-gray-900 dark:text-white truncate">
																		{suggestion.fullAddress}
																	</div>
																</div>
																<div className="text-xs text-gray-400 dark:text-gray-500 capitalize">
																	{suggestion.type}
																</div>
															</div>
														</div>
													))}
												</div>
											)}
										</div>

										<div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
											<p>
												💡 <strong>Smart suggestions:</strong> Type partial names for instant results
											</p>
										</div>
									</TabsContent>

									<TabsContent value="coordinates" className="space-y-4 mt-6 animate-in slide-in-from-right-4 duration-300">
										<div className="grid grid-cols-2 gap-4">
											<div>
												<label htmlFor="latitude" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
													Latitude
												</label>
												<Input
													id="latitude"
													type="text"
													placeholder="e.g. 49.4944"
													value={latInput}
													onChange={(e) => handleCoordsInputChange(e, setLatInput)}
													className="w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white text-lg py-6 transition-all duration-300 focus:scale-[1.02] focus:shadow-lg hover:shadow-md"
												/>
											</div>
											<div>
												<label htmlFor="longitude" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
													Longitude
												</label>
												<Input
													id="longitude"
													type="text"
													placeholder="e.g. 0.1079"
													value={lonInput}
													onChange={(e) => handleCoordsInputChange(e, setLonInput)}
													className="w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white text-lg py-6 transition-all duration-300 focus:scale-[1.02] focus:shadow-lg hover:shadow-md"
												/>
											</div>
										</div>

										<div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
											<p>
												📍 <strong>Format:</strong> Enter decimal values (e.g., "49.4944" for latitude and "0.1079" for longitude)
											</p>
										</div>
									</TabsContent>
								</Tabs>

								{error && (
									<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mt-4">
										<p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
									</div>
								)}								<Button
									onClick={handleSearch}
									disabled={!coords && !address.trim()}
									className="w-full mt-6 py-6 text-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer hover:shadow-lg disabled:hover:scale-100 disabled:hover:shadow-none disabled:cursor-not-allowed"
									size="lg"
								>
									<Search className="h-5 w-5 mr-2 transition-transform duration-300 group-hover:rotate-12" />
									{t('search.button')}
								</Button>
							</CardContent>
						</Card>
					</div>
				)}

				{/* Loading State */}
				{appState === "loading" && (
					<div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-in fade-in-0 duration-300">
						<div className="relative animate-in zoom-in-50 duration-300">
							<Loader2 className="h-16 w-16 animate-spin text-blue-600 dark:text-blue-400" />
							<div className="absolute inset-0 rounded-full border-4 border-blue-200 dark:border-blue-800 animate-pulse"></div>
						</div>
						<div className="text-center space-y-2 animate-in slide-in-from-bottom-4 duration-300 delay-300">
							<h3 className="text-2xl font-semibold text-gray-900 dark:text-white animate-in slide-in-from-left-4 duration-300 delay-300">
								{t('loading')}
							</h3>
							<p className="text-gray-600 dark:text-gray-300 animate-in slide-in-from-right-4 duration-300 delay-300">
								{t('search.description')}
							</p>
						</div>
						<div className="flex space-x-1 animate-in slide-in-from-bottom-2 duration-300 delay-300">
							<div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
							<div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
							<div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
						</div>
					</div>
				)}

				{/* Results State */}
				{appState === "results" && locationData && (
					<div className="space-y-6 animate-in fade-in-0 duration-300">						<div className="flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
							<h2 className="text-3xl font-bold text-gray-900 dark:text-white animate-in slide-in-from-left-6 duration-300">
								{t('results.title')}
							</h2>
							<Button
								variant="outline"
								onClick={resetSearch}
								className="flex items-center space-x-2 transition-all hover:scale-105 hover:shadow-md cursor-pointer dark:text-white"
							>
								<ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
								<span>{t('results.back')}</span>
							</Button>
						</div>

						<Card className="dark:bg-gray-800/80 bg-white/80 backdrop-blur-sm dark:border-gray-700/50 border-white/30 shadow-xl animate-in slide-in-from-bottom-6 duration-300 hover:shadow-2xl transition-all">
							<CardHeader>
								<CardTitle className="dark:text-white">Location Information</CardTitle>
								<CardDescription className="dark:text-gray-300">
									Detailed information about your selected location
								</CardDescription>
							</CardHeader>							<CardContent className="space-y-6">
								<div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 hover:scale-[1.02] transition-all">
									<h3 className="text-2xl font-semibold text-blue-900 dark:text-blue-100 mb-2">
										{locationData.nom_ville}
									</h3>
									<p className="text-blue-700 dark:text-blue-200 text-lg">
										{locationData.region}
									</p>
									{locationData.departement && (
										<p className="text-blue-600 dark:text-blue-300 text-md">
											{locationData.departement}
										</p>
									)}
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:scale-[1.02] transition-all hover:shadow-md">
										<h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
											<MapPin className="h-5 w-5 mr-2" />
											Coordinates
										</h4>
										<div className="space-y-2">
											{locationData.latitude && (
												<p className="text-gray-600 dark:text-gray-300">
													<span className="font-medium">Latitude:</span> {locationData.latitude.toFixed(6)}
												</p>
											)}
											{locationData.longitude && (
												<p className="text-gray-600 dark:text-gray-300">
													<span className="font-medium">Longitude:</span> {locationData.longitude.toFixed(6)}
												</p>
											)}
										</div>
									</div>

									<div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:scale-[1.02] transition-all hover:shadow-md">
										<h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">City Information</h4>
										<div className="space-y-1">
											{locationData.code_postal && (
												<p className="text-gray-600 dark:text-gray-300">
													<span className="font-medium">Postal Code:</span> {locationData.code_postal}
												</p>
											)}
											{locationData.type_commune && (
												<p className="text-gray-600 dark:text-gray-300">
													<span className="font-medium">Type:</span> {locationData.type_commune}
												</p>
											)}
											{locationData.type_ville && (
												<p className="text-gray-600 dark:text-gray-300">
													<span className="font-medium">Category:</span> {locationData.type_ville}
												</p>
											)}
										</div>
									</div>
								</div>

								<div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 hover:scale-[1.01] transition-all">
									<h4 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-4">
										City Statistics
									</h4>
									<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
										{locationData.population && (
											<div className="animate-in slide-in-from-bottom-2 transition-all">
												<p className="text-sm font-medium text-green-800 dark:text-green-200">Population</p>
												<p className="text-lg text-green-700 dark:text-green-300">
													{locationData.population.toLocaleString()}
												</p>
											</div>
										)}
										{locationData.superficie_km2 && (
											<div className="animate-in slide-in-from-bottom-2 transition-all">
												<p className="text-sm font-medium text-green-800 dark:text-green-200">Area</p>
												<p className="text-lg text-green-700 dark:text-green-300">
													{locationData.superficie_km2.toFixed(2)} km²
												</p>
											</div>
										)}
										{locationData.densite && (
											<div className="animate-in slide-in-from-bottom-2 transition-all">
												<p className="text-sm font-medium text-green-800 dark:text-green-200">Density</p>
												<p className="text-lg text-green-700 dark:text-green-300">
													{locationData.densite.toFixed(0)} /km²
												</p>
											</div>
										)}
									</div>
								</div>

								{/* Employment Data */}
								{(locationData.nbr_unemployed || locationData.job_offers) && (
									<div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6 hover:scale-[1.01] transition-all">
										<h4 className="text-xl font-semibold text-yellow-900 dark:text-yellow-100 mb-4">
											Employment Data
										</h4>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											{locationData.nbr_unemployed && (
												<div className="animate-in slide-in-from-bottom-2 transition-all">
													<p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Unemployed</p>
													<p className="text-lg text-yellow-700 dark:text-yellow-300">
														{locationData.nbr_unemployed.toLocaleString()}
													</p>
													{locationData.unemployment_commune && (
														<p className="text-xs text-yellow-600 dark:text-yellow-400">
															in {locationData.unemployment_commune}
														</p>
													)}
												</div>
											)}
											{locationData.job_offers && (
												<div className="animate-in slide-in-from-bottom-2 transition-all">
													<p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Job Offers</p>
													<p className="text-lg text-yellow-700 dark:text-yellow-300">
														{locationData.job_offers.toLocaleString()}
													</p>
													{locationData.job_offer_department && (
														<p className="text-xs text-yellow-600 dark:text-yellow-400">
															in {locationData.job_offer_department}
														</p>
													)}
												</div>
											)}
										</div>
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				)}
			</main>
		</div>
	)
}
