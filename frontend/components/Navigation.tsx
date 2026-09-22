'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bars3Icon,
  XMarkIcon,
  CpuChipIcon,
  HomeIcon,
  UserGroupIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  UserIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline'
import ThemeToggle from './ThemeToggle'

// Fix #2: Reusable Navbar Component with consistent structure
export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const navigation = [
    { name: 'Home', href: '/', icon: HomeIcon },
    { name: 'AI Agents', href: '/agents', icon: UserGroupIcon },
    { name: 'Dev Tools', href: '/tools', icon: WrenchScrewdriverIcon },
    { name: 'Dark Theme', href: '/dark-theme', icon: CpuChipIcon },
    { name: 'IP Info', href: '/ip-info', icon: GlobeAltIcon },
    { name: 'Dashboard', href: '/dashboard/overview', icon: CpuChipIcon },
    { name: 'Legal', href: '/legal', icon: DocumentTextIcon },
  ]

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav className={`
      bg-white/80 dark:bg-gray-800/90 backdrop-blur-md border-b 
      border-neutral-200 dark:border-gray-700 sticky top-0 z-50
    `}>
      <div className="container-custom">
        <div className="flex justify-between items-center h-16">
          {/* Left: Logo/Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="w-8 h-8 bg-brand-gradient rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <CpuChipIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent">
                AI Platform
              </span>
            </Link>
          </div>

          {/* Middle: Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`nav-link flex items-center space-x-1 px-3 py-2 rounded-md ${isActive(item.href) ? 'nav-link-active' : ''
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* Right: Theme Toggle + Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <ThemeToggle />
            <Link href="/auth/login" className="btn-ghost">
              Sign In
            </Link>
            <Link href="/auth/signup" className="btn-primary">
              Get Started
            </Link>
          </div>

          {/* Mobile: Theme Toggle + Menu button */}
          <div className="md:hidden flex items-center space-x-2">
            <div className="scale-75">
              <ThemeToggle />
            </div>
            <button
              type="button"
              className="p-2 rounded-md text-neural-600 hover:text-brand-600 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <XMarkIcon className="w-6 h-6" />
              ) : (
                <Bars3Icon className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu - Fix #5: Responsive Design */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-800 border-t border-neutral-200 dark:border-gray-700 shadow-medium">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`nav-mobile-link flex items-center space-x-2 ${isActive(item.href) ? 'bg-brand-50 text-brand-600' : ''
                    }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}

            {/* Mobile Auth Section */}
            <div className="pt-4 border-t border-neural-200 mt-4">
              <Link
                href="/auth/login"
                className="nav-mobile-link flex items-center space-x-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <UserIcon className="w-5 h-5" />
                <span>Sign In</span>
              </Link>
              <Link
                href="/auth/signup"
                className="block mx-3 mt-2 btn-primary text-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}