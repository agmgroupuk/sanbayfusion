'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

interface SplashScreenProps {
  isLoading: boolean
  onLoadingComplete?: () => void
}

export default function SplashScreen({ isLoading, onLoadingComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (!isLoading) {
      // Delay before hiding splash screen for smooth transition
      const timer = setTimeout(() => {
        setIsVisible(false)
        onLoadingComplete?.()
      }, 1000) // 1 second fade out

      return () => clearTimeout(timer)
    }
  }, [isLoading, onLoadingComplete])

  return (
    <AnimatePresence>
      {isVisible && isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-neural-900 via-neural-800 to-neural-900"
        >
          {/* Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>

          {/* Content Container */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative z-10 flex flex-col items-center justify-center gap-6 px-4"
          >
            {/* Logo with Company Image */}
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-32 h-32 flex items-center justify-center"
            >
              <Image
                src="/images/logos/company-logo.png"
                alt="Maula AI"
                width={128}
                height={128}
                className="w-32 h-32 object-contain drop-shadow-2xl"
                priority
              />
            </motion.div>

            {/* Site Title */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-center"
            >
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                Maula AI
              </h1>
              <p className="text-lg text-neural-300">
                Intelligent AI Agents Platform
              </p>
            </motion.div>

            {/* Loading Bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="w-64 h-1 bg-neural-700 rounded-full overflow-hidden mt-4"
            >
              <motion.div
                animate={{ x: ['0%', '100%', '0%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="h-full w-1/4 bg-gradient-to-r from-brand-500 to-accent-500 rounded-full"
              />
            </motion.div>

            {/* Loading Text */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="text-neural-400 text-sm mt-6"
            >
              Loading your experience...
            </motion.p>

            {/* Powered By Text */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="mt-12 text-center"
            >
              <p className="text-sm text-neural-500 tracking-widest uppercase">
                Powered By
              </p>
              <p className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-accent-400 mt-2">
                AI Digital FriendZone
              </p>
            </motion.div>

            {/* Dots Animation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.6 }}
              className="flex gap-2 mt-8"
            >
              {[0, 1, 2].map((dot) => (
                <motion.div
                  key={dot}
                  animate={{ y: [-8, 0, -8] }}
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    delay: dot * 0.2,
                  }}
                  className="w-3 h-3 bg-brand-500 rounded-full"
                />
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
