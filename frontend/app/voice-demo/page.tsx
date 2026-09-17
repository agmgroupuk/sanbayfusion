'use client'

import { useState } from 'react'
import VoiceInput from '@/components/VoiceInput'

export default function VoiceInputDemo() {
  const [transcription, setTranscription] = useState<string>('')
  const [response, setResponse] = useState<string>('')
  const [error, setError] = useState<string>('')

  const handleTranscription = (text: string) => {
    setTranscription(text)
    console.log('Transcription:', text)
  }

  const handleResponse = (text: string) => {
    setResponse(text)
    console.log('Response:', text)
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
    console.error('Voice Error:', errorMessage)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
              <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Enhanced Voice Input Demo</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Experience the improved voice input component with better visual feedback, 
              confirmation messages, and enhanced user experience.
            </p>
          </div>

          {/* Voice Input Component */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              🎙️ Voice Input Component
            </h2>
            
            <VoiceInput
              onTranscription={handleTranscription}
              onResponse={handleResponse}
              onError={handleError}
              agent="demo-agent"
              voice="alloy"
              userId="demo-user"
              conversationId="demo-conversation"
              className="w-full"
            />
          </div>

          {/* Demo Results */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Transcription Display */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-blue-500 mr-2">🎯</span>
                Transcription
              </h3>
              <div className="bg-blue-50 rounded-lg p-4 min-h-[100px]">
                {transcription ? (
                  <p className="text-blue-800 text-sm">{transcription}</p>
                ) : (
                  <p className="text-blue-400 text-sm italic">Your speech will appear here...</p>
                )}
              </div>
            </div>

            {/* Response Display */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-green-500 mr-2">🤖</span>
                AI Response
              </h3>
              <div className="bg-green-50 rounded-lg p-4 min-h-[100px]">
                {response ? (
                  <p className="text-green-800 text-sm">{response}</p>
                ) : (
                  <p className="text-green-400 text-sm italic">AI response will appear here...</p>
                )}
              </div>
            </div>

            {/* Error Display */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-red-500 mr-2">⚠️</span>
                Status & Errors
              </h3>
              <div className="bg-red-50 rounded-lg p-4 min-h-[100px]">
                {error ? (
                  <p className="text-red-800 text-sm">{error}</p>
                ) : (
                  <p className="text-red-400 text-sm italic">No errors - system ready!</p>
                )}
              </div>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="mt-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-6 text-center">🚀 Enhanced Features</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl mb-2">🎯</div>
                <h4 className="font-semibold mb-2">Visual Feedback</h4>
                <p className="text-blue-100 text-sm">Real-time visual indicators show recording and processing states</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">✅</div>
                <h4 className="font-semibold mb-2">Confirmation Messages</h4>
                <p className="text-blue-100 text-sm">Clear success and error messages with auto-dismiss</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">🎙️</div>
                <h4 className="font-semibold mb-2">Listening Indicators</h4>
                <p className="text-blue-100 text-sm">Animated dots and pulse effects show active listening</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">⚡</div>
                <h4 className="font-semibold mb-2">Processing Stages</h4>
                <p className="text-blue-100 text-sm">Track progress through transcription and response generation</p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-4">📋 How to Test</h3>
            <div className="text-yellow-700 text-sm space-y-2">
              <p><strong>1.</strong> Click the microphone button to start recording</p>
              <p><strong>2.</strong> Watch for the visual feedback: pulse animation, listening indicators, and timer</p>
              <p><strong>3.</strong> Speak clearly into your microphone</p>
              <p><strong>4.</strong> Click again to stop, or let it auto-stop</p>
              <p><strong>5.</strong> Observe the processing stages: transcribing → generating → complete</p>
              <p><strong>6.</strong> See confirmation messages and results in the panels above</p>
            </div>
          </div>

          {/* Back Navigation */}
          <div className="text-center mt-8">
            <a
              href="https://maula.ai/agents"
              className="inline-flex items-center px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              ← Back to Agents
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}