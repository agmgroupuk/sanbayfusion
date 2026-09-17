'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface AgentDetailsSection {
  title: string
  icon: string
  items?: string[]
  content?: string
}

interface AgentDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  agentName: string
  agentIcon: string
  sections: AgentDetailsSection[]
}

export default function AgentDetailsModal({
  isOpen,
  onClose,
  agentName,
  agentIcon,
  sections
}: AgentDetailsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center"
          />

          {/* Modal - Centered on Screen with Light Beige Theme */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4"
          >
            <div className="pointer-events-auto w-full max-w-3xl max-h-[85vh] bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-50 border-4 border-gray-300 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
              {/* Header with Light Background */}
              <div className="flex items-center justify-between p-8 border-b-2 border-gray-300 bg-gradient-to-r from-amber-50 to-yellow-50">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{agentIcon}</span>
                  <h2 className="text-3xl font-bold text-amber-900">{agentName}</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-300/30 rounded-lg transition-colors group"
                  aria-label="Close modal"
                >
                  <XMarkIcon className="w-8 h-8 text-gray-700 group-hover:text-gray-900 transition-colors" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-8 space-y-6">
                  {sections.map((section, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`rounded-2xl p-6 border-2 transition-all ${
                        section.items
                          ? 'bg-gray-700 border-gray-600 shadow-lg'
                          : index === sections.length - 1
                          ? 'bg-yellow-100 border-yellow-300 shadow-md'
                          : 'bg-gray-700 border-gray-600 shadow-lg'
                      }`}
                    >
                      {/* Section Header with Icon */}
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-3xl">{section.icon}</span>
                        <h3 className={`text-xl font-bold ${
                          section.items || index !== sections.length - 1
                            ? 'text-orange-500'
                            : 'text-amber-800'
                        }`}>
                          {section.title}:
                        </h3>
                      </div>

                      {/* Section Content - List or Text */}
                      {section.items ? (
                        <ul className="space-y-2 ml-8">
                          {section.items.map((item, itemIndex) => (
                            <motion.li
                              key={itemIndex}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 + itemIndex * 0.05 }}
                              className="text-gray-400 flex items-start text-sm"
                            >
                              <span className="text-gray-500 mr-3 mt-1 flex-shrink-0">•</span>
                              <span>{item}</span>
                            </motion.li>
                          ))}
                        </ul>
                      ) : (
                        <p className={`leading-relaxed ml-8 text-sm ${
                          index === sections.length - 1
                            ? 'text-amber-800'
                            : 'text-gray-300'
                        }`}>
                          {section.content}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Footer with Close Button */}
              <div className="border-t-2 border-gray-300 bg-gradient-to-r from-amber-50 to-yellow-50 p-6">
                <button
                  onClick={onClose}
                  className="w-full px-8 py-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white font-bold rounded-lg transition-all duration-200 hover:shadow-lg text-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
