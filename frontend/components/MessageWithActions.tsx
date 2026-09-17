'use client'

import { useState } from 'react'
import { 
  DocumentDuplicateIcon,
  CheckIcon,
  HeartIcon,
  RocketLaunchIcon,
  ExclamationCircleIcon,
  BookmarkIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolid, BookmarkIcon as BookmarkSolid } from '@heroicons/react/24/solid'

interface MessageWithActionsProps {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
  onReaction?: (messageId: string, reaction: string) => void
  onSave?: (messageId: string) => void
  agentColor?: string
}

export default function MessageWithActions({
  id,
  role,
  content,
  timestamp,
  onReaction,
  onSave,
  agentColor = 'indigo'
}: MessageWithActionsProps) {
  const [copied, setCopied] = useState(false)
  const [reactions, setReactions] = useState<Record<string, boolean>>({
    helpful: false,
    love: false,
    rocket: false,
    warning: false,
    bookmark: false
  })

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleReaction = (reaction: string) => {
    const newState = !reactions[reaction as keyof typeof reactions]
    setReactions(prev => ({
      ...prev,
      [reaction]: newState
    }))
    onReaction?.(id, reaction)
  }

  const toggleSave = () => {
    setReactions(prev => ({
      ...prev,
      bookmark: !prev.bookmark
    }))
    onSave?.(id)
  }

  const reactionIcons = {
    helpful: { icon: CheckIcon, label: 'Helpful', color: 'text-green-500' },
    love: { icon: HeartSolid, label: 'Love it', color: 'text-red-500' },
    rocket: { icon: RocketLaunchIcon, label: 'Awesome', color: 'text-blue-500' },
    warning: { icon: ExclamationCircleIcon, label: 'Unclear', color: 'text-yellow-500' },
  }

  return (
    <div 
      id={`message-${id}`}
      className={`message-wrapper group mb-4 flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`flex flex-col ${role === 'user' ? 'items-end' : 'items-start'} max-w-[70%]`}>
        {/* Main Message Bubble */}
        <div
          className={`
            message-bubble px-4 py-3 rounded-lg transition-all duration-200 break-words
            ${role === 'user'
              ? 'bg-indigo-500 text-white rounded-br-none'
              : 'bg-gray-100 text-gray-900 rounded-bl-none'
            }
          `}
        >
          <p className="text-sm leading-relaxed">{content}</p>
          
          {timestamp && (
            <p className={`text-xs mt-2 ${role === 'user' ? 'text-indigo-100' : 'text-gray-500'}`}>
              {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        {/* Message Actions - Appear on Hover */}
        <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            title="Copy message"
            className="p-1.5 hover:bg-gray-100 rounded-md transition-colors duration-150"
            aria-label="Copy message to clipboard"
          >
            {copied ? (
              <CheckIcon className="w-4 h-4 text-green-500" />
            ) : (
              <DocumentDuplicateIcon className="w-4 h-4 text-gray-500 hover:text-gray-700" />
            )}
          </button>

          {/* Reaction Buttons - Only for Assistant Messages */}
          {role === 'assistant' && (
            <>
              {Object.entries(reactionIcons).map(([key, { icon: Icon, label, color }]) => (
                <button
                  key={key}
                  onClick={() => toggleReaction(key)}
                  title={label}
                  aria-label={`${label} reaction`}
                  className={`
                    p-1.5 rounded-md transition-all duration-150
                    ${reactions[key as keyof typeof reactions]
                      ? 'bg-gray-200'
                      : 'hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 ${
                    reactions[key as keyof typeof reactions] ? color : 'text-gray-500'
                  }`} />
                </button>
              ))}

              {/* Save/Bookmark Button */}
              <button
                onClick={toggleSave}
                title="Save message"
                aria-label="Save message for later"
                className={`
                  p-1.5 rounded-md transition-all duration-150
                  ${reactions.bookmark ? 'bg-purple-100' : 'hover:bg-gray-100'}
                `}
              >
                {reactions.bookmark ? (
                  <BookmarkSolid className="w-4 h-4 text-purple-600" />
                ) : (
                  <BookmarkIcon className="w-4 h-4 text-gray-500" />
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
