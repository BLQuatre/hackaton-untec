"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { useLanguage, Language } from '@/contexts/LanguageContext'
import { Globe } from 'lucide-react'

export function LanguageSwitcher() {
	const { language, setLanguage, t } = useLanguage()

	const toggleLanguage = () => {
		const newLanguage: Language = language === 'en' ? 'fr' : 'en'
		setLanguage(newLanguage)
	}
	return (
		<Button
			variant="outline"
			size="sm"
			onClick={toggleLanguage}
			className="relative overflow-hidden bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/40 dark:border-gray-600/40 hover:border-blue-300 dark:hover:border-purple-400 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-purple-400 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/20 dark:hover:shadow-purple-500/20 cursor-pointer group"
			title={t('language.switch')}
		>
			<div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-all duration-300" />
			<div className="relative flex items-center gap-2">
				<Globe className="h-4 w-4 transition-all duration-300 group-hover:rotate-12 group-hover:scale-110" />
				<span className="font-medium transition-all duration-300">
					{language.toUpperCase()}
				</span>
			</div>
		</Button>
	)
}
