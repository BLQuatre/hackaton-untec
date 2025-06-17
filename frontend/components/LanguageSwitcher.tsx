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
      className="flex items-center gap-2"
      title={t('language.switch')}
    >
      <Globe className="h-4 w-4" />
      <span className="font-medium">
        {language.toUpperCase()}
      </span>
    </Button>
  )
}
