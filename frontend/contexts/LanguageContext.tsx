"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import Cookies from 'js-cookie'

export type Language = 'en' | 'fr'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// Translation dictionaries
const translations = {
  en: {
    // App titles
    'app.title': 'Costia',
    'app.description': '42 Le Havre X UNTEC',

    // Search section
    'search.title': 'Location Search',
    'search.description': 'Find location information',
    'search.placeholder': 'Enter an address or location',
    'search.button': 'Search',
    'search.methods.address': 'Address',
    'search.methods.map': 'Map',
    'search.methods.coordinates': 'Coordinates',

    // Results
    'results.title': 'Location Results',
    'results.back': 'Back to Search',
    'results.population': 'Population',
    'results.elevation': 'Elevation',
    'results.timezone': 'Timezone',

    // Common
    'loading': 'Loading...',
    'error': 'Error occurred',

    // Language switcher
    'language.switch': 'Language',
  },
  fr: {
    // App titles
    'app.title': 'Costia',
    'app.description': '42 Le Havre X UNTEC',

    // Search section
    'search.title': 'Recherche de localisation',
    'search.description': 'Trouver des informations de localisation',
    'search.placeholder': 'Entrez une adresse ou un lieu',
    'search.button': 'Rechercher',
    'search.methods.address': 'Adresse',
    'search.methods.map': 'Carte',
    'search.methods.coordinates': 'Coordonnées',

    // Results
    'results.title': 'Résultats de localisation',
    'results.back': 'Retour à la recherche',
    'results.population': 'Population',
    'results.elevation': 'Altitude',
    'results.timezone': 'Fuseau horaire',

    // Common
    'loading': 'Chargement...',
    'error': 'Erreur survenue',

    // Language switcher
    'language.switch': 'Langue',
  }
}

interface LanguageProviderProps {
  children: ReactNode
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>('en')

  useEffect(() => {
    // Load language from cookie on mount
    const savedLanguage = Cookies.get('language') as Language
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'fr')) {
      setLanguageState(savedLanguage)
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    Cookies.set('language', lang, { expires: 365 }) // Cookie expires in 1 year
  }

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
