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
      className="flex items-center gap-2 dark:border-gray-600 dark:text-gray-300 transition-all duration-300 hover:scale-105 cursor-pointer"
      title={t('language.switch')}
    >
      <Globe className="h-4 w-4" />
      <span className="font-medium">
        {language.toUpperCase()}
      </span>
    </Button>
  )
}
