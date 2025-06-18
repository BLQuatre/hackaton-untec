"use client"

import type React from "react"
import Image from "next/image"

import { useState, useEffect, useRef } from "react"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, Moon, Sun, Search, ArrowLeft, Loader2, Download, BarChart3, Map } from "lucide-react"
import { cn } from "@/lib/utils"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { useLanguage } from "@/contexts/LanguageContext"
import { ChartComponent } from "@/components/ChartComponent"
import { MapComponent } from "@/components/SimpleMapComponent"
import { exportToPDF } from "@/lib/pdfExport"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface Coords {
	lat: number
	lon: number
}

interface EnhancedLocationData {
	// Basic city information
	nom_ville: string
	type_commune: string
	code_postal: string
	code_insee: string
	population: number
	superficie_km2: number
	densite: number
	departement: string
	region: string
	latitude: number
	longitude: number
	type_ville: string

	// Employment data
	Unemployed_people?: number
	"Proportion of unemployed"?: string
	Job_Offer_in_Departement?: number

	// Amenities data
	Shop_nbr?: number
	Shop_radius?: number
	Shop_average_distance?: number

	"Food Store_nbr"?: number
	"Food Store_radius"?: number
	"Food Store_average_distance"?: number
	Healthcare_nbr?: number
	Healthcare_radius?: number
	Healthcare_average_distance?: number

	Public_Services_nbr?: number
	Public_Services_radius?: number
	Public_Services_average_distance?: number

	School_nbr?: number
	School_radius?: number
	School_average_distance?: number
	Transport_nbr?: number
	Transport_radius?: number
	Transport_average_distance?: number

	// Train station data
	Train_Station_nbr?: number
	Train_Station_radius?: number
	Train_Station_average_distance?: number

	// Hospital data
	Hospital_nbr?: number
	Hospital_radius?: number
	Hospital_average_distance?: number

	// Scoring data
	Score_Travail?: string
	Score_Transport?: string
	"Score_Service public"?: string
	"Score_Éducation"?: string
	Score_Commerce?: string
	"Score_Santé"?: string
	Score_Global?: string
	// School charge data
	School_Charge?: {
		Total_of_Elementary_School?: number
		Status_Recap?: {
			[status: string]: number
		}
		Most_common_status?: string
		Most_common_count?: number
		Most_common_occurence?: string
		[key: string]: any
	}

	// AI-generated resume/summary
	resume?: string
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

	const [locationData, setLocationData] = useState<EnhancedLocationData | null>(null)
	const [error, setError] = useState("")

	const [latInput, setLatInput] = useState("")
	const [lonInput, setLonInput] = useState("")
	// Autocomplete state
	const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([])
	const [showSuggestions, setShowSuggestions] = useState(false)
	const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
	const inputRef = useRef<HTMLInputElement>(null)
	const suggestionsRef = useRef<HTMLDivElement>(null)
	const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const lastRequestTimeRef = useRef<number>(0)
	const pendingRequestRef = useRef<string | null>(null)

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
	// Debounced search function with intelligent queuing
	const executeSuggestionSearch = async (searchValue: string) => {
		const currentTime = Date.now()
		const timeSinceLastRequest = currentTime - lastRequestTimeRef.current

		// If less than 200ms since last request, queue it
		if (timeSinceLastRequest < 200) {
			// Override any pending request with the new one
			pendingRequestRef.current = searchValue

			// Schedule execution after the remaining time
			const remainingTime = 200 - timeSinceLastRequest

			if (searchTimeoutRef.current) {
				clearTimeout(searchTimeoutRef.current)
			}

			searchTimeoutRef.current = setTimeout(() => {
				// Check if this is still the latest pending request
				if (pendingRequestRef.current === searchValue) {
					pendingRequestRef.current = null
					lastRequestTimeRef.current = Date.now()
					performSuggestionSearch(searchValue)
				}
			}, remainingTime)
		} else {
			// Execute immediately and clear any pending requests
			pendingRequestRef.current = null
			lastRequestTimeRef.current = currentTime
			await performSuggestionSearch(searchValue)
		}
	}

