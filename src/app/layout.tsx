import '@/app/globals.css';
import AuthProvider from '@/app/components/AuthProvider';

export const metadata = {
  title: {
    default: 'Track Nexus',
    template: '%s | Track Nexus',
  },
  description: 'Employee time tracking and productivity management platform',
  icons: {
    icon: '/icon.svg',
    apple: '/logo.png',
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: 'Track Nexus',
    description: 'Employee time tracking and productivity management platform',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#075a96" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gray-50 text-gray-900">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg focus:text-[#096eb6] focus:font-semibold">
          Skip to main content
        </a>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
