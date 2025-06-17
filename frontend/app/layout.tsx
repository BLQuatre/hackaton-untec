import type { Metadata } from 'next'
import './globals.css'
import { LanguageProvider } from '@/contexts/LanguageContext'

export const metadata: Metadata = {
	title: 'Costia',
	description: '42 Le Havre X UNTEC'
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="en">
			<body>
				<LanguageProvider>
					{children}
				</LanguageProvider>
			</body>
		</html>
	)
}
