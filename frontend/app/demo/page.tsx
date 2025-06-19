"use client"

import type React from "react"
import Image from "next/image"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, Moon, Sun, Search, ArrowLeft, Loader2, Download, BarChart3, Map, Brain } from "lucide-react"
import { cn } from "@/lib/utils"
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

	// Natural risks data
	Flood_Risk?: {
		level: 'Faible' | 'Modéré' | 'Élevé'
		flood_zones: string[]
		historical_events?: number
		prevention_measures?: string[]
	}
	Earthquake_Risk?: {
		seismic_zone: number // 1-5 scale
		level: 'Très faible' | 'Faible' | 'Modéré' | 'Moyen' | 'Fort'
		magnitude_risk: string
		building_regulations?: string[]
	}
	Radon_Risk?: {
		level: 'Faible' | 'Modéré' | 'Élevé'
		potential_category: number // 1-3 category
		measurement_required: boolean
		prevention_advice?: string[]
	}

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

export default function HackathonDemoApp() {
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
	// Mock suggestions for demonstration
	const getMockSuggestions = (searchValue: string): AutocompleteSuggestion[] => {
		const mockAddresses = [
			"15 Avenue des Champs-Élysées, 75008 Paris",
			"Place Bellecour, 69002 Lyon",
			"Vieux-Port, 13001 Marseille",
			"Place du Capitole, 31000 Toulouse",
			"Promenade des Anglais, 06000 Nice",
			"Château des Ducs de Bretagne, 44000 Nantes",
			"Place de la Comédie, 34000 Montpellier",
			"Cathédrale Notre-Dame, 67000 Strasbourg",
			"Cours Mirabeau, 13100 Aix-en-Provence",
			"Place Stanislas, 54000 Nancy"
		];

		const filteredAddresses = mockAddresses.filter(addr =>
			addr.toLowerCase().includes(searchValue.toLowerCase())
		);

		// If no matches, create some generic ones based on the search
		if (filteredAddresses.length === 0) {
			return [
				{
					id: 1,
					type: "street",
					fullAddress: `${searchValue} Centre, 75001 Paris`,
					coordinates: { lat: 48.8566 + (Math.random() - 0.5) * 0.1, lon: 2.3522 + (Math.random() - 0.5) * 0.1 }
				},
				{
					id: 2,
					type: "city",
					fullAddress: `${searchValue} Ville, 69000 Lyon`,
					coordinates: { lat: 45.7640 + (Math.random() - 0.5) * 0.1, lon: 4.8357 + (Math.random() - 0.5) * 0.1 }
				},
				{
					id: 3,
					type: "street",
					fullAddress: `Avenue ${searchValue}, 13000 Marseille`,
					coordinates: { lat: 43.2965 + (Math.random() - 0.5) * 0.1, lon: 5.3698 + (Math.random() - 0.5) * 0.1 }
				}
			];
		}

		return filteredAddresses.slice(0, 8).map((addr, index) => ({
			id: index + 1,
			type: index % 2 === 0 ? "street" : "city",
			fullAddress: addr,
			coordinates: {
				lat: 46.0 + (Math.random() - 0.5) * 8,
				lon: 2.0 + (Math.random() - 0.5) * 8
			}
		}));
	};

	// Mock search execution with delay
	const performSuggestionSearch = async (searchValue: string) => {
		try {
			// Simulate network delay
			await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

			const suggestions = getMockSuggestions(searchValue);
			setSuggestions(suggestions);
			setShowSuggestions(suggestions.length > 0);
		} catch (error) {
			console.error('Erreur lors de la récupération des suggestions:', error)
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
	};	// Mock data for demonstration
	const getMockLocationData = (searchTerm: string): EnhancedLocationData => {
		// Create varied mock data based on search term
		const cityNames = ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Montpellier', 'Strasbourg'];
		const regions = ['Île-de-France', 'Auvergne-Rhône-Alpes', 'Provence-Alpes-Côte d\'Azur', 'Occitanie', 'Pays de la Loire', 'Grand Est'];
		const departments = ['75', '69', '13', '31', '06', '44', '34', '67'];

		const cityIndex = Math.abs(searchTerm.length) % cityNames.length;
		const selectedCity = cityNames[cityIndex];
		const selectedRegion = regions[cityIndex % regions.length];
		const selectedDepartment = departments[cityIndex % departments.length];

		return {
			nom_ville: selectedCity,
			type_commune: 'Commune',
			code_postal: `${selectedDepartment}${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
			code_insee: `${selectedDepartment}${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
			population: Math.floor(Math.random() * 2000000) + 10000,
			superficie_km2: Math.floor(Math.random() * 300) + 20,
			densite: Math.floor(Math.random() * 8000) + 100,
			departement: selectedRegion.split('-')[0],
			region: selectedRegion,
			latitude: 46.0 + (Math.random() - 0.5) * 10,
			longitude: 2.0 + (Math.random() - 0.5) * 10,
			type_ville: 'Ville moyenne',

			// Employment data
			Unemployed_people: Math.floor(Math.random() * 50000) + 1000,
			"Proportion of unemployed": `${(Math.random() * 15 + 3).toFixed(1)}%`,
			Job_Offer_in_Departement: Math.floor(Math.random() * 10000) + 500,

			// Amenities data
			Shop_nbr: Math.floor(Math.random() * 200) + 10,
			Shop_radius: 500,
			Shop_average_distance: Math.floor(Math.random() * 400) + 100,

			"Food Store_nbr": Math.floor(Math.random() * 50) + 5,
			"Food Store_radius": 1000,
			"Food Store_average_distance": Math.floor(Math.random() * 600) + 200,

			Healthcare_nbr: Math.floor(Math.random() * 30) + 3,
			Healthcare_radius: 2000,
			Healthcare_average_distance: Math.floor(Math.random() * 800) + 300,

			Public_Services_nbr: Math.floor(Math.random() * 20) + 2,
			Public_Services_radius: 1500,
			Public_Services_average_distance: Math.floor(Math.random() * 1000) + 200,

			School_nbr: Math.floor(Math.random() * 40) + 5,
			School_radius: 1000,
			School_average_distance: Math.floor(Math.random() * 500) + 150,

			Transport_nbr: Math.floor(Math.random() * 15) + 2,
			Transport_radius: 800,
			Transport_average_distance: Math.floor(Math.random() * 400) + 100,

			Train_Station_nbr: Math.floor(Math.random() * 3) + 1,
			Train_Station_radius: 5000,
			Train_Station_average_distance: Math.floor(Math.random() * 2000) + 500,

			Hospital_nbr: Math.floor(Math.random() * 5) + 1,
			Hospital_radius: 3000,
			Hospital_average_distance: Math.floor(Math.random() * 1500) + 800,

			// Scoring data
			Score_Travail: `${Math.floor(Math.random() * 40) + 60}/100`,
			Score_Transport: `${Math.floor(Math.random() * 40) + 50}/100`,
			"Score_Service public": `${Math.floor(Math.random() * 40) + 55}/100`,
			"Score_Éducation": `${Math.floor(Math.random() * 40) + 65}/100`,
			Score_Commerce: `${Math.floor(Math.random() * 40) + 70}/100`,
			"Score_Santé": `${Math.floor(Math.random() * 40) + 60}/100`,
			Score_Global: `${Math.floor(Math.random() * 30) + 65}/100`,			// School charge data
			School_Charge: {
				Total_of_Elementary_School: Math.floor(Math.random() * 25) + 5,
				Status_Recap: {
					'Under Capacity': Math.floor(Math.random() * 10) + 2,
					'Optimal': Math.floor(Math.random() * 15) + 8,
					'Over Capacity': Math.floor(Math.random() * 5) + 1
				},
				Most_common_status: 'Optimal',
				Most_common_count: Math.floor(Math.random() * 15) + 8,
				Most_common_occurence: `${(Math.random() * 60 + 40).toFixed(1)}%`			},

			// Natural risks data
			Flood_Risk: {
				level: ['Faible', 'Modéré', 'Élevé'][Math.floor(Math.random() * 3)] as 'Faible' | 'Modéré' | 'Élevé',
				flood_zones: [
					'Zone inondable AZI',
					'Bassin versant Loire',
					'Cours d\'eau secondaires'
				].slice(0, Math.floor(Math.random() * 3) + 1),
				historical_events: Math.floor(Math.random() * 5) + 1,
				prevention_measures: [
					'Système d\'alerte météorologique',
					'Digues et barrages',
					'Plans de prévention des risques (PPR)',
					'Réseaux d\'évacuation renforcés'
				].slice(0, Math.floor(Math.random() * 3) + 2)
			},
			Earthquake_Risk: {
				seismic_zone: Math.floor(Math.random() * 5) + 1,
				level: ['Très faible', 'Faible', 'Modéré', 'Moyen', 'Fort'][Math.floor(Math.random() * 5)] as 'Très faible' | 'Faible' | 'Modéré' | 'Moyen' | 'Fort',
				magnitude_risk: `${(Math.random() * 2 + 3).toFixed(1)}-${(Math.random() * 2 + 5).toFixed(1)}`,
				building_regulations: [
					'Normes parasismiques PS-MI',
					'Eurocode 8 applicable',
					'Contrôles techniques renforcés',
					'Matériaux antisismiques recommandés'
				].slice(0, Math.floor(Math.random() * 3) + 2)
			},
			Radon_Risk: {
				level: ['Faible', 'Modéré', 'Élevé'][Math.floor(Math.random() * 3)] as 'Faible' | 'Modéré' | 'Élevé',
				potential_category: Math.floor(Math.random() * 3) + 1,
				measurement_required: Math.random() > 0.5,
				prevention_advice: [
					'Ventilation naturelle suffisante',
					'Étanchéité du sous-sol recommandée',
					'Mesures de concentration conseillées',
					'Système de ventilation mécanique'
				].slice(0, Math.floor(Math.random() * 3) + 2)
			},

			// AI-generated resume not available in demo mode
			// resume: undefined
		};
	};

	// Handle search with mock data and loading delay
	const handleSearch = async () => {
		if (!coords && !address.trim()) return

		setAppState("loading")
		setError("")
		setShowSuggestions(false)

		try {
			// Simulate loading time between 2-5 seconds
			const loadingTime = Math.floor(Math.random() * 3000) + 2000; // 2000-5000ms

			await new Promise(resolve => setTimeout(resolve, loadingTime));

			// Generate mock data based on search term
			const searchTerm = address.trim() || `${coords?.lat},${coords?.lon}` || 'default';
			const mockData = getMockLocationData(searchTerm);

			setLocationData(mockData);
			setAppState("results");
		} catch (err: any) {
			setError("Erreur lors de la simulation des données")
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
			await exportToPDF(locationData, 'results-content');		} catch (error) {
			console.error('Erreur lors de l\'export PDF:', error);
			alert('Erreur lors de la génération du PDF. Veuillez réessayer.');
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
		>			{/* Header */}
			<header className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-white/30 dark:border-gray-700/30 transition-all duration-500 animate-in slide-in-from-top-4 relative z-10 shadow-lg shadow-blue-500/5 dark:shadow-purple-500/10">
				{/* Demo Banner */}
				<div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-center py-2 text-sm font-medium animate-pulse">
					🎭 MODE DÉMONSTRATION - Données fictives à des fins de présentation
				</div>

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
									Costia
								</h1>
								<p className="text-xs text-gray-600 dark:text-gray-400 font-medium opacity-80 group-hover:opacity-100 transition-all duration-300">
									42 Le Havre X UNTEC
								</p>
							</div>
						</div>

						{/* Controls Section */}
						<div className="flex items-center space-x-3">
							<Button
								variant="outline"
								size="sm"
								onClick={toggleDarkMode}
								className="relative overflow-hidden bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-300/60 dark:border-gray-600/40 hover:border-blue-300 dark:hover:border-purple-400 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-purple-400 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/20 dark:hover:shadow-purple-500/20 cursor-pointer group"
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
								Rechercher un emplacement
							</h2>
							<p className="text-lg text-gray-600 dark:text-gray-300">
								Trouver des informations détaillées sur une ville, un quartier ou un lieu spécifique
							</p>
						</div>

						<Card className="dark:bg-gray-800/80 bg-white/80 backdrop-blur-sm dark:border-gray-700/50 border-white/30 shadow-xl">
							<CardHeader>
								<CardTitle className="dark:text-white">Nos méthodes de recherche</CardTitle>
								<CardDescription className="dark:text-gray-300">
									Choisissez comment vous souhaitez rechercher votre emplacement
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
											<span>Adresse</span>
										</TabsTrigger>
										<TabsTrigger
											value="coordinates"
											className="flex items-center space-x-2 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
										>
											<MapPin className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
											<span>Coordonnées</span>
										</TabsTrigger>
									</TabsList>

									<TabsContent value="address" className="space-y-4 mt-6 animate-in slide-in-from-left-4 duration-300">
										<div className="relative">
											<Input
												ref={inputRef}
												type="text"
												placeholder="Rechercher une adresse, une ville ou un lieu..."
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
													placeholder="49.4944"
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
													placeholder="0.1079"
													value={lonInput}
													onChange={(e) => handleCoordsInputChange(e, setLonInput)}
													className="w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white text-lg py-6 transition-all duration-300 focus:scale-[1.02] focus:shadow-lg hover:shadow-md"
												/>
											</div>
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
									Rechercher
								</Button>
							</CardContent>
						</Card>
					</div>
				)}

				{/* Loading State */}
				{appState === "loading" && (
					<div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-in fade-in-0 duration-300 relative">
						{/* Main loading spinner with multiple layers */}
						<div className="relative animate-in zoom-in-50 duration-300">
							{/* Outer rotating ring */}
							<div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" style={{ animationDuration: "1s" }}></div>

							{/* Middle rotating ring */}
							<div className="absolute inset-2 w-16 h-16 border-3 border-transparent border-r-purple-600 dark:border-r-purple-400 rounded-full animate-spin" style={{ animationDuration: "1.5s", animationDirection: "reverse" }}></div>

							{/* Inner rotating ring */}
							<div className="absolute inset-4 w-12 h-12 border-2 border-transparent border-b-indigo-600 dark:border-b-indigo-400 rounded-full animate-spin" style={{ animationDuration: "2s" }}></div>

							{/* Center pulsing dot */}
							<div className="absolute inset-7 w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 rounded-full animate-pulse"></div>

							{/* Loader2 icon in center */}
							<Loader2 className="relative z-10 h-20 w-20 animate-spin text-transparent" />
						</div>						{/* Dynamic text with typewriter effect */}
						<div className="text-center space-y-3 animate-in slide-in-from-bottom-4 duration-300 delay-300">
							<h3 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent animate-in slide-in-from-left-4 duration-300 delay-300">
								Génération des données
							</h3>
							<p className="text-gray-600 dark:text-gray-300 animate-in slide-in-from-right-4 duration-300 delay-300 text-lg">
								Simulation de l'analyse en cours...
							</p>
						</div>
						{/* Enhanced bouncing dots with gradient colors */}
						<div className="flex space-x-2 animate-in slide-in-from-bottom-2 duration-300 delay-500">
							<div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-300 rounded-full animate-bounce shadow-lg" style={{ animationDelay: "0s" }}></div>
							<div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-400 dark:to-purple-300 rounded-full animate-bounce shadow-lg" style={{ animationDelay: "0.1s" }}></div>
							<div className="w-3 h-3 bg-gradient-to-r from-indigo-500 to-indigo-600 dark:from-indigo-400 dark:to-indigo-300 rounded-full animate-bounce shadow-lg" style={{ animationDelay: "0.2s" }}></div>
							<div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-400 dark:to-purple-400 rounded-full animate-bounce shadow-lg" style={{ animationDelay: "0.3s" }}></div>
						</div>
					</div>
				)}

				{/* Results State */}
				{appState === "results" && locationData && (
					<div className="space-y-6 animate-in fade-in-0 duration-300">
						<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
							<h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white animate-in slide-in-from-left-6 duration-300">
								Résultats de la recherche
							</h2>
							<div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
								<Button
									variant="outline"
									onClick={handlePDFExport}
									className="flex items-center justify-center space-x-2 transition-all hover:scale-105 hover:shadow-md cursor-pointer dark:text-white"
								>
									<Download className="h-4 w-4" />
									<span>Exporter en PDF</span>
								</Button>
								<Button
									variant="outline"
									onClick={resetSearch}
									className="flex items-center justify-center space-x-2 transition-all hover:scale-105 hover:shadow-md cursor-pointer dark:text-white"
								>
									<ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
									<span>Retour</span>
								</Button>
							</div>
						</div>
						<div id="results-content" className="space-y-6">
							{/* Location Header */}
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
														<p className="text-sm text-gray-600 dark:text-gray-400">Coordonnées</p>
														<p className="font-mono text-blue-800 dark:text-blue-200">{locationData.latitude.toFixed(6)}</p>
														<p className="font-mono text-blue-800 dark:text-blue-200">{locationData.longitude.toFixed(6)}</p>
													</div>
												</div>
											)}
										</div>
									</div>
								</CardContent>
							</Card>
							{/* Tabs for Stats and Resume */}
							<Card className="dark:bg-gray-800/80 bg-white/80 backdrop-blur-sm dark:border-gray-700/50 border-white/30 shadow-xl">
								<CardContent className="p-6">
									<Tabs defaultValue="stats" className="transition-all duration-300">
										<TabsList className="grid w-full grid-cols-2 transition-all duration-300">
											<TabsTrigger
												value="stats"
												className="flex items-center space-x-2 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
											>
												<BarChart3 className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
												<span>Statistiques</span>
											</TabsTrigger>
											<TabsTrigger
												value="resume"
												className="flex items-center space-x-2 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
											>
												<Brain className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
												<span>Analyse IA</span>
											</TabsTrigger>
										</TabsList>

										<TabsContent value="stats" className="space-y-6 mt-6 animate-in slide-in-from-left-4 duration-300">
											{/* Key Statistics Cards */}
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
												<p className="text-sm font-medium text-gray-600 dark:text-gray-400">Densité</p>
												<p className="text-2xl font-bold text-gray-900 dark:text-white">
													{locationData.densite ? locationData.densite.toLocaleString() : 'N/A'}
												</p>
												<p className="text-xs text-gray-500">par km²</p>
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
												<p className="text-sm font-medium text-gray-600 dark:text-gray-400">Surface</p>
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
												<p className="text-sm font-medium text-gray-600 dark:text-gray-400">Score Global</p>
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
										Scores par catégorie
									</CardTitle>
								</CardHeader>
								<CardContent>
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
											💼 Aperçu de l'emploi
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4">
										<div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
											<div className="flex items-center justify-between mb-2">
												<span className="text-red-700 dark:text-red-300 font-medium">Personnes au chômage</span>
													<span className="text-2xl font-bold text-red-800 dark:text-red-200">
														{locationData.Unemployed_people ? locationData.Unemployed_people.toLocaleString() : 'N/A'}
													</span>
												</div>
												<div className="text-sm text-red-600 dark:text-red-400">
													{locationData["Proportion of unemployed"] || 'N/A'} de la population
												</div>
											</div>
											<div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
												<div className="flex items-center justify-between mb-2">
													<span className="text-green-700 dark:text-green-300 font-medium">Offres d'emploi disponibles</span>
													<span className="text-2xl font-bold text-green-800 dark:text-green-200">
														{locationData.Job_Offer_in_Departement ? locationData.Job_Offer_in_Departement.toLocaleString() : 'N/A'}
													</span>
												</div>
												<div className="text-sm text-green-600 dark:text-green-400">Dans le département</div>
											</div>
										{locationData.Unemployed_people && locationData.Job_Offer_in_Departement && (
											<div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
												<div className="text-center">
													<div className="text-3xl font-bold text-blue-800 dark:text-blue-200">
														{(locationData.Unemployed_people / locationData.Job_Offer_in_Departement).toFixed(1)}
													</div>
													<div className="text-sm text-blue-600 dark:text-blue-400">Chômeurs par offre d'emploi</div>
												</div>
											</div>
										)}
									</CardContent>
								</Card>
								<Card className="dark:bg-gray-800/80 bg-white/80 backdrop-blur-sm shadow-xl">
									<CardHeader>
										<CardTitle className="text-xl dark:text-white flex items-center gap-2">
											🎓 Statistiques de l'éducation
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4">
										{locationData.School_Charge && (
											<>
											<div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
													<div className="flex items-center justify-between mb-2">
														<span className="text-blue-700 dark:text-blue-300 font-medium">Écoles Primaires</span>
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
															La plupart des écoles sont {locationData.School_Charge.Most_common_status?.toLowerCase() === 'under capacity' ? 'sous-capacité' :
															locationData.School_Charge.Most_common_status?.toLowerCase() === 'optimal' ? 'optimales' :
															locationData.School_Charge.Most_common_status?.toLowerCase()}
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
										Commodités locales
									</CardTitle>
									<CardDescription className="dark:text-gray-300">
										Services et équipements accessibles à pied
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
										{[
											{ type: 'Magasins', countKey: 'Shop_nbr', distanceKey: 'Shop_average_distance', radiusKey: 'Shop_radius', icon: '🛍️',
											  bgClass: 'bg-blue-50 dark:bg-blue-900/20', borderClass: 'border-blue-200 dark:border-blue-800', textClass: 'text-blue-600 dark:text-blue-400' },
											{ type: 'Alimentation', countKey: 'Food Store_nbr', distanceKey: 'Food Store_average_distance', radiusKey: 'Food Store_radius', icon: '🥖',
											  bgClass: 'bg-green-50 dark:bg-green-900/20', borderClass: 'border-green-200 dark:border-green-800', textClass: 'text-green-600 dark:text-green-400' },
											{ type: 'Hôpitaux', countKey: 'Hospital_nbr', distanceKey: 'Hospital_average_distance', radiusKey: 'Hospital_radius', icon: '🏥',
											  bgClass: 'bg-red-50 dark:bg-red-900/20', borderClass: 'border-red-200 dark:border-red-800', textClass: 'text-red-600 dark:text-red-400' },
											{ type: 'Santé', countKey: 'Healthcare_nbr', distanceKey: 'Healthcare_average_distance', radiusKey: 'Healthcare_radius', icon: '⚕️',
											  bgClass: 'bg-pink-50 dark:bg-pink-900/20', borderClass: 'border-pink-200 dark:border-pink-800', textClass: 'text-pink-600 dark:text-pink-400' },
											{ type: 'Services Publics', countKey: 'Public_Services_nbr', distanceKey: 'Public_Services_average_distance', radiusKey: 'Public_Services_radius', icon: '🏛️',
											  bgClass: 'bg-purple-50 dark:bg-purple-900/20', borderClass: 'border-purple-200 dark:border-purple-800', textClass: 'text-purple-600 dark:text-purple-400' },
											{ type: 'Écoles', countKey: 'School_nbr', distanceKey: 'School_average_distance', radiusKey: 'School_radius', icon: '🎓',
											  bgClass: 'bg-yellow-50 dark:bg-yellow-900/20', borderClass: 'border-yellow-200 dark:border-yellow-800', textClass: 'text-yellow-600 dark:text-yellow-400' },
											{ type: 'Transports', countKey: 'Transport_nbr', distanceKey: 'Transport_average_distance', radiusKey: 'Transport_radius', icon: '🚌',
											  bgClass: 'bg-indigo-50 dark:bg-indigo-900/20', borderClass: 'border-indigo-200 dark:border-indigo-800', textClass: 'text-indigo-600 dark:text-indigo-400' },
											{ type: 'Gares', countKey: 'Train_Station_nbr', distanceKey: 'Train_Station_average_distance', radiusKey: 'Train_Station_radius', icon: '🚂',
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
																Moy. {Math.round(distance)}m
															</div>
														)}
														{radius && (
															<div className="text-xs text-gray-500 dark:text-gray-500">
																Dans un rayon de {radius}m
															</div>
														)}
													</div>
												</div>
											);
										})}
									</div>
								</CardContent>
							</Card>

							{/* Construction Resources Section */}
							<Card className="dark:bg-gray-800/80 bg-white/80 backdrop-blur-sm shadow-xl">
								<CardHeader>
									<CardTitle className="text-2xl dark:text-white flex items-center gap-2">
										<span className="text-2xl">🏗️</span>
										Ressources de construction
									</CardTitle>
									<CardDescription className="dark:text-gray-300">
										Fournisseurs et services pour vos projets de construction
									</CardDescription>
								</CardHeader>
								<CardContent>
									{(() => {
										// Mock construction resources data - distances around 250km
										const constructionResources = [
											{
												name: 'Magasins de bricolage',
												distance: 235000 + Math.random() * 30000, // 235-265km
												supplier: 'Leroy Merlin Lyon',
												icon: '🔨',
												category: 'Matériaux',
												description: 'Outillage et matériaux de construction'
											},
											{
												name: 'Négociants en matériaux',
												distance: 220000 + Math.random() * 60000, // 220-280km
												supplier: 'Matériaux Rhône SA',
												icon: '🧱',
												category: 'Matériaux',
												description: 'Gros œuvre, ciment, parpaings'
											},
											{
												name: 'Menuiseries',
												distance: 245000 + Math.random() * 20000, // 245-265km
												supplier: 'Menuiserie Moderne',
												icon: '🪟',
												category: 'Spécialisé',
												description: 'Fenêtres, portes, volets'
											},
											{
												name: 'Électricité & Plomberie',
												distance: 230000 + Math.random() * 40000, // 230-270km
												supplier: 'Électro-Sanitaire Pro',
												icon: '⚡',
												category: 'Spécialisé',
												description: 'Matériel électrique et sanitaire'
											},
											{
												name: 'Peinture & Décoration',
												distance: 255000 + Math.random() * 20000, // 255-275km
												supplier: 'Déco Couleurs',
												icon: '🎨',
												category: 'Finition',
												description: 'Peintures, papiers peints, sols'
											},
											{
												name: 'Location de matériel',
												distance: 240000 + Math.random() * 30000, // 240-270km
												supplier: 'LocaBTP Services',
												icon: '🚛',
												category: 'Services',
												description: 'Outils, échafaudages, engins'
											}
										];// Sort by distance
										const sortedResources = constructionResources.sort((a, b) => a.distance - b.distance);

										return (
											<div className="space-y-6">
												{/* Resource Cards Grid */}
												<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
													{constructionResources.map((resource, index) => {
														const distanceKm = resource.distance / 1000;

														return (
															<div key={index} className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 rounded-lg p-4 border transition-all hover:scale-105">																<div className="text-center space-y-2">
																	<div className="text-3xl">{resource.icon}</div>
																	<div className="font-semibold text-gray-900 dark:text-white">{resource.name}</div>
																	<div className="text-xl font-bold text-blue-600 dark:text-blue-400">
																		{distanceKm.toFixed(0)}km
																	</div>
																	<div className="text-xs text-gray-500 dark:text-gray-500 bg-white/50 dark:bg-gray-800/50 rounded px-2 py-1">
																		{resource.description}
																	</div>
																</div>
															</div>
														);
													})}
												</div>
											</div>
										);
									})()}
								</CardContent>
							</Card>

							{/* Natural Risks Section */}
							<Card className="dark:bg-gray-800/80 bg-white/80 backdrop-blur-sm shadow-xl">
								<CardHeader>
									<CardTitle className="text-2xl dark:text-white flex items-center gap-2">
										<span className="text-2xl">⚠️</span>
										Risques naturels
									</CardTitle>
									<CardDescription className="dark:text-gray-300">
										Évaluation des risques environnementaux de la zone
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
										{/* Flood Risk */}
										{locationData.Flood_Risk && (
											<div className={`rounded-lg p-6 border-2 transition-all hover:scale-105 ${
												locationData.Flood_Risk.level === 'Élevé' ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700' :
												locationData.Flood_Risk.level === 'Modéré' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700' :
												'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
											}`}>
												<div className="text-center mb-4">
													<div className="text-4xl mb-2">🌊</div>
													<h3 className="text-lg font-bold text-gray-900 dark:text-white">Risque d'inondation</h3>
													<div className={`text-2xl font-bold mb-3 ${
														locationData.Flood_Risk.level === 'Élevé' ? 'text-red-600 dark:text-red-400' :
														locationData.Flood_Risk.level === 'Modéré' ? 'text-orange-600 dark:text-orange-400' :
														'text-green-600 dark:text-green-400'
													}`}>
														{locationData.Flood_Risk.level}
													</div>
												</div>
											</div>
										)}

										{/* Earthquake Risk */}
										{locationData.Earthquake_Risk && (
											<div className={`rounded-lg p-6 border-2 transition-all hover:scale-105 ${
												locationData.Earthquake_Risk.level === 'Fort' ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700' :
												locationData.Earthquake_Risk.level === 'Moyen' || locationData.Earthquake_Risk.level === 'Modéré' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700' :
												'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
											}`}>
												<div className="text-center mb-4">
													<div className="text-4xl mb-2">🏚️</div>
													<h3 className="text-lg font-bold text-gray-900 dark:text-white">Risque sismique</h3>
													<div className={`text-2xl font-bold mb-3 ${
														locationData.Earthquake_Risk.level === 'Fort' ? 'text-red-600 dark:text-red-400' :
														locationData.Earthquake_Risk.level === 'Moyen' || locationData.Earthquake_Risk.level === 'Modéré' ? 'text-orange-600 dark:text-orange-400' :
														'text-green-600 dark:text-green-400'
													}`}>
														{locationData.Earthquake_Risk.level}
													</div>
												</div>
											</div>
										)}

										{/* Radon Risk */}
										{locationData.Radon_Risk && (
											<div className={`rounded-lg p-6 border-2 transition-all hover:scale-105 ${
												locationData.Radon_Risk.level === 'Élevé' ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700' :
												locationData.Radon_Risk.level === 'Modéré' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700' :
												'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
											}`}>
												<div className="text-center mb-4">
													<div className="text-4xl mb-2">☢️</div>
													<h3 className="text-lg font-bold text-gray-900 dark:text-white">Potentiel radon</h3>
													<div className={`text-2xl font-bold mb-3 ${
														locationData.Radon_Risk.level === 'Élevé' ? 'text-red-600 dark:text-red-400' :
														locationData.Radon_Risk.level === 'Modéré' ? 'text-orange-600 dark:text-orange-400' :
														'text-green-600 dark:text-green-400'
													}`}>
														{locationData.Radon_Risk.level}
													</div>
												</div>
											</div>
										)}
									</div>
								</CardContent>
							</Card>

							{/* Map and Charts */}
							<div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
								<Card className="dark:bg-gray-800/80 bg-white/80 backdrop-blur-sm shadow-xl">
									<CardHeader>
										<CardTitle className="text-xl dark:text-white flex items-center gap-2">
											<MapPin className="h-5 w-5" />
											Carte de localisation
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="space-y-4">
											<div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
												<h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Adresse</h4>
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
														Voir sur OpenStreetMap
													</a>
												</div>
											)}
										</div>
									</CardContent>
								</Card>
							</div>
						</TabsContent>

										<TabsContent value="resume" className="space-y-6 mt-6 animate-in slide-in-from-right-4 duration-300">
											{/* AI Resume Section */}
											{locationData.resume ? (
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
												</div>											) : (
												<div className="text-center py-12">
													<div className="text-gray-400 dark:text-gray-600 mb-4">
														<Brain className="h-16 w-16 mx-auto opacity-50" />
													</div>
													<h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">🎭 Analyse IA non disponible en mode démo</h3>
													<p className="text-gray-500 dark:text-gray-500 mb-4">L'analyse IA complète est disponible uniquement avec des données réelles.</p>
													<div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 max-w-md mx-auto">
														<p className="text-sm text-orange-700 dark:text-orange-300">
															<strong>💡 Fonctionnalité complète :</strong> Analyse détaillée générée par IA incluant recommandations personnalisées, points forts et axes d'amélioration.
														</p>
													</div>
												</div>
											)}
										</TabsContent>
									</Tabs>
								</CardContent>
							</Card>
						</div>
					</div>
				)}
			</main>
		</div>
	)
}