	// Actual search execution
	const performSuggestionSearch = async (searchValue: string) => {
		try {
			const response = await axios.get(`https://data.geopf.fr/geocodage/completion?text=${searchValue}`)
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

				suggestions.push({
					id: i,
					fullAddress: feature.fulltext,
					type: feature.kind,
					coordinates: {
						lat: feature.y,
						lon: feature.x,
					},
				})
			}
			setSuggestions(suggestions)
			setShowSuggestions(true)
		} catch (error) {
			console.error('Error fetching suggestions:', error)
			setSuggestions([])
			setShowSuggestions(false)
		}
	}

	// Handle input change and show suggestions
	const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value.replace(/[^a-zA-Z0-9\s]/g, '')
		setAddress(value)

		if (address !== value)
			setCoords(null)
		setSelectedSuggestionIndex(-1)

		// Clear existing timeout
		if (searchTimeoutRef.current) {
			clearTimeout(searchTimeoutRef.current)
		}

		if (value.length < 5) {
			setSuggestions([])
			setShowSuggestions(false)
			// Clear any pending requests since input is too short
			pendingRequestRef.current = null
			return
		}

		// Use the new debounced search function
		await executeSuggestionSearch(value)
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
	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (searchTimeoutRef.current) {
				clearTimeout(searchTimeoutRef.current)
			}
			// Clear any pending requests
			pendingRequestRef.current = null
		}
	}, [])

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
	};
	// Handle search
	const handleSearch = async () => {
		if (!coords && !address.trim()) return

		setAppState("loading")
		setError("")
		setShowSuggestions(false)
		try {
			const response = await axios.post("http://localhost:8000/api/search/", {
				coordinates: coords,
				address: address.trim(),
				city: address.trim().split(",")[1]?.trim()?.substring(5)?.trim() || undefined,
			})
			// The API returns { stats: {...}, formatted_output: "...", resume: "...", filename: "..." }
			// We need the stats object which contains the enhanced location data
			if (response.data.stats && typeof response.data.stats === 'object') {
				const locationDataWithResume = { ...response.data.stats }
				// Add the resume if it exists
				if (response.data.resume) {
					locationDataWithResume.resume = response.data.resume
				}
				setLocationData(locationDataWithResume)
			} else if (typeof response.data === 'object' && response.data.nom_ville) {
				// Fallback if the API returns data directly
				setLocationData(response.data)
			} else {
				// Handle case where API returns error string
				const errorMessage = typeof response.data === 'string' ? response.data : 'Invalid location data format';
				setError(errorMessage);
				setAppState("search");
				return;
			}
			setAppState("results")		} catch (err: any) {
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

	// Handle PDF export
	const handlePDFExport = async () => {
		if (!locationData) return;

		try {
			await exportToPDF(locationData, 'results-content');
		} catch (error) {
			console.error('Error exporting PDF:', error);
			alert('Error generating PDF. Please try again.');
		}
	};

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
								)}
								<Button
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
				)}				{/* Results State */}
				{appState === "results" && locationData && (
					<div className="space-y-6 animate-in fade-in-0 duration-300">
						<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
							<h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white animate-in slide-in-from-left-6 duration-300">
								{t('results.title')}
							</h2>
							<div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
								<Button
									variant="outline"
									onClick={handlePDFExport}
									className="flex items-center justify-center space-x-2 transition-all hover:scale-105 hover:shadow-md cursor-pointer dark:text-white"
								>
									<Download className="h-4 w-4" />
									<span>Export PDF</span>
								</Button>
								<Button
									variant="outline"
									onClick={resetSearch}
									className="flex items-center justify-center space-x-2 transition-all hover:scale-105 hover:shadow-md cursor-pointer dark:text-white"
								>
									<ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
									<span>{t('results.back')}</span>
								</Button>
							</div>
						</div>

						<div id="results-content" className="space-y-6">							{/* Location Header */}
							<Card className="dark:bg-gray-800/80 bg-white/80 backdrop-blur-sm dark:border-gray-700/50 border-white/30 shadow-xl animate-in slide-in-from-bottom-6 duration-300 hover:shadow-2xl transition-all">
								<CardContent className="p-8">
									<div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 hover:scale-[1.02] transition-all">
										<div className="flex items-center justify-between mb-4">
											<div>
												<h3 className="text-3xl sm:text-4xl font-bold text-blue-900 dark:text-blue-100 mb-2">
													{locationData.nom_ville || 'Unknown City'}
												</h3>
												<p className="text-blue-700 dark:text-blue-200 text-xl">
													{locationData.region}, {locationData.departement}
												</p>
												<p className="text-blue-600 dark:text-blue-300 text-lg">
													Code postal: {locationData.code_postal} • Code INSEE: {locationData.code_insee}
												</p>
											</div>
											{locationData.latitude && locationData.longitude && (
												<div className="text-right">
													<div className="bg-white/70 dark:bg-gray-800/70 rounded-lg p-4">
														<p className="text-sm text-gray-600 dark:text-gray-400">Coordinates</p>
														<p className="font-mono text-blue-800 dark:text-blue-200">{locationData.latitude.toFixed(6)}</p>
														<p className="font-mono text-blue-800 dark:text-blue-200">{locationData.longitude.toFixed(6)}</p>
													</div>
												</div>
											)}
										</div>
									</div>
								</CardContent>
							</Card>							{/* Key Statistics Cards */}
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
								<Card className="dark:bg-gray-800/80 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all hover:scale-105">
									<CardContent className="p-6">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-sm font-medium text-gray-600 dark:text-gray-400">Population</p>
												<p className="text-2xl font-bold text-gray-900 dark:text-white">
													{locationData.population ? (locationData.population > 1000000 ?
														`${(locationData.population / 1000000).toFixed(2)}M` :
														locationData.population.toLocaleString()) : 'N/A'}
												</p>
												<p className="text-xs text-gray-500">{locationData.type_ville || locationData.type_commune || 'Unknown'}</p>
											</div>
											<div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
												<span className="text-blue-600 dark:text-blue-400 text-xl">👥</span>
											</div>
										</div>
									</CardContent>
								</Card>

								<Card className="dark:bg-gray-800/80 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all hover:scale-105">
									<CardContent className="p-6">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-sm font-medium text-gray-600 dark:text-gray-400">Density</p>
												<p className="text-2xl font-bold text-gray-900 dark:text-white">
													{locationData.densite ? locationData.densite.toLocaleString() : 'N/A'}
												</p>
												<p className="text-xs text-gray-500">per km²</p>
											</div>
											<div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
												<span className="text-green-600 dark:text-green-400 text-xl">🏙️</span>
											</div>
										</div>
									</CardContent>
								</Card>

								<Card className="dark:bg-gray-800/80 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all hover:scale-105">
									<CardContent className="p-6">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-sm font-medium text-gray-600 dark:text-gray-400">Surface Area</p>
												<p className="text-2xl font-bold text-gray-900 dark:text-white">
													{locationData.superficie_km2 || 'N/A'}
												</p>
												<p className="text-xs text-gray-500">km²</p>
											</div>
											<div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
												<span className="text-purple-600 dark:text-purple-400 text-xl">📏</span>
											</div>
										</div>
									</CardContent>
								</Card>

								<Card className="dark:bg-gray-800/80 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all hover:scale-105">
									<CardContent className="p-6">
										<div className="flex items-center justify-between">
											<div>
												<p className="text-sm font-medium text-gray-600 dark:text-gray-400">Global Score</p>
												<p className="text-3xl font-bold text-green-600 dark:text-green-400">
													{locationData.Score_Global ? locationData.Score_Global.split('/')[0] : 'N/A'}
												</p>
												<p className="text-xs text-gray-500">/100</p>
											</div>
											<div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
												<span className="text-green-600 dark:text-green-400 text-xl">⭐</span>
											</div>
										</div>
									</CardContent>
								</Card>
							</div>

							{/* Score Overview */}
							<Card className="dark:bg-gray-800/80 bg-white/80 backdrop-blur-sm shadow-xl">
								<CardHeader>
									<CardTitle className="text-2xl dark:text-white flex items-center gap-2">
										<BarChart3 className="h-6 w-6" />
										Quality of Life Scores
									</CardTitle>
									<CardDescription className="dark:text-gray-300">
										Comprehensive evaluation across different categories
									</CardDescription>
								</CardHeader>								<CardContent>
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
										{[
											{ name: 'Commerce', scoreKey: 'Score_Commerce', color: 'bg-green-500', icon: '🛍️' },
											{ name: 'Services Publics', scoreKey: 'Score_Service public', color: 'bg-blue-500', icon: '🏛️' },
											{ name: 'Éducation', scoreKey: 'Score_Éducation', color: 'bg-yellow-500', icon: '🎓' },
											{ name: 'Santé', scoreKey: 'Score_Santé', color: 'bg-red-500', icon: '🏥' },
											{ name: 'Travail', scoreKey: 'Score_Travail', color: 'bg-orange-500', icon: '💼' },
											{ name: 'Transport', scoreKey: 'Score_Transport', color: 'bg-purple-500', icon: '🚌' }
										].map((item, index) => {
											const scoreValue = locationData[item.scoreKey as keyof EnhancedLocationData] as string;
											const score = scoreValue ? parseInt(scoreValue.split('/')[0]) : 0;
											return (
												<div key={index} className="space-y-2">
													<div className="flex items-center justify-between">
														<span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
															<span>{item.icon}</span>
															{item.name}
														</span>
														<span className="text-lg font-bold text-gray-900 dark:text-white">
															{score}/100
														</span>
													</div>
													<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
														<div
															className={`h-3 rounded-full ${item.color} transition-all duration-1000 ease-out`}
															style={{ width: `${score}%` }}
														></div>
													</div>
												</div>
											);
										})}
									</div>
								</CardContent>
							</Card>

							{/* Employment Statistics */}
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
								<Card className="dark:bg-gray-800/80 bg-white/80 backdrop-blur-sm shadow-xl">
									<CardHeader>
										<CardTitle className="text-xl dark:text-white flex items-center gap-2">
											💼 Employment Overview
										</CardTitle>
									</CardHeader>									<CardContent className="space-y-4">
										<div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
											<div className="flex items-center justify-between mb-2">
												<span className="text-red-700 dark:text-red-300 font-medium">Unemployed People</span>
												<span className="text-2xl font-bold text-red-800 dark:text-red-200">
													{locationData.Unemployed_people ? locationData.Unemployed_people.toLocaleString() : 'N/A'}
												</span>
											</div>
											<div className="text-sm text-red-600 dark:text-red-400">
												{locationData["Proportion of unemployed"] || 'N/A'} of population
											</div>
										</div>
										<div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
											<div className="flex items-center justify-between mb-2">
												<span className="text-green-700 dark:text-green-300 font-medium">Job Offers Available</span>
												<span className="text-2xl font-bold text-green-800 dark:text-green-200">
													{locationData.Job_Offer_in_Departement ? locationData.Job_Offer_in_Departement.toLocaleString() : 'N/A'}
												</span>
											</div>
											<div className="text-sm text-green-600 dark:text-green-400">In the department</div>
										</div>
										{locationData.Unemployed_people && locationData.Job_Offer_in_Departement && (
											<div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
												<div className="text-center">
													<div className="text-3xl font-bold text-blue-800 dark:text-blue-200">
														{(locationData.Unemployed_people / locationData.Job_Offer_in_Departement).toFixed(1)}
													</div>
													<div className="text-sm text-blue-600 dark:text-blue-400">Unemployed per job offer</div>
												</div>
											</div>
										)}
									</CardContent>
								</Card>

								<Card className="dark:bg-gray-800/80 bg-white/80 backdrop-blur-sm shadow-xl">
									<CardHeader>
										<CardTitle className="text-xl dark:text-white flex items-center gap-2">
											🎓 Education Statistics
										</CardTitle>
									</CardHeader>									<CardContent className="space-y-4">
										{locationData.School_Charge && (
											<>
												<div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
													<div className="flex items-center justify-between mb-2">
														<span className="text-blue-700 dark:text-blue-300 font-medium">Elementary Schools</span>
														<span className="text-2xl font-bold text-blue-800 dark:text-blue-200">
															{locationData.School_Charge.Total_of_Elementary_School || 'N/A'}
														</span>
													</div>
												</div>
												{locationData.School_Charge.Status_Recap && (
													<div className="space-y-2">
														{Object.entries(locationData.School_Charge.Status_Recap).map(([status, count], index) => (
															<div key={index} className="flex justify-between text-sm">
																<span className="text-gray-600 dark:text-gray-400">{status}</span>
																<span className={`font-medium ${
																	status === 'Under Capacity' ? 'text-green-600 dark:text-green-400' :
																	status === 'Optimal' ? 'text-blue-600 dark:text-blue-400' :
																	'text-yellow-600 dark:text-yellow-400'
																}`}>
																	{count} {status === locationData.School_Charge?.Most_common_status &&
																		locationData.School_Charge?.Most_common_occurence &&
																		`(${locationData.School_Charge.Most_common_occurence})`}
																</span>
															</div>
														))}
													</div>
												)}
												{locationData.School_Charge.Most_common_status && (
													<div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
														<div className="text-sm text-green-700 dark:text-green-300">
															Most schools are {locationData.School_Charge.Most_common_status.toLowerCase()}
														</div>
													</div>
												)}
											</>
										)}
									</CardContent>
								</Card>
							</div>

							{/* Amenities Overview */}
							<Card className="dark:bg-gray-800/80 bg-white/80 backdrop-blur-sm shadow-xl">
								<CardHeader>
									<CardTitle className="text-2xl dark:text-white flex items-center gap-2">
										<Map className="h-6 w-6" />
										Local Amenities
									</CardTitle>
									<CardDescription className="dark:text-gray-300">
										Services and facilities within walking distance
									</CardDescription>
								</CardHeader>
								<CardContent>									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
										{[
											{ type: 'Shops', countKey: 'Shop_nbr', distanceKey: 'Shop_average_distance', radiusKey: 'Shop_radius', icon: '🛍️',
											  bgClass: 'bg-blue-50 dark:bg-blue-900/20', borderClass: 'border-blue-200 dark:border-blue-800', textClass: 'text-blue-600 dark:text-blue-400' },
											{ type: 'Food Stores', countKey: 'Food Store_nbr', distanceKey: 'Food Store_average_distance', radiusKey: 'Food Store_radius', icon: '🥖',
											  bgClass: 'bg-green-50 dark:bg-green-900/20', borderClass: 'border-green-200 dark:border-green-800', textClass: 'text-green-600 dark:text-green-400' },
											{ type: 'Hospitals', countKey: 'Hospital_nbr', distanceKey: 'Hospital_average_distance', radiusKey: 'Hospital_radius', icon: '🏥',
											  bgClass: 'bg-red-50 dark:bg-red-900/20', borderClass: 'border-red-200 dark:border-red-800', textClass: 'text-red-600 dark:text-red-400' },
											{ type: 'Healthcare', countKey: 'Healthcare_nbr', distanceKey: 'Healthcare_average_distance', radiusKey: 'Healthcare_radius', icon: '⚕️',
											  bgClass: 'bg-pink-50 dark:bg-pink-900/20', borderClass: 'border-pink-200 dark:border-pink-800', textClass: 'text-pink-600 dark:text-pink-400' },
											{ type: 'Public Services', countKey: 'Public_Services_nbr', distanceKey: 'Public_Services_average_distance', radiusKey: 'Public_Services_radius', icon: '🏛️',
											  bgClass: 'bg-purple-50 dark:bg-purple-900/20', borderClass: 'border-purple-200 dark:border-purple-800', textClass: 'text-purple-600 dark:text-purple-400' },
											{ type: 'Schools', countKey: 'School_nbr', distanceKey: 'School_average_distance', radiusKey: 'School_radius', icon: '🎓',
											  bgClass: 'bg-yellow-50 dark:bg-yellow-900/20', borderClass: 'border-yellow-200 dark:border-yellow-800', textClass: 'text-yellow-600 dark:text-yellow-400' },
											{ type: 'Transport', countKey: 'Transport_nbr', distanceKey: 'Transport_average_distance', radiusKey: 'Transport_radius', icon: '🚌',
											  bgClass: 'bg-indigo-50 dark:bg-indigo-900/20', borderClass: 'border-indigo-200 dark:border-indigo-800', textClass: 'text-indigo-600 dark:text-indigo-400' },
											{ type: 'Train Stations', countKey: 'Train_Station_nbr', distanceKey: 'Train_Station_average_distance', radiusKey: 'Train_Station_radius', icon: '🚂',
											  bgClass: 'bg-gray-50 dark:bg-gray-900/20', borderClass: 'border-gray-200 dark:border-gray-800', textClass: 'text-gray-600 dark:text-gray-400' }
										].map((amenity, index) => {
											const count = locationData[amenity.countKey as keyof EnhancedLocationData] as number;
											const distance = locationData[amenity.distanceKey as keyof EnhancedLocationData] as number;
											const radius = locationData[amenity.radiusKey as keyof EnhancedLocationData] as number;

											return (
												<div key={index} className={`${amenity.bgClass} rounded-lg p-4 border ${amenity.borderClass} hover:scale-105 transition-all`}>
													<div className="text-center space-y-2">
														<div className="text-2xl">{amenity.icon}</div>
														<div className="font-semibold text-gray-900 dark:text-white">{amenity.type}</div>
														<div className={`text-2xl font-bold ${amenity.textClass}`}>
															{count || 'N/A'}
														</div>
														{distance && (
															<div className="text-xs text-gray-600 dark:text-gray-400">
																Avg. {Math.round(distance)}m away
															</div>
														)}
														{radius && (
															<div className="text-xs text-gray-500 dark:text-gray-500">
																Within {radius}m radius
															</div>
														)}
													</div>
												</div>
											);
										})}
									</div>
								</CardContent>
							</Card>

							{/* Map and Charts */}
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
								<Card className="dark:bg-gray-800/80 bg-white/80 backdrop-blur-sm shadow-xl">
									<CardHeader>
										<CardTitle className="text-xl dark:text-white flex items-center gap-2">
											<MapPin className="h-5 w-5" />
											Location Map
										</CardTitle>
									</CardHeader>									<CardContent>
										<div className="space-y-4">
											<div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
												<h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Address</h4>
												<p className="text-blue-800 dark:text-blue-200">
													{locationData.nom_ville}, {locationData.code_postal}
												</p>
											</div>
											<div className="h-64 bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
												<div className="text-center">
													<MapPin className="h-16 w-16 mx-auto text-blue-500 dark:text-blue-400 mb-4" />
													<p className="text-gray-700 dark:text-gray-300 font-medium text-lg">{locationData.nom_ville}</p>
													{locationData.latitude && locationData.longitude && (
														<p className="text-sm text-gray-600 dark:text-gray-400">
															{locationData.latitude.toFixed(6)}, {locationData.longitude.toFixed(6)}
														</p>
													)}
													<p className="text-sm text-gray-500 dark:text-gray-500 mt-2">{locationData.region}</p>
												</div>
											</div>
											{locationData.latitude && locationData.longitude && (
												<div className="flex justify-center">
													<a
														href={`https://www.openstreetmap.org/#map=15/${locationData.latitude}/${locationData.longitude}`}
														target="_blank"
														rel="noopener noreferrer"
														className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
													>
														<MapPin className="h-4 w-4 mr-2" />
														View on OpenStreetMap
													</a>
												</div>
											)}
										</div>
									</CardContent>
								</Card>

								<Card className="dark:bg-gray-800/80 bg-white/80 backdrop-blur-sm shadow-xl">
									<CardHeader>
										<CardTitle className="text-xl dark:text-white flex items-center gap-2">
											<BarChart3 className="h-5 w-5" />
											Score Breakdown
										</CardTitle>
									</CardHeader>									<CardContent>
										<div className="h-64 flex items-center justify-center">
											<div className="relative w-48 h-48">
												{(() => {
													const globalScore = locationData.Score_Global ? parseInt(locationData.Score_Global.split('/')[0]) : 0;
													return (
														<>
															<svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
																<path
																	d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
																	fill="none"
																	stroke="#e5e7eb"
																	strokeWidth="2"
																	className="dark:stroke-gray-600"
																/>
																<path
																	d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
																	fill="none"
																	stroke="#10b981"
																	strokeWidth="2"
																	strokeDasharray={`${globalScore}, 100`}
																	strokeLinecap="round"
																/>
															</svg>
															<div className="absolute inset-0 flex items-center justify-center">
																<div className="text-center">
																	<div className="text-3xl font-bold text-green-600 dark:text-green-400">{globalScore}</div>
																	<div className="text-sm text-gray-600 dark:text-gray-400">Global Score</div>
																</div>
															</div>
														</>
													);
												})()}
											</div>
										</div>
									</CardContent>
								</Card>
							</div>

							{/* AI Resume Section */}
							{locationData.resume && (
								<Card className="dark:bg-gray-800/80 bg-white/80 backdrop-blur-sm shadow-xl">
									<CardHeader>
										<CardTitle className="text-2xl dark:text-white flex items-center gap-2">
											<span>🤖</span>
											AI Analysis Summary
										</CardTitle>
										<CardDescription className="dark:text-gray-300">
											Comprehensive analysis based on all available data
										</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
											<div className="prose prose-purple dark:prose-invert prose-sm sm:prose-base max-w-none prose-headings:text-purple-900 dark:prose-headings:text-purple-100 prose-p:text-purple-800 dark:prose-p:text-purple-200 prose-strong:text-purple-900 dark:prose-strong:text-purple-100 prose-em:text-purple-700 dark:prose-em:text-purple-300">
												<ReactMarkdown
													remarkPlugins={[remarkGfm]}
													components={{
														blockquote: ({children}) => <blockquote className="border-l-4 border-purple-300 dark:border-purple-600 pl-4 italic bg-purple-50/50 dark:bg-purple-900/10 py-2 my-4 not-prose">{children}</blockquote>,
														code: ({children}) => <code className="bg-purple-100 dark:bg-purple-800/30 px-1.5 py-0.5 rounded text-sm font-mono text-purple-900 dark:text-purple-100 not-prose">{children}</code>,
														pre: ({children}) => <pre className="bg-purple-100 dark:bg-purple-800/30 p-4 rounded-lg overflow-x-auto text-sm font-mono text-purple-900 dark:text-purple-100 not-prose">{children}</pre>,
													}}
												>
													{locationData.resume}
												</ReactMarkdown>
											</div>
										</div>
									</CardContent>
								</Card>
							)}
						</div>
					</div>
				)}
			</main>
		</div>
	)
}
