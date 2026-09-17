'use client';

import { useState, useEffect } from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check theme from cookie (NO localStorage)
    const cookieMatch = document.cookie.match(/(?:^|;\s*)theme=([^;]*)/);
    const storedTheme = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const shouldBeDark = storedTheme === 'dark' || (!storedTheme && prefersDark);
    setIsDark(shouldBeDark);

    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);

    if (newTheme) {
      document.documentElement.classList.add('dark');
      document.cookie = `theme=dark; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    } else {
      document.documentElement.classList.remove('dark');
      document.cookie = `theme=light; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative inline-flex items-center justify-center w-12 h-12 rounded-full
        transition-all duration-300 transform hover:scale-110
        ${isDark
          ? 'bg-gradient-to-br from-yellow-400 via-orange-400 to-yellow-500 text-white shadow-lg hover:shadow-xl'
          : 'bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 text-white shadow-lg hover:shadow-xl'
        }
        focus:outline-none focus:ring-2 focus:ring-offset-2 
        ${isDark ? 'focus:ring-yellow-400' : 'focus:ring-indigo-500'}
      `}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className="relative">
        {isDark ? (
          <SunIcon className="h-6 w-6 transform transition-transform duration-300 hover:rotate-45" />
        ) : (
          <MoonIcon className="h-6 w-6 transform transition-transform duration-300 hover:-rotate-12" />
        )}
      </div>

      {/* Animated background glow */}
      <div className={`
        absolute inset-0 rounded-full opacity-20 blur-xl transition-all duration-300
        ${isDark
          ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
          : 'bg-gradient-to-br from-indigo-500 to-purple-600'
        }
      `} />
    </button>
  );
}