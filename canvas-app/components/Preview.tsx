import React, { useEffect, useRef } from 'react';

interface PreviewProps {
  code: string;
}

const Preview: React.FC<PreviewProps> = ({ code }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current && code) {
      const doc = iframeRef.current.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(code);
        doc.close();
      }
    }
  }, [code]);

  if (!code) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-canvas-muted-deep bg-canvas-card border-2 border-dashed border-cyan-900/30 rounded-xl m-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-16 w-16 mb-4 opacity-20 text-cyan-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M9.75 17L9 21h6l-.75-4M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <p className="text-lg font-medium">Your preview will appear here</p>
        <p className="text-sm text-gray-600">Describe your app idea and click "Generate"</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-canvas-card shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 px-4 py-2 bg-canvas-card border-b border-cyan-900/30 text-xs text-canvas-muted-deep">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-primary-400"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
          <div className="w-3 h-3 rounded-full bg-green-400"></div>
        </div>
        <div className="flex-1 text-center font-mono opacity-60 truncate text-cyan-400/60">
          sanbayfusion.com/preview
        </div>
      </div>
      <iframe
        ref={iframeRef}
        title="App Preview"
        className="w-full h-full border-none"
        sandbox="allow-scripts allow-forms allow-popups allow-modals allow-downloads"
      />
    </div>
  );
};

export default Preview;
