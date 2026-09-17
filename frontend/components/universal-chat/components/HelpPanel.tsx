import React, { useState, useRef } from 'react';
import { 
  HelpCircle, Bug, Smartphone, Headphones, Wrench, 
  FlaskConical, Gift, X, Send, Image, Loader2, Check,
  ExternalLink, ChevronLeft
} from 'lucide-react';

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  userId?: string;
}

const HelpPanel: React.FC<HelpPanelProps> = ({ isOpen, onClose, userEmail, userId }) => {
  const [showBugReport, setShowBugReport] = useState(false);
  const [bugDescription, setBugDescription] = useState('');
  const [bugImages, setBugImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const menuItems = [
    {
      id: 'bug',
      icon: Bug,
      label: 'Report Bug',
      description: 'Found an issue? Let us know',
      color: 'red',
      action: () => setShowBugReport(true)
    },
    {
      id: 'apps',
      icon: Smartphone,
      label: 'Download Apps',
      description: 'Get Maula AI on your devices',
      color: 'cyan',
      href: 'https://maula.ai/apps'
    },
    {
      id: 'support',
      icon: Headphones,
      label: 'Live Support',
      description: 'Chat with our support team',
      color: 'green',
      href: 'https://maula.ai/support/live-support'
    },
    {
      id: 'tools',
      icon: Wrench,
      label: 'AI Tools',
      description: 'Explore our AI tools',
      color: 'purple',
      href: 'https://maula.ai/tools'
    },
    {
      id: 'lab',
      icon: FlaskConical,
      label: 'AI Lab',
      description: 'Experimental features',
      color: 'amber',
      href: 'https://maula.ai/lab'
    },
    {
      id: 'rewards',
      icon: Gift,
      label: 'Rewards',
      description: 'Earn rewards & benefits',
      color: 'pink',
      href: 'https://maula.ai/rewards'
    }
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages = Array.from(files).slice(0, 5 - bugImages.length); // Max 5 images
      setBugImages([...bugImages, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    setBugImages(bugImages.filter((_, i) => i !== index));
  };

  const handleSubmitBug = async () => {
    if (!bugDescription.trim()) {
      setSubmitError('Please describe the bug');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const formData = new FormData();
      formData.append('description', bugDescription);
      formData.append('userEmail', userEmail || 'anonymous');
      formData.append('userId', userId || 'anonymous');
      formData.append('userAgent', navigator.userAgent);
      formData.append('url', window.location.href);
      formData.append('timestamp', new Date().toISOString());
      
      bugImages.forEach((image, index) => {
        formData.append(`image_${index}`, image);
      });

      const response = await fetch('/api/support/bug-report', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to submit bug report');
      }

      setSubmitSuccess(true);
      setBugDescription('');
      setBugImages([]);
      
      setTimeout(() => {
        setSubmitSuccess(false);
        setShowBugReport(false);
      }, 2000);
    } catch (error) {
      setSubmitError('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string; hover: string }> = {
      red: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', hover: 'hover:border-red-500/50 hover:bg-red-500/15' },
      cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', hover: 'hover:border-cyan-500/50 hover:bg-cyan-500/15' },
      green: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', hover: 'hover:border-green-500/50 hover:bg-green-500/15' },
      purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', hover: 'hover:border-purple-500/50 hover:bg-purple-500/15' },
      amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', hover: 'hover:border-amber-500/50 hover:bg-amber-500/15' },
      pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400', hover: 'hover:border-pink-500/50 hover:bg-pink-500/15' }
    };
    return colors[color] || colors.cyan;
  };

  return (
    <aside className={`absolute top-0 right-0 h-full w-[85%] sm:w-72 md:w-80 bg-[#0a0a0a]/98 backdrop-blur-xl border-l border-gray-800/50 transition-transform duration-500 ease-out z-[55] flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.5)] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-gray-900">
        <div className="flex items-center gap-3">
          {showBugReport ? (
            <button 
              onClick={() => setShowBugReport(false)}
              className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ChevronLeft size={18} className="text-gray-400" />
            </button>
          ) : (
            <HelpCircle size={18} className="text-purple-500" />
          )}
          <h2 className="text-purple-400 font-bold uppercase tracking-tighter text-sm font-mono">
            {showBugReport ? 'REPORT_BUG' : 'HELP_CENTER'}
          </h2>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <X size={16} className="text-gray-500 hover:text-gray-300" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-grow overflow-y-auto custom-scrollbar p-4">
        {showBugReport ? (
          /* Bug Report Form */
          <div className="space-y-4">
            {submitSuccess ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check size={32} className="text-green-400" />
                </div>
                <p className="text-green-400 font-medium">Bug Report Submitted!</p>
                <p className="text-gray-500 text-xs text-center">Thank you for helping us improve</p>
              </div>
            ) : (
              <>
                {/* Description */}
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                    Describe the issue
                  </label>
                  <textarea
                    value={bugDescription}
                    onChange={(e) => setBugDescription(e.target.value)}
                    placeholder="What went wrong? Please be as detailed as possible..."
                    className="w-full h-32 bg-[#111] border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20 focus:outline-none transition-all resize-none"
                  />
                </div>

                {/* Image Upload */}
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                    Screenshots (optional)
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                  
                  {bugImages.length < 5 && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3 border border-dashed border-gray-700 rounded-lg flex items-center justify-center gap-2 text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-colors"
                    >
                      <Image size={16} />
                      <span className="text-xs">Add Screenshots</span>
                    </button>
                  )}

                  {/* Image Previews */}
                  {bugImages.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {bugImages.map((image, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={URL.createObjectURL(image)} 
                            alt={`Screenshot ${index + 1}`}
                            className="w-16 h-16 object-cover rounded-lg border border-gray-800"
                          />
                          <button
                            onClick={() => removeImage(index)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={10} className="text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-gray-600">{bugImages.length}/5 images</p>
                </div>

                {/* User Info Note */}
                <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-800/50">
                  <p className="text-[10px] text-gray-500">
                    Your account details and device info will be included to help us investigate.
                  </p>
                </div>

                {/* Error Message */}
                {submitError && (
                  <p className="text-xs text-red-400 text-center">{submitError}</p>
                )}

                {/* Submit Button */}
                <button
                  onClick={handleSubmitBug}
                  disabled={isSubmitting || !bugDescription.trim()}
                  className="w-full py-3 bg-gradient-to-r from-red-500/20 to-red-600/10 text-red-400 border border-red-500/30 rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:from-red-500/30 hover:to-red-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Submit Bug Report
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        ) : (
          /* Menu Items */
          <div className="space-y-3">
            {menuItems.map((item) => {
              const colors = getColorClasses(item.color);
              const Icon = item.icon;

              if (item.href) {
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-4 p-4 rounded-xl border ${colors.border} ${colors.hover} transition-all group`}
                  >
                    <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
                      <Icon size={20} className={colors.text} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-200">{item.label}</span>
                        <ExternalLink size={12} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
                      </div>
                      <p className="text-[11px] text-gray-500">{item.description}</p>
                    </div>
                  </a>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border ${colors.border} ${colors.hover} transition-all text-left`}
                >
                  <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
                    <Icon size={20} className={colors.text} />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-200">{item.label}</span>
                    <p className="text-[11px] text-gray-500">{item.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-900 bg-[#0a0a0a]/50">
        <p className="text-[10px] text-gray-600 text-center">
          Need help? Contact us at{' '}
          <a href="mailto:support@maula.ai" className="text-purple-400 hover:text-purple-300">
            support@maula.ai
          </a>
        </p>
      </div>
    </aside>
  );
};

export default HelpPanel;
