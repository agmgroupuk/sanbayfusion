import React from 'react';
import { BlogPost } from '@/app/constants';

interface BlogPostViewerProps {
  post: BlogPost;
  onNavigate: (page: 'blog' | 'home') => void;
}

const BlogPostViewer: React.FC<BlogPostViewerProps> = ({ post, onNavigate }) => {
  const getEra = (year?: number | string) => {
    if (!year) return { name: 'Modern', color: 'bg-teal-500', icon: '🤖' };
    
    // Convert string years to number if needed (take the first year if range)
    const yearNum = typeof year === 'string' ? parseInt(year.split('-')[0]) : year;
    
    if (yearNum >= 1940 && yearNum <= 1955) return { name: 'Foundations', color: 'bg-purple-500', icon: '🧮' };
    if (yearNum >= 1956 && yearNum <= 1969) return { name: 'Birth of AI', color: 'bg-blue-500', icon: '🧠' };
    if (yearNum >= 1970 && yearNum <= 1979) return { name: 'Expert Systems', color: 'bg-green-500', icon: '💡' };
    if (yearNum >= 1980 && yearNum <= 1989) return { name: 'AI Winter', color: 'bg-gray-500', icon: '❄️' };
    if (yearNum >= 1990 && yearNum <= 1999) return { name: 'Revival', color: 'bg-orange-500', icon: '🔥' };
    if (yearNum >= 2000 && yearNum <= 2009) return { name: 'Data Era', color: 'bg-cyan-500', icon: '📊' };
    if (yearNum >= 2010 && yearNum <= 2019) return { name: 'Deep Learning', color: 'bg-indigo-500', icon: '🚀' };
    if (yearNum >= 2020 && yearNum <= 2025) return { name: 'Transformers', color: 'bg-pink-500', icon: '✨' };
    
    return { name: 'Modern', color: 'bg-teal-500', icon: '🤖' };
  };

  const getBackDestination = (): 'blog' | 'home' => {
    return 'blog';
  };

  const era = getEra(post.year);

  return (
    <div className="py-20 md:py-28 relative">
      {/* Header Spacer */}
      <div className="h-20"></div>
      
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
             <button onClick={() => onNavigate(getBackDestination())} title="Return to the blog page" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
                &larr; Back to Blog
             </button>
             
             {/* Era Badge */}
             <span className={`${era.color} text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1`}>
               <span>{era.icon}</span>
               {era.name}
             </span>
          </div>
          
          <article>
            <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                {post.year && (
                  <span className="font-bold text-white px-3 py-1 rounded-lg text-sm shadow-md" style={{ 
                    background: 'linear-gradient(135deg, var(--ca-teal), var(--ca-amber))',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}>
                    {post.year}
                  </span>
                )}
                <span>{post.date}</span>
                {post.author && (
                  <>
                    <span className="mx-2">&bull;</span>
                    <span>By {post.author}</span>
                  </>
                )}
                {post.category && (
                  <>
                    <span className="mx-2">&bull;</span>
                    <span>{post.category}</span>
                  </>
                )}
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-6">
                {post.title}
            </h1>
            
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {post.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="ca-text-secondary px-3 py-1 rounded-full text-sm"
                    style={{ background: 'var(--ca-glass-bg)' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div 
              className="prose prose-invert prose-lg max-w-none text-gray-300 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: post.content || post.excerpt }} 
            />
            
            {post.references && post.references.length > 0 && (
              <footer className="mt-12 pt-8 border-t border-gray-800">
                <h3 className="text-lg font-semibold ca-text-primary mb-4">References</h3>
                <ul className="space-y-2">
                  {post.references.map((ref: string, index: number) => (
                    <li key={index} className="text-sm ca-text-secondary">
                      {index + 1}. {ref}
                    </li>
                  ))}
                </ul>
              </footer>
            )}
          </article>
          
          <div className="mt-12 pt-8 border-t border-gray-800 flex justify-between">
             <button onClick={() => onNavigate(getBackDestination())} title="Return to the blog page" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                &larr; Back to AI History
             </button>
             <button onClick={() => onNavigate('home')} title="Return to the homepage" className="text-gray-400 hover:text-cyan-400 transition-colors">
                &larr; Back to Home
             </button>
          </div>
        </div>
      </div>
       <style>{`
            .prose-invert h1, .prose-invert h2, .prose-invert h3, .prose-invert h4, .prose-invert h5, .prose-invert h6, .prose-invert strong { color: #fff; }
            .prose-invert a { color: #67e8f9; }
            .prose-invert a:hover { color: #22d3ee; }
            .prose-invert blockquote { border-left-color: #0891b2; color: #9ca3af; }
            .prose-invert .grid { display: grid; }
            .prose-invert .grid.md\\:grid-cols-2 { grid-template-columns: 1fr; }
            @media (min-width: 768px) {
              .prose-invert .grid.md\\:grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
            }
            .prose-invert .gap-6 { gap: 1.5rem; }
            .prose-invert .mb-6 { margin-bottom: 1.5rem; }
            .prose-invert .p-6 { padding: 1.5rem; }
            .prose-invert .rounded-lg { border-radius: 0.5rem; }
            .prose-invert .space-y-2 > * + * { margin-top: 0.5rem; }
            .prose-invert .text-sm { font-size: 0.875rem; }
            .prose-invert .font-semibold { font-weight: 600; }
            .prose-invert grid { display: grid; }
       `}</style>
    </div>
  );
};

export default BlogPostViewer;