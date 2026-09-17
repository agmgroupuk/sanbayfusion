'use client'

import { getAgentsGroupedByCategory, getAgentCategories } from '@/lib/agentRegistry'
import Link from 'next/link'
import Image from 'next/image'
import { AgentConfig } from '@/types/agents'

export default function CategoriesPage() {
  const categories = getAgentCategories()
  const groupedAgents = getAgentsGroupedByCategory()

  const categoryIcons: Record<string, string> = {
    'Companion': '🤝',
    'Business': '💼',
    'Entertainment': '🎮',
    'Home & Lifestyle': '🏠',
    'Education': '📚',
    'Health & Wellness': '💚',
    'Creative': '🎨',
    'Technology': '💻'
  }

  const categoryDescriptions: Record<string, string> = {
    'Companion': 'Personal companions and relationship advisors for emotional support and social interaction',
    'Business': 'Professional assistants for productivity, management, and strategic business solutions',
    'Entertainment': 'Fun and engaging agents for gaming, comedy, and leisure activities',
    'Home & Lifestyle': 'Experts in cooking, travel, and everyday life management',
    'Education': 'Learning companions and academic experts across various subjects',
    'Health & Wellness': 'Support for physical and mental wellbeing, fitness, and emotional health',
    'Creative': 'Artistic and creative minds for storytelling, design, and artistic expression',
    'Technology': 'Technical experts for coding, troubleshooting, and innovation'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
              <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Agent Categories</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover our AI agents organized by expertise areas. Find the perfect assistant for your specific needs.
            </p>
          </div>

          {/* Categories Grid */}
          <div className="space-y-12">
            {categories.map((category) => (
              <div key={category} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
                {/* Category Header */}
                <div className="flex items-center space-x-4 mb-6">
                  <div className="text-4xl">
                    {categoryIcons[category] || '🤖'}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {category}
                    </h2>
                    <p className="text-gray-600 text-sm">
                      {categoryDescriptions[category] || 'Specialized AI assistants'}
                    </p>
                  </div>
                  <div className="ml-auto bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {groupedAgents[category]?.length || 0} agents
                  </div>
                </div>

                {/* Agents in Category */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedAgents[category]?.map((agent: AgentConfig) => (
                    <Link
                      key={agent.id}
                      href={`/agents/${agent.id}`}
                      className="group p-4 border border-gray-200 rounded-xl hover:shadow-md transition-all duration-200 hover:-translate-y-1"
                    >
                      <div className="flex items-start space-x-3">
                        <Image
                          src={agent.avatarUrl}
                          alt={agent.name}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {agent.name}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            {agent.specialty}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {agent.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md"
                              >
                                {tag}
                              </span>
                            ))}
                            {agent.tags.length > 2 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                                +{agent.tags.length - 2}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Stats Summary */}
          <div className="mt-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-white text-center">
            <h3 className="text-2xl font-bold mb-4">Complete AI Assistant Library</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="text-3xl font-bold">{categories.length}</div>
                <div className="text-blue-100">Categories</div>
              </div>
              <div>
                <div className="text-3xl font-bold">
                  {Object.values(groupedAgents).reduce((sum, agents) => sum + agents.length, 0)}
                </div>
                <div className="text-blue-100">AI Agents</div>
              </div>
              <div>
                <div className="text-3xl font-bold">∞</div>
                <div className="text-blue-100">Possibilities</div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="text-center mt-8">
            <Link
              href="https://sanbayfusion.com/agents"
              className="inline-flex items-center px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              ← Back to All Agents
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}