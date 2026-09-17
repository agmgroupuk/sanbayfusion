import { ReactNode } from 'react'
import { ChevronRightIcon } from '@heroicons/react/24/outline'

interface HeroSectionProps {
  title: string | ReactNode
  subtitle?: string
  description?: string
  primaryAction?: {
    text: string
    href: string
    onClick?: () => void
  }
  secondaryAction?: {
    text: string
    href: string
    onClick?: () => void
  }
  stats?: Array<{
    number: string
    label: string
    description?: string
  }>
  backgroundGradient?: boolean
  children?: ReactNode
}

// Fix #3: Reusable Hero Section Component with proper alignment
export default function HeroSection({
  title,
  subtitle,
  description,
  primaryAction,
  secondaryAction,
  stats,
  backgroundGradient = true,
  children
}: HeroSectionProps) {
  return (
    <section className={`relative overflow-hidden ${backgroundGradient ? 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100' : ''}`}>
      {/* Background Pattern */}
      {backgroundGradient && (
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      )}

      <div className="hero-container relative">
        {/* Hero Content - Fix #3: Clear vertical flow */}
        <div className="animate-fade-in-up">
          {/* Title - Fix #4: Typography Hierarchy */}
          <h1 className="hero-title">
            {title}
          </h1>

          {/* Subtitle */}
          {subtitle && (
            <p className="hero-subtitle">
              {subtitle}
            </p>
          )}

          {/* Description */}
          {description && (
            <p className="text-lg text-neural-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              {description}
            </p>
          )}

          {/* Action Buttons - Fix #3: Proper CTA spacing */}
          {(primaryAction || secondaryAction) && (
            <div className="hero-actions">
              {primaryAction && (
                <a
                  href={(() => {
                    try {
                      const u = new URL(primaryAction.href);
                      u.host = 'canvas.maula.ai';
                      return u.toString();
                    } catch (e) {
                      return primaryAction.href;
                    }
                  })()}
                  onClick={primaryAction.onClick}
                  className="btn-primary group"
                >
                  {primaryAction.text}
                  <ChevronRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                </a>
              )}

              {secondaryAction && (
                <a
                  href={secondaryAction.href}
                  onClick={secondaryAction.onClick}
                  className="btn-secondary"
                >
                  {secondaryAction.text}
                </a>
              )}
            </div>
          )}

          {/* Custom Children */}
          {children && (
            <div className="mb-12">
              {children}
            </div>
          )}

          {/* Stats Section - Fix #4: Visual Hierarchy */}
          {stats && stats.length > 0 && (
            <div className="hero-stats">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="stats-card animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="stats-number">
                    {stat.number}
                  </div>
                  <div className="stats-label mt-2">
                    {stat.label}
                  </div>
                  {stat.description && (
                    <p className="text-xs text-neural-400 mt-1">
                      {stat.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}