import { ReactNode } from 'react'

interface FeatureSectionProps {
  title: string
  subtitle?: string
  features: Array<{
    icon?: ReactNode
    title: string
    description: string
    link?: {
      text: string
      href: string
    }
  }>
  layout?: '2-col' | '3-col' | '4-col'
  backgroundStyle?: 'white' | 'gray' | 'gradient'
}

// Fix #1: Reusable Feature Section with consistent grid layout
export default function FeatureSection({
  title,
  subtitle,
  features,
  layout = '3-col',
  backgroundStyle = 'white'
}: FeatureSectionProps) {
  const backgroundClasses = {
    white: 'bg-white',
    gray: 'bg-neural-50',
    gradient: 'bg-gradient-to-br from-white via-brand-50 to-accent-50'
  }

  const gridClasses = {
    '2-col': 'grid-2-col',
    '3-col': 'grid-3-col', 
    '4-col': 'grid-4-col'
  }

  return (
    <section className={`section-padding ${backgroundClasses[backgroundStyle]}`}>
      <div className="container-custom">
        {/* Section Header - Fix #4: Typography Hierarchy */}
        <div className="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
          <h2 className="space-element">
            {title}
          </h2>
          {subtitle && (
            <p className="text-subtitle">
              {subtitle}
            </p>
          )}
        </div>

        {/* Features Grid - Fix #1: Consistent Grid System */}
        <div className={`${gridClasses[layout]}`}>
          {features.map((feature, index) => (
            <div 
              key={index}
              className="card card-padding group animate-fade-in-up"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              {/* Feature Icon */}
              {feature.icon && (
                <div className="mb-4 text-brand-500 group-hover:text-accent-500 transition-colors duration-300">
                  {feature.icon}
                </div>
              )}

              {/* Feature Content */}
              <h3 className="text-xl font-semibold text-neural-800 mb-3">
                {feature.title}
              </h3>
              
              <p className="text-neural-600 leading-relaxed mb-4">
                {feature.description}
              </p>

              {/* Feature Link */}
              {feature.link && (
                <a 
                  href={feature.link.href}
                  className="inline-flex items-center text-sm font-medium text-brand-600 hover:text-accent-500 transition-colors duration-200"
                >
                  {feature.link.text}
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}