/**
 * ImageToCode - Upload image and convert to HTML/React code
 * Uses AI vision to analyze UI mockups and generate code
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image, Loader2, Sparkles, X } from 'lucide-react';

interface ImageToCodeProps {
  onGenerate: (code: string) => void;
  onClose: () => void;
  outputType?: 'html' | 'react';
}

const ImageToCode: React.FC<ImageToCodeProps> = ({ 
  onGenerate, 
  onClose,
  outputType = 'html' 
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [outputLanguage, setOutputLanguage] = useState<'html' | 'react'>(outputType);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const imageFile = acceptedFiles[0];
    if (!imageFile) return;

    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (imageFile.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB');
      return;
    }

    setFile(imageFile);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(imageFile);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
    },
    maxFiles: 1,
  });

  const handleGenerate = async () => {
    if (!file || !preview) return;
    
    setIsGenerating(true);
    setError(null);

    try {
      // Convert to base64
      const base64 = preview.split(',')[1];

      const response = await fetch('/api/canvas/image-to-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          image: base64,
          mimeType: file.type,
          language: outputLanguage,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to convert image');
      }

      onGenerate(data.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const clearImage = () => {
    setPreview(null);
    setFile(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-canvas-card rounded-3xl shadow-2xl p-8 w-full max-w-lg relative border border-cyan-900/30">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-cyan-500/10 rounded-xl transition-colors"
        >
          <X className="w-5 h-5 text-canvas-muted-deep" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-cyan-900/50 to-emerald-900/50 rounded-xl">
            <Image className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-200">Image to Code</h2>
            <p className="text-sm text-canvas-muted-deep">Upload a UI mockup to generate code</p>
          </div>
        </div>

        {/* Output language selector */}
        <div className="flex gap-2 p-1 bg-canvas-card rounded-xl mb-6 border border-cyan-900/30">
          {(['html', 'react'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setOutputLanguage(lang)}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                outputLanguage === lang
                  ? 'bg-cyan-500/20 text-cyan-400 shadow-sm'
                  : 'text-canvas-muted-deep hover:text-cyan-400'
              }`}
            >
              {lang === 'html' ? 'HTML/CSS/JS' : 'React + Tailwind'}
            </button>
          ))}
        </div>

        {!preview ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
              isDragActive
                ? 'border-cyan-500 bg-cyan-500/10'
                : 'border-cyan-900/30 hover:border-cyan-500/50 hover:bg-cyan-500/5'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragActive ? 'text-cyan-400' : 'text-canvas-muted-deep'}`} />
            <p className="text-sm font-medium text-canvas-text mb-1">
              {isDragActive ? 'Drop the image here' : 'Drag & drop a UI screenshot'}
            </p>
            <p className="text-xs text-canvas-muted-deep">or click to browse (PNG, JPG, WebP)</p>
          </div>
        ) : (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="w-full rounded-2xl border border-cyan-900/30"
            />
            <button
              onClick={clearImage}
              className="absolute top-2 right-2 p-2 bg-primary-500 hover:bg-primary-600 rounded-xl transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-primary-400 bg-primary-500/10 rounded-xl p-3 border border-primary-500/30">{error}</p>
        )}

        {preview && (
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full mt-6 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate {outputLanguage === 'html' ? 'HTML' : 'React'} Code
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default ImageToCode;
