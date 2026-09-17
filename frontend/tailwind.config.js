/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/!(universal-chat)/**/*.{js,ts,jsx,tsx,mdx}',
    './components/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      // shadcn/ui CSS Variable Colors
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Brand Colors - Professional AI Theme with Dark Mode Support
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9', // Primary brand blue
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        accent: {
          50: '#f0f7ff',
          100: '#e0efff',
          200: '#b9dfff',
          300: '#7cc7ff',
          400: '#36aeff',
          500: '#0c95f1', // Bright accent blue
          600: '#0075ce',
          700: '#005ba7',
          800: '#044d89',
          900: '#0a4072',
          950: '#07294b',
        },
        neural: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b', // Neural network gray
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Dark Theme Color Palette
        dark: {
          // Base backgrounds
          base: '#1a1a1a', // Deep charcoal base
          elevated: '#333333', // Card backgrounds
          gradient: {
            center: '#2e2e2e', // Dark slate gray center
            teal: '#264653', // Muted deep teal option
          },
          // Rich shadow colors
          shadow: {
            indigo: '#0f0f23', // Dark indigo shadows
            plum: '#1a1133', // Deep plum shadows
          },
          // Button accent colors
          button: {
            blue: '#223344', // Dark blue
            purple: '#3b235a', // Deep purple
            emerald: '#1a3d2f', // Emerald accent
          },
          // Text colors for dark theme
          text: {
            primary: '#e2e8f0', // Light gray for primary text
            secondary: '#94a3b8', // Medium gray for secondary text
            muted: '#64748b', // Darker gray for muted text
          },
        },
      },
      // Typography Scale
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
      },
      // Consistent Spacing System
      spacing: {
        18: '4.5rem',
        88: '22rem',
        128: '32rem',
      },
      // Container Sizes
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      // Border Radius for shadcn/ui
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      // Animation & Transitions
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.8' },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      // Shadows for depth
      boxShadow: {
        soft: '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        medium:
          '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 30px -5px rgba(0, 0, 0, 0.05)',
        large: '0 10px 50px -12px rgba(0, 0, 0, 0.25)',
        // Dark theme shadows with rich colors
        'dark-soft':
          '0 2px 15px -3px rgba(15, 15, 35, 0.3), 0 10px 20px -2px rgba(26, 17, 51, 0.2)',
        'dark-medium':
          '0 4px 25px -5px rgba(15, 15, 35, 0.4), 0 10px 30px -5px rgba(26, 17, 51, 0.3)',
        'dark-large':
          '0 10px 50px -12px rgba(15, 15, 35, 0.6), 0 25px 80px -15px rgba(26, 17, 51, 0.4)',
        'dark-glow':
          '0 0 20px rgba(34, 51, 68, 0.3), 0 0 40px rgba(59, 35, 90, 0.2)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};
