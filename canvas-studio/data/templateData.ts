// Template data with full multi-file code for each template
// Each template includes HTML, CSS, and JS files with complete, professional implementations

export interface TemplateFile {
  path: string;
  content: string;
  language: string;
}

export interface Template {
  name: string;
  icon: string;
  category: string;
  description: string;
  prompt: string;
  tags: string[];
  files: TemplateFile[];
}

export const TEMPLATE_CATEGORIES = [
  { id: 'all', name: 'All Templates', icon: '📋' },
  { id: 'business', name: 'Business', icon: '🏢' },
  { id: 'restaurant', name: 'Restaurant', icon: '🍽️' },
  { id: 'ecommerce', name: 'E-commerce', icon: '🛒' },
  { id: 'portfolio', name: 'Portfolio', icon: '🎨' },
  { id: 'dashboard', name: 'Dashboard', icon: '📊' },
  { id: 'education', name: 'Education', icon: '📚' },
  { id: 'health', name: 'Healthcare', icon: '🏥' },
  { id: 'social', name: 'Social', icon: '💬' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
  { id: 'tech', name: 'Technology', icon: '🚀' },
];

export const STUDIO_TEMPLATES: Template[] = [
  // ═══════════════════════════════════════════
  // BUSINESS & CORPORATE (5)
  // ═══════════════════════════════════════════

  // 1. Corporate Landing Page
  {
    name: 'Corporate Landing Page',
    icon: '🏢',
    category: 'business',
    description: 'Professional corporate landing page with hero, services, team, testimonials, and contact form.',
    prompt: 'Build a professional corporate landing page with a hero section featuring company tagline, services grid with icons, team section with member cards (photo placeholder, name, role), client logos marquee, testimonials slider, contact form, and a sticky navigation bar. Use a clean blue and white color scheme with subtle shadows.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nexus Corp — Corporate Landing</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-white text-gray-800 font-sans">
  <!-- Sticky Nav -->
  <nav id="navbar" class="fixed top-0 w-full bg-white/90 backdrop-blur border-b border-gray-100 z-50 transition-shadow">
    <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <a href="#" class="text-2xl font-bold text-blue-600">Nexus<span class="text-gray-800">Corp</span></a>
      <div class="hidden md:flex items-center gap-8">
        <a href="#services" class="text-sm font-medium text-gray-600 hover:text-blue-600 transition">Services</a>
        <a href="#team" class="text-sm font-medium text-gray-600 hover:text-blue-600 transition">Team</a>
        <a href="#testimonials" class="text-sm font-medium text-gray-600 hover:text-blue-600 transition">Testimonials</a>
        <a href="#contact" class="text-sm font-medium text-gray-600 hover:text-blue-600 transition">Contact</a>
        <a href="#contact" class="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition">Get Started</a>
      </div>
      <button id="mobileMenuBtn" class="md:hidden text-gray-600">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
    </div>
  </nav>

  <!-- Hero -->
  <section class="pt-32 pb-20 bg-gradient-to-br from-blue-50 via-white to-blue-50">
    <div class="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-12">
      <div class="flex-1 text-center md:text-left">
        <p class="text-blue-600 font-semibold text-sm uppercase tracking-wider mb-3">Welcome to NexusCorp</p>
        <h1 class="text-4xl md:text-6xl font-extrabold leading-tight mb-6">We Build <span class="text-blue-600">Digital Solutions</span> That Scale</h1>
        <p class="text-lg text-canvas-muted-deep max-w-lg mb-8">Empowering businesses with cutting-edge technology, strategy, and design to drive growth and innovation.</p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
          <a href="#contact" class="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-200">Start a Project</a>
          <a href="#services" class="px-8 py-3 border-2 border-gray-300 text-gray-700 font-bold rounded-lg hover:border-blue-600 hover:text-blue-600 transition">Learn More</a>
        </div>
      </div>
      <div class="flex-1">
        <div class="w-full aspect-square max-w-md mx-auto bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl flex items-center justify-center">
          <span class="text-8xl">🏢</span>
        </div>
      </div>
    </div>
  </section>

  <!-- Services -->
  <section id="services" class="py-20 bg-white">
    <div class="max-w-7xl mx-auto px-6">
      <div class="text-center mb-16">
        <p class="text-blue-600 font-semibold text-sm uppercase tracking-wider mb-2">What We Do</p>
        <h2 class="text-3xl md:text-4xl font-bold">Our Services</h2>
      </div>
      <div class="grid md:grid-cols-3 gap-8">
        <div class="p-8 bg-gray-50 rounded-2xl hover:shadow-xl transition group">
          <div class="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-2xl mb-5 group-hover:bg-blue-600 group-hover:text-white transition">💡</div>
          <h3 class="text-xl font-bold mb-3">Strategy Consulting</h3>
          <p class="text-canvas-muted-deep text-sm leading-relaxed">Data-driven strategies that align technology with your business objectives for maximum impact.</p>
        </div>
        <div class="p-8 bg-gray-50 rounded-2xl hover:shadow-xl transition group">
          <div class="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-2xl mb-5 group-hover:bg-blue-600 group-hover:text-white transition">🎨</div>
          <h3 class="text-xl font-bold mb-3">UI/UX Design</h3>
          <p class="text-canvas-muted-deep text-sm leading-relaxed">Beautiful, intuitive interfaces that delight users and drive engagement across all platforms.</p>
        </div>
        <div class="p-8 bg-gray-50 rounded-2xl hover:shadow-xl transition group">
          <div class="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-2xl mb-5 group-hover:bg-blue-600 group-hover:text-white transition">⚙️</div>
          <h3 class="text-xl font-bold mb-3">Development</h3>
          <p class="text-canvas-muted-deep text-sm leading-relaxed">Scalable, robust software solutions built with modern architectures and best practices.</p>
        </div>
        <div class="p-8 bg-gray-50 rounded-2xl hover:shadow-xl transition group">
          <div class="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-2xl mb-5 group-hover:bg-blue-600 group-hover:text-white transition">☁️</div>
          <h3 class="text-xl font-bold mb-3">Cloud Solutions</h3>
          <p class="text-canvas-muted-deep text-sm leading-relaxed">Migrate, optimize, and manage your cloud infrastructure for reliability and performance.</p>
        </div>
        <div class="p-8 bg-gray-50 rounded-2xl hover:shadow-xl transition group">
          <div class="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-2xl mb-5 group-hover:bg-blue-600 group-hover:text-white transition">🔒</div>
          <h3 class="text-xl font-bold mb-3">Cybersecurity</h3>
          <p class="text-canvas-muted-deep text-sm leading-relaxed">End-to-end security solutions to protect your data, applications, and digital assets.</p>
        </div>
        <div class="p-8 bg-gray-50 rounded-2xl hover:shadow-xl transition group">
          <div class="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-2xl mb-5 group-hover:bg-blue-600 group-hover:text-white transition">📊</div>
          <h3 class="text-xl font-bold mb-3">Analytics</h3>
          <p class="text-canvas-muted-deep text-sm leading-relaxed">Turn raw data into actionable insights with advanced analytics and visualization tools.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Team -->
  <section id="team" class="py-20 bg-gray-50">
    <div class="max-w-7xl mx-auto px-6">
      <div class="text-center mb-16">
        <p class="text-blue-600 font-semibold text-sm uppercase tracking-wider mb-2">Our People</p>
        <h2 class="text-3xl md:text-4xl font-bold">Meet the Team</h2>
      </div>
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div class="bg-white rounded-2xl p-6 text-center hover:shadow-lg transition">
          <div class="w-24 h-24 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl">👨‍💼</div>
          <h4 class="font-bold text-lg">James Wilson</h4>
          <p class="text-blue-600 text-sm font-medium">CEO & Founder</p>
          <p class="text-canvas-muted text-xs mt-2">15+ years in tech leadership</p>
        </div>
        <div class="bg-white rounded-2xl p-6 text-center hover:shadow-lg transition">
          <div class="w-24 h-24 bg-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl">👩‍💻</div>
          <h4 class="font-bold text-lg">Sarah Chen</h4>
          <p class="text-blue-600 text-sm font-medium">CTO</p>
          <p class="text-canvas-muted text-xs mt-2">Full-stack architect</p>
        </div>
        <div class="bg-white rounded-2xl p-6 text-center hover:shadow-lg transition">
          <div class="w-24 h-24 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl">👩‍🎨</div>
          <h4 class="font-bold text-lg">Maya Patel</h4>
          <p class="text-blue-600 text-sm font-medium">Design Lead</p>
          <p class="text-canvas-muted text-xs mt-2">Award-winning designer</p>
        </div>
        <div class="bg-white rounded-2xl p-6 text-center hover:shadow-lg transition">
          <div class="w-24 h-24 bg-yellow-100 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl">👨‍🔬</div>
          <h4 class="font-bold text-lg">Alex Rivera</h4>
          <p class="text-blue-600 text-sm font-medium">Data Scientist</p>
          <p class="text-canvas-muted text-xs mt-2">AI/ML specialist</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Client Logos -->
  <section class="py-12 bg-white border-y border-gray-100">
    <div class="max-w-7xl mx-auto px-6">
      <p class="text-center text-xs text-canvas-muted uppercase tracking-widest mb-8">Trusted by 500+ Companies</p>
      <div class="flex items-center justify-center gap-12 flex-wrap opacity-50" id="logoMarquee">
        <span class="text-2xl font-bold text-canvas-text">ACME Inc</span>
        <span class="text-2xl font-bold text-canvas-text">TechFlow</span>
        <span class="text-2xl font-bold text-canvas-text">CloudBase</span>
        <span class="text-2xl font-bold text-canvas-text">DataSync</span>
        <span class="text-2xl font-bold text-canvas-text">NetPrime</span>
        <span class="text-2xl font-bold text-canvas-text">CyberEdge</span>
      </div>
    </div>
  </section>

  <!-- Testimonials -->
  <section id="testimonials" class="py-20 bg-blue-600 text-white">
    <div class="max-w-4xl mx-auto px-6 text-center">
      <p class="text-blue-200 font-semibold text-sm uppercase tracking-wider mb-2">Testimonials</p>
      <h2 class="text-3xl md:text-4xl font-bold mb-12">What Clients Say</h2>
      <div id="testimonialSlider" class="relative">
        <div class="testimonial-slide active">
          <p class="text-xl md:text-2xl font-light leading-relaxed mb-8">"NexusCorp transformed our digital presence completely. Their team delivered beyond expectations with incredible attention to detail."</p>
          <p class="font-bold">— Emily Thompson, CEO at TechFlow</p>
        </div>
        <div class="testimonial-slide">
          <p class="text-xl md:text-2xl font-light leading-relaxed mb-8">"The best technology partner we've ever worked with. Professional, innovative, and always on time."</p>
          <p class="font-bold">— David Park, CTO at DataSync</p>
        </div>
        <div class="testimonial-slide">
          <p class="text-xl md:text-2xl font-light leading-relaxed mb-8">"Their cloud migration saved us 40% on infrastructure costs while improving our system reliability to 99.99%."</p>
          <p class="font-bold">— Lisa Wang, VP Engineering at CloudBase</p>
        </div>
      </div>
      <div class="flex justify-center gap-2 mt-8" id="testimonialDots"></div>
    </div>
  </section>

  <!-- Contact -->
  <section id="contact" class="py-20 bg-gray-50">
    <div class="max-w-3xl mx-auto px-6">
      <div class="text-center mb-12">
        <p class="text-blue-600 font-semibold text-sm uppercase tracking-wider mb-2">Get In Touch</p>
        <h2 class="text-3xl md:text-4xl font-bold">Start Your Project</h2>
      </div>
      <form id="contactForm" class="bg-white rounded-2xl p-8 shadow-lg space-y-6">
        <div class="grid md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input type="text" class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" placeholder="John Doe" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" placeholder="john@company.com" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <select class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition">
            <option>Strategy Consulting</option>
            <option>UI/UX Design</option>
            <option>Development</option>
            <option>Cloud Solutions</option>
            <option>Other</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea rows="4" class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none" placeholder="Tell us about your project..."></textarea>
        </div>
        <button type="submit" class="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-200">Send Message</button>
      </form>
    </div>
  </section>

  <!-- Footer -->
  <footer class="py-8 bg-gray-900 text-canvas-muted text-center text-sm">
    <p>&copy; 2026 NexusCorp. All rights reserved.</p>
  </footer>

  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `/* Corporate Landing Page — Custom Styles */
.testimonial-slide { display: none; animation: fadeIn 0.6s ease; }
.testimonial-slide.active { display: block; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* Smooth scroll */
html { scroll-behavior: smooth; }

/* Nav shadow on scroll */
.nav-scrolled { box-shadow: 0 2px 20px rgba(0,0,0,0.08); }

/* Dot styles */
.testimonial-dot {
  width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.3);
  cursor: pointer; transition: all 0.3s;
}
.testimonial-dot.active { background: white; transform: scale(1.3); }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `// Sticky nav shadow
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('nav-scrolled', window.scrollY > 10);
});

// Testimonial slider
const slides = document.querySelectorAll('.testimonial-slide');
const dotsContainer = document.getElementById('testimonialDots');
let currentSlide = 0;

slides.forEach((_, i) => {
  const dot = document.createElement('span');
  dot.className = 'testimonial-dot' + (i === 0 ? ' active' : '');
  dot.addEventListener('click', () => goToSlide(i));
  dotsContainer.appendChild(dot);
});

function goToSlide(n) {
  slides[currentSlide].classList.remove('active');
  dotsContainer.children[currentSlide].classList.remove('active');
  currentSlide = n;
  slides[currentSlide].classList.add('active');
  dotsContainer.children[currentSlide].classList.add('active');
}
setInterval(() => goToSlide((currentSlide + 1) % slides.length), 5000);

// Contact form
document.getElementById('contactForm').addEventListener('submit', e => {
  e.preventDefault();
  alert('Thank you! We will get back to you soon.');
  e.target.reset();
});
`,
      },
    ],
  },

  // 2. Consulting Firm Website
  {
    name: 'Consulting Firm Website',
    icon: '💼',
    category: 'business',
    description: 'Full-width hero, flip-card services, case studies portfolio, pricing tiers, FAQ accordion.',
    prompt: 'Create a consulting firm website with a full-width hero video placeholder, service cards with flip animation on hover, case studies section with filterable portfolio grid, a process/methodology timeline, pricing table with 3 tiers, FAQ accordion, and footer with office locations map placeholder.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Apex Consulting</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-white text-gray-800 font-sans">
  <!-- Nav -->
  <nav class="fixed top-0 w-full bg-white/95 backdrop-blur z-50 border-b border-gray-100">
    <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <span class="text-xl font-bold text-gray-900">Apex<span class="text-indigo-600">.</span></span>
      <div class="hidden md:flex gap-6">
        <a href="#services" class="text-sm text-gray-600 hover:text-indigo-600 transition">Services</a>
        <a href="#process" class="text-sm text-gray-600 hover:text-indigo-600 transition">Process</a>
        <a href="#cases" class="text-sm text-gray-600 hover:text-indigo-600 transition">Case Studies</a>
        <a href="#pricing" class="text-sm text-gray-600 hover:text-indigo-600 transition">Pricing</a>
        <a href="#faq" class="text-sm text-gray-600 hover:text-indigo-600 transition">FAQ</a>
      </div>
      <a href="#pricing" class="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition">Book a Call</a>
    </div>
  </nav>

  <!-- Hero with Video Placeholder -->
  <section class="relative pt-16 min-h-screen flex items-center justify-center overflow-hidden">
    <div class="absolute inset-0 bg-gradient-to-br from-indigo-900 to-gray-900"></div>
    <div class="absolute inset-0 bg-black/30 flex items-center justify-center">
      <div class="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center cursor-pointer hover:bg-white/30 transition">
        <svg class="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      </div>
    </div>
    <div class="relative text-center text-white px-6 z-10 max-w-4xl">
      <p class="text-indigo-300 font-semibold text-sm uppercase tracking-widest mb-4">Strategy · Growth · Innovation</p>
      <h1 class="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">Transform Your Business Vision</h1>
      <p class="text-xl text-canvas-text max-w-2xl mx-auto mb-8">We help companies navigate complex challenges and unlock their full potential through data-driven consulting.</p>
      <a href="#pricing" class="inline-block px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition shadow-2xl">Get Started →</a>
    </div>
  </section>

  <!-- Services with Flip Cards -->
  <section id="services" class="py-20 bg-gray-50">
    <div class="max-w-7xl mx-auto px-6">
      <div class="text-center mb-16">
        <h2 class="text-3xl font-bold">Our Expertise</h2>
        <p class="text-canvas-muted-deep mt-2">Comprehensive solutions for every business challenge</p>
      </div>
      <div class="grid md:grid-cols-3 gap-8">
        <div class="flip-card h-64">
          <div class="flip-card-inner">
            <div class="flip-card-front bg-white rounded-2xl p-8 flex flex-col items-center justify-center shadow">
              <span class="text-4xl mb-4">📈</span>
              <h3 class="text-xl font-bold">Growth Strategy</h3>
            </div>
            <div class="flip-card-back bg-indigo-600 text-white rounded-2xl p-8 flex items-center justify-center">
              <p class="text-sm leading-relaxed">Market analysis, competitive positioning, and growth roadmaps tailored to your industry.</p>
            </div>
          </div>
        </div>
        <div class="flip-card h-64">
          <div class="flip-card-inner">
            <div class="flip-card-front bg-white rounded-2xl p-8 flex flex-col items-center justify-center shadow">
              <span class="text-4xl mb-4">🔄</span>
              <h3 class="text-xl font-bold">Digital Transformation</h3>
            </div>
            <div class="flip-card-back bg-indigo-600 text-white rounded-2xl p-8 flex items-center justify-center">
              <p class="text-sm leading-relaxed">End-to-end digital modernization from legacy systems to cloud-native architectures.</p>
            </div>
          </div>
        </div>
        <div class="flip-card h-64">
          <div class="flip-card-inner">
            <div class="flip-card-front bg-white rounded-2xl p-8 flex flex-col items-center justify-center shadow">
              <span class="text-4xl mb-4">🎯</span>
              <h3 class="text-xl font-bold">Operations</h3>
            </div>
            <div class="flip-card-back bg-indigo-600 text-white rounded-2xl p-8 flex items-center justify-center">
              <p class="text-sm leading-relaxed">Streamline workflows, reduce costs, and improve efficiency across your organization.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Process Timeline -->
  <section id="process" class="py-20 bg-white">
    <div class="max-w-5xl mx-auto px-6">
      <h2 class="text-3xl font-bold text-center mb-16">Our Methodology</h2>
      <div class="space-y-12">
        <div class="flex items-start gap-6">
          <div class="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-lg shrink-0">1</div>
          <div><h3 class="text-xl font-bold mb-1">Discovery & Audit</h3><p class="text-canvas-muted-deep">Deep-dive into your current state, stakeholder interviews, and market assessment.</p></div>
        </div>
        <div class="flex items-start gap-6">
          <div class="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-lg shrink-0">2</div>
          <div><h3 class="text-xl font-bold mb-1">Strategy Design</h3><p class="text-canvas-muted-deep">Develop actionable roadmap with clear milestones, KPIs, and resource planning.</p></div>
        </div>
        <div class="flex items-start gap-6">
          <div class="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-lg shrink-0">3</div>
          <div><h3 class="text-xl font-bold mb-1">Implementation</h3><p class="text-canvas-muted-deep">Execute with agile sprints, regular check-ins, and adaptive course correction.</p></div>
        </div>
        <div class="flex items-start gap-6">
          <div class="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-lg shrink-0">4</div>
          <div><h3 class="text-xl font-bold mb-1">Measure & Optimize</h3><p class="text-canvas-muted-deep">Track results against goals, iterate on findings, and scale what works.</p></div>
        </div>
      </div>
    </div>
  </section>

  <!-- Case Studies -->
  <section id="cases" class="py-20 bg-gray-50">
    <div class="max-w-7xl mx-auto px-6">
      <h2 class="text-3xl font-bold text-center mb-4">Case Studies</h2>
      <div class="flex justify-center gap-3 mb-12">
        <button class="case-filter active px-4 py-1.5 text-sm rounded-full" data-filter="all">All</button>
        <button class="case-filter px-4 py-1.5 text-sm rounded-full" data-filter="strategy">Strategy</button>
        <button class="case-filter px-4 py-1.5 text-sm rounded-full" data-filter="digital">Digital</button>
        <button class="case-filter px-4 py-1.5 text-sm rounded-full" data-filter="operations">Operations</button>
      </div>
      <div class="grid md:grid-cols-3 gap-6" id="caseGrid">
        <div class="case-card bg-white rounded-xl overflow-hidden shadow hover:shadow-lg transition" data-cat="strategy">
          <div class="h-48 bg-gradient-to-br from-blue-400 to-indigo-500"></div>
          <div class="p-5"><span class="text-xs text-indigo-600 font-bold uppercase">Strategy</span><h4 class="font-bold mt-1">FinTech Market Entry</h4><p class="text-canvas-muted-deep text-sm mt-1">Helped a startup capture 12% market share in 8 months.</p></div>
        </div>
        <div class="case-card bg-white rounded-xl overflow-hidden shadow hover:shadow-lg transition" data-cat="digital">
          <div class="h-48 bg-gradient-to-br from-green-400 to-emerald-500"></div>
          <div class="p-5"><span class="text-xs text-indigo-600 font-bold uppercase">Digital</span><h4 class="font-bold mt-1">E-commerce Platform</h4><p class="text-canvas-muted-deep text-sm mt-1">300% revenue increase after full digital transformation.</p></div>
        </div>
        <div class="case-card bg-white rounded-xl overflow-hidden shadow hover:shadow-lg transition" data-cat="operations">
          <div class="h-48 bg-gradient-to-br from-orange-400 to-primary-500"></div>
          <div class="p-5"><span class="text-xs text-indigo-600 font-bold uppercase">Operations</span><h4 class="font-bold mt-1">Supply Chain Optimization</h4><p class="text-canvas-muted-deep text-sm mt-1">Reduced logistics costs by 35% across 12 warehouses.</p></div>
        </div>
      </div>
    </div>
  </section>

  <!-- Pricing -->
  <section id="pricing" class="py-20 bg-white">
    <div class="max-w-5xl mx-auto px-6">
      <h2 class="text-3xl font-bold text-center mb-12">Pricing Plans</h2>
      <div class="grid md:grid-cols-3 gap-8">
        <div class="border border-gray-200 rounded-2xl p-8 hover:shadow-lg transition">
          <h3 class="font-bold text-lg mb-2">Starter</h3>
          <p class="text-4xl font-extrabold mb-1">$2,999<span class="text-base text-canvas-muted font-normal">/mo</span></p>
          <p class="text-canvas-muted-deep text-sm mb-6">For small teams getting started</p>
          <ul class="space-y-3 text-sm text-gray-600 mb-8">
            <li>✓ Strategy audit</li><li>✓ Monthly check-ins</li><li>✓ Basic analytics</li><li>✓ Email support</li>
          </ul>
          <button class="w-full py-3 border-2 border-indigo-600 text-indigo-600 font-bold rounded-lg hover:bg-indigo-50 transition">Choose Plan</button>
        </div>
        <div class="border-2 border-indigo-600 rounded-2xl p-8 shadow-xl relative">
          <span class="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full">Popular</span>
          <h3 class="font-bold text-lg mb-2">Growth</h3>
          <p class="text-4xl font-extrabold mb-1">$7,999<span class="text-base text-canvas-muted font-normal">/mo</span></p>
          <p class="text-canvas-muted-deep text-sm mb-6">For scaling businesses</p>
          <ul class="space-y-3 text-sm text-gray-600 mb-8">
            <li>✓ Everything in Starter</li><li>✓ Weekly sprints</li><li>✓ Dedicated team</li><li>✓ Priority support</li>
          </ul>
          <button class="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition">Choose Plan</button>
        </div>
        <div class="border border-gray-200 rounded-2xl p-8 hover:shadow-lg transition">
          <h3 class="font-bold text-lg mb-2">Enterprise</h3>
          <p class="text-4xl font-extrabold mb-1">Custom</p>
          <p class="text-canvas-muted-deep text-sm mb-6">For large organizations</p>
          <ul class="space-y-3 text-sm text-gray-600 mb-8">
            <li>✓ Everything in Growth</li><li>✓ On-site workshops</li><li>✓ C-level advisory</li><li>✓ 24/7 support</li>
          </ul>
          <button class="w-full py-3 border-2 border-indigo-600 text-indigo-600 font-bold rounded-lg hover:bg-indigo-50 transition">Contact Us</button>
        </div>
      </div>
    </div>
  </section>

  <!-- FAQ -->
  <section id="faq" class="py-20 bg-gray-50">
    <div class="max-w-3xl mx-auto px-6">
      <h2 class="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
      <div class="space-y-4" id="faqList">
        <div class="faq-item bg-white rounded-xl overflow-hidden shadow-sm">
          <button class="faq-btn w-full text-left px-6 py-4 font-semibold flex justify-between items-center">
            How long does an engagement typically last?
            <span class="faq-icon text-xl transition-transform">+</span>
          </button>
          <div class="faq-answer px-6 pb-4 text-canvas-muted-deep text-sm hidden">Most engagements run 3-6 months depending on scope. We start with a 2-week discovery phase to align expectations.</div>
        </div>
        <div class="faq-item bg-white rounded-xl overflow-hidden shadow-sm">
          <button class="faq-btn w-full text-left px-6 py-4 font-semibold flex justify-between items-center">
            Do you work with startups?
            <span class="faq-icon text-xl transition-transform">+</span>
          </button>
          <div class="faq-answer px-6 pb-4 text-canvas-muted-deep text-sm hidden">Absolutely. Our Starter plan is designed specifically for early-stage companies with lean budgets.</div>
        </div>
        <div class="faq-item bg-white rounded-xl overflow-hidden shadow-sm">
          <button class="faq-btn w-full text-left px-6 py-4 font-semibold flex justify-between items-center">
            Can we cancel anytime?
            <span class="faq-icon text-xl transition-transform">+</span>
          </button>
          <div class="faq-answer px-6 pb-4 text-canvas-muted-deep text-sm hidden">Yes, all plans are month-to-month with no long-term contracts. We earn your loyalty through results.</div>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="py-12 bg-gray-900 text-canvas-muted">
    <div class="max-w-7xl mx-auto px-6 text-center">
      <p class="text-lg font-bold text-white mb-4">Apex Consulting</p>
      <p class="text-sm">New York · London · Singapore</p>
      <p class="text-xs mt-4">&copy; 2026 Apex Consulting. All rights reserved.</p>
    </div>
  </footer>

  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `html { scroll-behavior: smooth; }
/* Flip cards */
.flip-card { perspective: 1000px; }
.flip-card-inner { position: relative; width: 100%; height: 100%; transition: transform 0.6s; transform-style: preserve-3d; }
.flip-card:hover .flip-card-inner { transform: rotateY(180deg); }
.flip-card-front, .flip-card-back { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; }
.flip-card-back { transform: rotateY(180deg); }

/* Case filter */
.case-filter { background: #f3f4f6; color: #6b7280; border: 1px solid transparent; cursor: pointer; transition: all 0.2s; }
.case-filter.active, .case-filter:hover { background: #4f46e5; color: white; }

/* FAQ */
.faq-icon { transition: transform 0.3s; }
.faq-item.open .faq-icon { transform: rotate(45deg); }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `// Case study filter
document.querySelectorAll('.case-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.case-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    document.querySelectorAll('.case-card').forEach(card => {
      card.style.display = (filter === 'all' || card.dataset.cat === filter) ? '' : 'none';
    });
  });
});

// FAQ accordion
document.querySelectorAll('.faq-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.parentElement;
    const answer = item.querySelector('.faq-answer');
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => { i.classList.remove('open'); i.querySelector('.faq-answer').classList.add('hidden'); });
    if (!isOpen) { item.classList.add('open'); answer.classList.remove('hidden'); }
  });
});
`,
      },
    ],
  },

  // 3. Startup Pitch Deck
  {
    name: 'Startup Pitch Deck',
    icon: '📈',
    category: 'business',
    description: 'Single-page pitch deck with problem/solution, metrics, team, and investor CTA.',
    prompt: 'Design a single-page startup pitch deck presentation with sections for: problem statement, solution, market size with animated counters, business model canvas, traction metrics, team profiles, and a call-to-action investment section. Use slide-style horizontal scroll navigation.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LaunchPad — Pitch Deck</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-950 text-white font-sans">
  <!-- Slide navigation -->
  <nav class="fixed top-0 w-full bg-gray-950/90 backdrop-blur z-50 border-b border-gray-800">
    <div class="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
      <span class="text-lg font-bold text-emerald-400">🚀 LaunchPad</span>
      <div class="flex gap-2" id="slideNav"></div>
    </div>
  </nav>

  <div id="slides" class="pt-14 overflow-x-auto snap-x snap-mandatory flex scroll-smooth" style="scroll-snap-type: x mandatory;">
    <!-- Slide 1: Title -->
    <section class="slide snap-center min-w-full min-h-screen flex items-center justify-center px-6">
      <div class="text-center max-w-3xl">
        <span class="text-6xl mb-6 block">🚀</span>
        <h1 class="text-5xl md:text-7xl font-extrabold mb-4">LaunchPad</h1>
        <p class="text-xl text-emerald-400 font-semibold mb-4">Redefining How Startups Scale</p>
        <p class="text-canvas-muted text-lg">Series A — $10M Round</p>
      </div>
    </section>

    <!-- Slide 2: Problem -->
    <section class="slide snap-center min-w-full min-h-screen flex items-center justify-center px-6 bg-gray-900">
      <div class="max-w-4xl">
        <p class="text-emerald-400 font-semibold uppercase tracking-widest text-sm mb-2">The Problem</p>
        <h2 class="text-4xl font-bold mb-8">90% of Startups Fail Due to Poor Execution</h2>
        <div class="grid md:grid-cols-3 gap-6">
          <div class="p-6 bg-gray-800 rounded-xl"><span class="text-3xl">💸</span><h3 class="font-bold mt-3 mb-1">Wasted Capital</h3><p class="text-canvas-muted text-sm">$3.5B wasted annually on failed GTM strategies</p></div>
          <div class="p-6 bg-gray-800 rounded-xl"><span class="text-3xl">⏰</span><h3 class="font-bold mt-3 mb-1">Slow Iteration</h3><p class="text-canvas-muted text-sm">Average 6-month cycles to validate a single hypothesis</p></div>
          <div class="p-6 bg-gray-800 rounded-xl"><span class="text-3xl">📉</span><h3 class="font-bold mt-3 mb-1">No Visibility</h3><p class="text-canvas-muted text-sm">Founders lack real-time data on what's working</p></div>
        </div>
      </div>
    </section>

    <!-- Slide 3: Solution -->
    <section class="slide snap-center min-w-full min-h-screen flex items-center justify-center px-6">
      <div class="max-w-4xl">
        <p class="text-emerald-400 font-semibold uppercase tracking-widest text-sm mb-2">The Solution</p>
        <h2 class="text-4xl font-bold mb-8">AI-Powered Growth Operating System</h2>
        <div class="grid md:grid-cols-2 gap-8">
          <div class="space-y-4">
            <div class="flex items-start gap-3"><span class="text-emerald-400 text-xl">✓</span><div><h4 class="font-bold">Real-time Analytics</h4><p class="text-canvas-muted text-sm">Track every growth metric across all channels in one dashboard</p></div></div>
            <div class="flex items-start gap-3"><span class="text-emerald-400 text-xl">✓</span><div><h4 class="font-bold">AI Recommendations</h4><p class="text-canvas-muted text-sm">Get actionable suggestions based on your data patterns</p></div></div>
            <div class="flex items-start gap-3"><span class="text-emerald-400 text-xl">✓</span><div><h4 class="font-bold">Automated Workflows</h4><p class="text-canvas-muted text-sm">Set up growth experiments that run on autopilot</p></div></div>
          </div>
          <div class="bg-gradient-to-br from-emerald-900/50 to-gray-800 rounded-2xl p-8 flex items-center justify-center">
            <span class="text-7xl">📊</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Slide 4: Market Size -->
    <section class="slide snap-center min-w-full min-h-screen flex items-center justify-center px-6 bg-gray-900">
      <div class="max-w-4xl text-center">
        <p class="text-emerald-400 font-semibold uppercase tracking-widest text-sm mb-2">Market Opportunity</p>
        <h2 class="text-4xl font-bold mb-12">$48 Billion Total Addressable Market</h2>
        <div class="grid md:grid-cols-3 gap-8">
          <div><p class="counter text-5xl font-extrabold text-emerald-400" data-target="48">0</p><p class="text-canvas-muted mt-2">$B TAM</p></div>
          <div><p class="counter text-5xl font-extrabold text-emerald-400" data-target="12">0</p><p class="text-canvas-muted mt-2">$B SAM</p></div>
          <div><p class="counter text-5xl font-extrabold text-emerald-400" data-target="3">0</p><p class="text-canvas-muted mt-2">$B SOM (Year 5)</p></div>
        </div>
      </div>
    </section>

    <!-- Slide 5: Traction -->
    <section class="slide snap-center min-w-full min-h-screen flex items-center justify-center px-6">
      <div class="max-w-4xl">
        <p class="text-emerald-400 font-semibold uppercase tracking-widest text-sm mb-2">Traction</p>
        <h2 class="text-4xl font-bold mb-12">Growing 25% Month-over-Month</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div class="bg-gray-800 rounded-xl p-6 text-center"><p class="counter text-3xl font-extrabold text-emerald-400" data-target="2500">0</p><p class="text-canvas-muted text-sm mt-1">Active Users</p></div>
          <div class="bg-gray-800 rounded-xl p-6 text-center"><p class="counter text-3xl font-extrabold text-emerald-400" data-target="850">0</p><p class="text-canvas-muted text-sm mt-1">$K ARR</p></div>
          <div class="bg-gray-800 rounded-xl p-6 text-center"><p class="counter text-3xl font-extrabold text-emerald-400" data-target="94">0</p><p class="text-canvas-muted text-sm mt-1">% Retention</p></div>
          <div class="bg-gray-800 rounded-xl p-6 text-center"><p class="counter text-3xl font-extrabold text-emerald-400" data-target="4">0</p><p class="text-canvas-muted text-sm mt-1">.8 NPS Score</p></div>
        </div>
      </div>
    </section>

    <!-- Slide 6: Team -->
    <section class="slide snap-center min-w-full min-h-screen flex items-center justify-center px-6 bg-gray-900">
      <div class="max-w-4xl">
        <p class="text-emerald-400 font-semibold uppercase tracking-widest text-sm mb-2">The Team</p>
        <h2 class="text-4xl font-bold mb-12">Built by Operators, for Operators</h2>
        <div class="grid md:grid-cols-3 gap-8">
          <div class="text-center"><div class="w-24 h-24 bg-emerald-900 rounded-full mx-auto mb-3 flex items-center justify-center text-4xl">👨‍💼</div><h4 class="font-bold">Alex Kim</h4><p class="text-emerald-400 text-sm">CEO — Ex-Stripe</p></div>
          <div class="text-center"><div class="w-24 h-24 bg-emerald-900 rounded-full mx-auto mb-3 flex items-center justify-center text-4xl">👩‍💻</div><h4 class="font-bold">Priya Sharma</h4><p class="text-emerald-400 text-sm">CTO — Ex-Google</p></div>
          <div class="text-center"><div class="w-24 h-24 bg-emerald-900 rounded-full mx-auto mb-3 flex items-center justify-center text-4xl">👨‍🔬</div><h4 class="font-bold">Marcus Brown</h4><p class="text-emerald-400 text-sm">CPO — Ex-Datadog</p></div>
        </div>
      </div>
    </section>

    <!-- Slide 7: CTA -->
    <section class="slide snap-center min-w-full min-h-screen flex items-center justify-center px-6">
      <div class="text-center max-w-2xl">
        <span class="text-6xl mb-6 block">🤝</span>
        <h2 class="text-5xl font-extrabold mb-4">Let's Build the Future</h2>
        <p class="text-canvas-muted text-lg mb-8">We're raising $10M to accelerate product development and expand into 3 new markets.</p>
        <a href="mailto:invest@launchpad.io" class="inline-block px-10 py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 transition text-lg shadow-xl shadow-emerald-500/20">Schedule a Meeting →</a>
      </div>
    </section>
  </div>

  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `html { scroll-behavior: smooth; }
body { overflow: hidden; }
#slides { height: calc(100vh - 3.5rem); }
#slides::-webkit-scrollbar { display: none; }

.slide-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: rgba(255,255,255,0.2); cursor: pointer; transition: all 0.3s;
}
.slide-dot.active { background: #34d399; transform: scale(1.4); }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `// Slide navigation dots
const container = document.getElementById('slides');
const slides = container.querySelectorAll('.slide');
const nav = document.getElementById('slideNav');

slides.forEach((_, i) => {
  const dot = document.createElement('span');
  dot.className = 'slide-dot' + (i === 0 ? ' active' : '');
  dot.addEventListener('click', () => {
    slides[i].scrollIntoView({ behavior: 'smooth', inline: 'center' });
  });
  nav.appendChild(dot);
});

// Update active dot on scroll
container.addEventListener('scroll', () => {
  const idx = Math.round(container.scrollLeft / container.offsetWidth);
  nav.querySelectorAll('.slide-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
});

// Keyboard navigation
document.addEventListener('keydown', e => {
  const idx = Math.round(container.scrollLeft / container.offsetWidth);
  if (e.key === 'ArrowRight' && idx < slides.length - 1) slides[idx + 1].scrollIntoView({ behavior: 'smooth', inline: 'center' });
  if (e.key === 'ArrowLeft' && idx > 0) slides[idx - 1].scrollIntoView({ behavior: 'smooth', inline: 'center' });
});

// Counter animation
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.counter').forEach(el => {
        const target = +el.dataset.target;
        let current = 0;
        const step = target / 60;
        const timer = setInterval(() => {
          current += step;
          if (current >= target) { el.textContent = target; clearInterval(timer); }
          else el.textContent = Math.floor(current);
        }, 16);
      });
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });
slides.forEach(s => observer.observe(s));
`,
      },
    ],
  },

  // 4. Invoice Generator
  {
    name: 'Invoice Generator',
    icon: '🧾',
    category: 'business',
    description: 'Interactive invoice generator with line items, auto-calculation, preview and print.',
    prompt: 'Build an interactive invoice generator with company info header, client details form, line items table with add/remove rows, automatic subtotal/tax/total calculation, payment terms dropdown, notes field, and a print-friendly layout. Include a preview pane and download button.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice Generator</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-100 min-h-screen font-sans text-gray-800">
  <div class="max-w-4xl mx-auto py-8 px-4">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-2xl font-bold text-gray-900">🧾 Invoice Generator</h1>
      <div class="flex gap-3">
        <button onclick="window.print()" class="px-5 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition text-sm">🖨️ Print</button>
        <button onclick="window.print()" class="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition text-sm">⬇️ Download PDF</button>
      </div>
    </div>

    <!-- Invoice -->
    <div id="invoice" class="bg-white rounded-2xl shadow-lg p-8">
      <!-- Company & Invoice Info -->
      <div class="flex justify-between items-start mb-10">
        <div>
          <input id="companyName" class="text-2xl font-bold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none w-64 pb-1" value="Your Company" />
          <input id="companyAddress" class="block text-sm text-canvas-muted-deep bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none w-64 mt-1" value="123 Business St, City, ST 10001" />
          <input id="companyEmail" class="block text-sm text-canvas-muted-deep bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none w-64 mt-1" value="billing@company.com" />
        </div>
        <div class="text-right">
          <h2 class="text-3xl font-extrabold text-blue-600">INVOICE</h2>
          <p class="text-sm text-canvas-muted-deep mt-2">Invoice #: <input id="invoiceNum" class="w-24 text-right bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none font-semibold text-gray-800" value="INV-001" /></p>
          <p class="text-sm text-canvas-muted-deep mt-1">Date: <input type="date" id="invoiceDate" class="bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none text-gray-800" /></p>
        </div>
      </div>

      <!-- Bill To -->
      <div class="mb-8 p-4 bg-gray-50 rounded-xl">
        <p class="text-xs font-bold text-canvas-muted uppercase mb-2">Bill To</p>
        <input class="block w-full bg-transparent text-lg font-semibold outline-none border-b border-transparent hover:border-gray-300 focus:border-blue-500 pb-1" placeholder="Client Name" />
        <input class="block w-full bg-transparent text-sm text-canvas-muted-deep outline-none border-b border-transparent hover:border-gray-300 focus:border-blue-500 mt-1" placeholder="Client Address" />
        <input class="block w-full bg-transparent text-sm text-canvas-muted-deep outline-none border-b border-transparent hover:border-gray-300 focus:border-blue-500 mt-1" placeholder="Client Email" />
      </div>

      <!-- Line Items -->
      <table class="w-full mb-6">
        <thead>
          <tr class="text-left text-xs font-bold text-canvas-muted uppercase">
            <th class="pb-3 pl-2">Description</th>
            <th class="pb-3 w-20 text-center">Qty</th>
            <th class="pb-3 w-28 text-right">Rate</th>
            <th class="pb-3 w-28 text-right">Amount</th>
            <th class="pb-3 w-10"></th>
          </tr>
        </thead>
        <tbody id="lineItems">
          <tr class="line-row border-t border-gray-100">
            <td class="py-3 pl-2"><input class="item-desc w-full bg-transparent outline-none" placeholder="Service or product" /></td>
            <td class="py-3"><input class="item-qty w-full text-center bg-transparent outline-none" type="number" value="1" min="1" /></td>
            <td class="py-3"><input class="item-rate w-full text-right bg-transparent outline-none" type="number" value="0" step="0.01" /></td>
            <td class="py-3 text-right font-semibold item-amount">$0.00</td>
            <td class="py-3 text-center"><button class="remove-row text-primary-400 hover:text-primary-600 text-lg">&times;</button></td>
          </tr>
        </tbody>
      </table>
      <button id="addRow" class="text-sm text-blue-600 font-semibold hover:text-blue-800 transition mb-8">+ Add Line Item</button>

      <!-- Totals -->
      <div class="flex justify-end">
        <div class="w-64 space-y-2 text-sm">
          <div class="flex justify-between"><span class="text-canvas-muted-deep">Subtotal</span><span id="subtotal" class="font-semibold">$0.00</span></div>
          <div class="flex justify-between items-center">
            <span class="text-canvas-muted-deep">Tax (%)</span>
            <input id="taxRate" type="number" value="10" min="0" max="100" class="w-16 text-right bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-500" />
          </div>
          <div class="flex justify-between"><span class="text-canvas-muted-deep">Tax Amount</span><span id="taxAmount" class="font-semibold">$0.00</span></div>
          <div class="flex justify-between border-t border-gray-200 pt-2 text-lg font-bold"><span>Total</span><span id="total" class="text-blue-600">$0.00</span></div>
        </div>
      </div>

      <!-- Payment Terms & Notes -->
      <div class="mt-10 grid md:grid-cols-2 gap-6">
        <div>
          <label class="block text-xs font-bold text-canvas-muted uppercase mb-1">Payment Terms</label>
          <select id="paymentTerms" class="w-full border border-gray-200 rounded-lg px-4 py-2 bg-white outline-none focus:border-blue-500 text-sm">
            <option>Due on Receipt</option>
            <option>Net 15</option>
            <option>Net 30</option>
            <option>Net 60</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold text-canvas-muted uppercase mb-1">Notes</label>
          <textarea id="notes" rows="3" class="w-full border border-gray-200 rounded-lg px-4 py-2 outline-none focus:border-blue-500 text-sm resize-none" placeholder="Thank you for your business!"></textarea>
        </div>
      </div>
    </div>
  </div>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `@media print {
  body { background: white !important; }
  .no-print, button, #addRow { display: none !important; }
  #invoice { box-shadow: none !important; border-radius: 0 !important; }
  input, select, textarea { border: none !important; background: transparent !important; }
  input:focus, select:focus, textarea:focus { border: none !important; }
}
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
input[type="number"] { -moz-appearance: textfield; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `// Set today's date
document.getElementById('invoiceDate').valueAsDate = new Date();

const lineItems = document.getElementById('lineItems');
const addRowBtn = document.getElementById('addRow');

function createRow() {
  const tr = document.createElement('tr');
  tr.className = 'line-row border-t border-gray-100';
  tr.innerHTML = \`
    <td class="py-3 pl-2"><input class="item-desc w-full bg-transparent outline-none" placeholder="Service or product" /></td>
    <td class="py-3"><input class="item-qty w-full text-center bg-transparent outline-none" type="number" value="1" min="1" /></td>
    <td class="py-3"><input class="item-rate w-full text-right bg-transparent outline-none" type="number" value="0" step="0.01" /></td>
    <td class="py-3 text-right font-semibold item-amount">$0.00</td>
    <td class="py-3 text-center"><button class="remove-row text-primary-400 hover:text-primary-600 text-lg">&times;</button></td>
  \`;
  lineItems.appendChild(tr);
  bindRow(tr);
}

function bindRow(row) {
  const qty = row.querySelector('.item-qty');
  const rate = row.querySelector('.item-rate');
  const amount = row.querySelector('.item-amount');
  const remove = row.querySelector('.remove-row');

  const calc = () => {
    const a = (parseFloat(qty.value) || 0) * (parseFloat(rate.value) || 0);
    amount.textContent = '$' + a.toFixed(2);
    recalcTotals();
  };
  qty.addEventListener('input', calc);
  rate.addEventListener('input', calc);
  remove.addEventListener('click', () => { row.remove(); recalcTotals(); });
}

function recalcTotals() {
  let subtotal = 0;
  document.querySelectorAll('.item-amount').forEach(el => {
    subtotal += parseFloat(el.textContent.replace('$', '')) || 0;
  });
  const taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
  const taxAmount = subtotal * taxRate / 100;
  document.getElementById('subtotal').textContent = '$' + subtotal.toFixed(2);
  document.getElementById('taxAmount').textContent = '$' + taxAmount.toFixed(2);
  document.getElementById('total').textContent = '$' + (subtotal + taxAmount).toFixed(2);
}

// Bind existing row
lineItems.querySelectorAll('.line-row').forEach(bindRow);

// Add row button
addRowBtn.addEventListener('click', createRow);

// Tax rate change
document.getElementById('taxRate').addEventListener('input', recalcTotals);
`,
      },
    ],
  },

  // 5. Office Directory
  {
    name: 'Office Directory',
    icon: '🗂️',
    category: 'business',
    description: 'Staff directory with search, department filters, grid/list toggle, and profile modals.',
    prompt: 'Create an office staff directory with a search bar, department filter tabs, employee cards showing avatar placeholder, name, title, email, and phone. Include a grid/list view toggle, alphabetical sorting, and a detailed employee modal popup with full profile info.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Office Directory</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-50 min-h-screen font-sans text-gray-800">
  <div class="max-w-7xl mx-auto px-6 py-8">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 class="text-2xl font-bold">🗂️ Office Directory</h1>
        <p class="text-canvas-muted-deep text-sm"><span id="count">0</span> team members</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="relative">
          <input id="search" type="text" placeholder="Search by name or title..." class="pl-10 pr-4 py-2.5 w-72 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 bg-white" />
          <svg class="absolute left-3 top-3 w-4 h-4 text-canvas-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
        <div class="flex border border-gray-200 rounded-lg overflow-hidden">
          <button id="gridBtn" class="view-btn active px-3 py-2" title="Grid view">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z"/></svg>
          </button>
          <button id="listBtn" class="view-btn px-3 py-2" title="List view">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" fill="none"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Department Filters -->
    <div class="flex flex-wrap gap-2 mb-8">
      <button class="dept-filter active" data-dept="all">All</button>
      <button class="dept-filter" data-dept="Engineering">Engineering</button>
      <button class="dept-filter" data-dept="Design">Design</button>
      <button class="dept-filter" data-dept="Marketing">Marketing</button>
      <button class="dept-filter" data-dept="Sales">Sales</button>
      <button class="dept-filter" data-dept="HR">HR</button>
      <button class="dept-filter" data-dept="Finance">Finance</button>
    </div>

    <!-- Directory Grid/List -->
    <div id="directory" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"></div>
  </div>

  <!-- Profile Modal -->
  <div id="modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm hidden">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8 relative">
      <button id="closeModal" class="absolute top-4 right-4 text-canvas-muted hover:text-gray-600 text-xl">&times;</button>
      <div id="modalContent" class="text-center"></div>
    </div>
  </div>

  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.dept-filter {
  padding: 6px 16px; font-size: 13px; font-weight: 600;
  border: 1px solid #e5e7eb; border-radius: 9999px;
  background: white; color: #6b7280; cursor: pointer; transition: all 0.2s;
}
.dept-filter:hover { border-color: #3b82f6; color: #3b82f6; }
.dept-filter.active { background: #3b82f6; color: white; border-color: #3b82f6; }

.view-btn { background: white; color: #9ca3af; transition: all 0.2s; }
.view-btn.active { background: #3b82f6; color: white; }

.card-grid { transition: all 0.3s; }
.card-grid:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.08); }

/* List mode */
#directory.list-mode { display: flex !important; flex-direction: column; gap: 8px; }
#directory.list-mode .card-grid { display: flex !important; align-items: center; gap: 16px; padding: 12px 16px !important; }
#directory.list-mode .card-grid .avatar { width: 40px !important; height: 40px !important; font-size: 1.2rem !important; }
#directory.list-mode .card-grid .card-info { text-align: left !important; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const employees = [
  { name: 'James Wilson', title: 'Engineering Manager', dept: 'Engineering', email: 'james@company.com', phone: '(555) 101-0001', location: 'New York', joined: 'Jan 2020', avatar: '👨‍💼' },
  { name: 'Sarah Chen', title: 'Senior Developer', dept: 'Engineering', email: 'sarah@company.com', phone: '(555) 101-0002', location: 'San Francisco', joined: 'Mar 2021', avatar: '👩‍💻' },
  { name: 'Maya Patel', title: 'UI/UX Lead', dept: 'Design', email: 'maya@company.com', phone: '(555) 101-0003', location: 'London', joined: 'Jun 2019', avatar: '👩‍🎨' },
  { name: 'Alex Rivera', title: 'Backend Developer', dept: 'Engineering', email: 'alex@company.com', phone: '(555) 101-0004', location: 'Austin', joined: 'Sep 2022', avatar: '👨‍🔬' },
  { name: 'Emily Thompson', title: 'Marketing Director', dept: 'Marketing', email: 'emily@company.com', phone: '(555) 101-0005', location: 'New York', joined: 'Feb 2018', avatar: '👩‍💼' },
  { name: 'David Park', title: 'Sales Lead', dept: 'Sales', email: 'david@company.com', phone: '(555) 101-0006', location: 'Chicago', joined: 'Nov 2020', avatar: '🧑‍💼' },
  { name: 'Lisa Wang', title: 'HR Manager', dept: 'HR', email: 'lisa@company.com', phone: '(555) 101-0007', location: 'Boston', joined: 'Apr 2019', avatar: '👩‍⚕️' },
  { name: 'Marcus Brown', title: 'CFO', dept: 'Finance', email: 'marcus@company.com', phone: '(555) 101-0008', location: 'New York', joined: 'Jan 2017', avatar: '👨‍💻' },
  { name: 'Rachel Kim', title: 'Product Designer', dept: 'Design', email: 'rachel@company.com', phone: '(555) 101-0009', location: 'Seattle', joined: 'Jul 2023', avatar: '👩‍🔧' },
  { name: 'Tom Harris', title: 'DevOps Engineer', dept: 'Engineering', email: 'tom@company.com', phone: '(555) 101-0010', location: 'Denver', joined: 'May 2021', avatar: '🧑‍🔧' },
  { name: 'Nina Foster', title: 'Content Strategist', dept: 'Marketing', email: 'nina@company.com', phone: '(555) 101-0011', location: 'Portland', joined: 'Aug 2022', avatar: '👩' },
  { name: 'Chris Adams', title: 'Account Executive', dept: 'Sales', email: 'chris@company.com', phone: '(555) 101-0012', location: 'Miami', joined: 'Oct 2021', avatar: '🧑' },
].sort((a, b) => a.name.localeCompare(b.name));

const dir = document.getElementById('directory');
const search = document.getElementById('search');
const count = document.getElementById('count');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');

let activeDept = 'all';

function renderEmployees() {
  const q = search.value.toLowerCase();
  const filtered = employees.filter(e =>
    (activeDept === 'all' || e.dept === activeDept) &&
    (e.name.toLowerCase().includes(q) || e.title.toLowerCase().includes(q))
  );
  count.textContent = filtered.length;
  dir.innerHTML = filtered.map((e, i) => \`
    <div class="card-grid bg-white rounded-xl p-6 border border-gray-100 cursor-pointer" data-idx="\${employees.indexOf(e)}">
      <div class="avatar w-16 h-16 bg-blue-50 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl">\${e.avatar}</div>
      <div class="card-info text-center">
        <h3 class="font-bold text-sm">\${e.name}</h3>
        <p class="text-blue-600 text-xs font-medium">\${e.title}</p>
        <p class="text-canvas-muted text-xs mt-1">\${e.dept}</p>
        <p class="text-canvas-muted text-xs">\${e.email}</p>
      </div>
    </div>
  \`).join('');

  dir.querySelectorAll('.card-grid').forEach(card => {
    card.addEventListener('click', () => {
      const e = employees[card.dataset.idx];
      modalContent.innerHTML = \`
        <div class="w-24 h-24 bg-blue-50 rounded-full mx-auto mb-4 flex items-center justify-center text-5xl">\${e.avatar}</div>
        <h2 class="text-xl font-bold">\${e.name}</h2>
        <p class="text-blue-600 font-medium">\${e.title}</p>
        <p class="text-canvas-muted text-sm mb-6">\${e.dept}</p>
        <div class="text-left space-y-3 text-sm">
          <div class="flex justify-between"><span class="text-canvas-muted">Email</span><span class="font-medium">\${e.email}</span></div>
          <div class="flex justify-between"><span class="text-canvas-muted">Phone</span><span class="font-medium">\${e.phone}</span></div>
          <div class="flex justify-between"><span class="text-canvas-muted">Location</span><span class="font-medium">\${e.location}</span></div>
          <div class="flex justify-between"><span class="text-canvas-muted">Joined</span><span class="font-medium">\${e.joined}</span></div>
        </div>
      \`;
      modal.classList.remove('hidden');
    });
  });
}

// Search
search.addEventListener('input', renderEmployees);

// Dept filters
document.querySelectorAll('.dept-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.dept-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeDept = btn.dataset.dept;
    renderEmployees();
  });
});

// View toggle
document.getElementById('gridBtn').addEventListener('click', () => {
  dir.classList.remove('list-mode');
  document.getElementById('gridBtn').classList.add('active');
  document.getElementById('listBtn').classList.remove('active');
});
document.getElementById('listBtn').addEventListener('click', () => {
  dir.classList.add('list-mode');
  document.getElementById('listBtn').classList.add('active');
  document.getElementById('gridBtn').classList.remove('active');
});

// Modal close
document.getElementById('closeModal').addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });

renderEmployees();
`,
      },
    ],
  },

  // ═══════════════════════════════════════════
  // RESTAURANT & FOOD (5)
  // ═══════════════════════════════════════════

  // 6. Restaurant Menu
  {
    name: 'Restaurant Menu',
    icon: '🍽️',
    category: 'restaurant',
    description: 'Beautiful menu page with tabs for categories, dietary icons, chef special, and reservation CTA.',
    prompt: 'Build a beautiful restaurant menu page with a hero image header, menu categories (Starters, Mains, Desserts, Drinks) as tabs, each item showing name, description, price, and dietary icons (vegetarian, gluten-free, spicy). Include a chef\'s special banner, reservation button, and elegant typography.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>La Maison — Restaurant Menu</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-stone-50 text-stone-800 font-serif">
  <!-- Hero -->
  <header class="relative h-80 bg-gradient-to-br from-stone-900 to-stone-700 flex items-center justify-center text-center overflow-hidden">
    <div class="absolute inset-0 bg-black/40"></div>
    <div class="relative z-10 text-white">
      <p class="text-amber-400 tracking-widest text-sm uppercase mb-2">Est. 1998</p>
      <h1 class="text-5xl md:text-6xl font-bold">La Maison</h1>
      <p class="text-stone-300 text-lg mt-2">Fine Dining Experience</p>
    </div>
  </header>

  <!-- Chef's Special -->
  <div class="max-w-4xl mx-auto px-6 -mt-8 relative z-10">
    <div class="bg-amber-600 text-white rounded-xl p-6 flex items-center gap-4 shadow-lg">
      <span class="text-4xl">👨‍🍳</span>
      <div>
        <p class="text-amber-200 text-xs font-bold uppercase tracking-wider">Chef's Special</p>
        <p class="font-bold text-lg">Truffle Risotto with Wild Mushrooms</p>
        <p class="text-amber-100 text-sm">A creamy arborio rice with black truffle shavings, porcini and chanterelles — $38</p>
      </div>
    </div>
  </div>

  <!-- Menu -->
  <div class="max-w-4xl mx-auto px-6 py-12">
    <!-- Category Tabs -->
    <div class="flex justify-center gap-4 mb-12 flex-wrap">
      <button class="menu-tab active" data-cat="starters">🥗 Starters</button>
      <button class="menu-tab" data-cat="mains">🥩 Mains</button>
      <button class="menu-tab" data-cat="desserts">🍰 Desserts</button>
      <button class="menu-tab" data-cat="drinks">🍷 Drinks</button>
    </div>

    <!-- Menu Items -->
    <div id="menuItems" class="space-y-6"></div>
  </div>

  <!-- Reservation CTA -->
  <section class="py-16 bg-stone-900 text-center text-white">
    <p class="text-amber-400 text-sm uppercase tracking-widest mb-2">Reserve Your Table</p>
    <h2 class="text-3xl font-bold mb-4">An Unforgettable Evening Awaits</h2>
    <p class="text-stone-400 mb-8 max-w-md mx-auto">Open Tuesday through Sunday, 5:30 PM – 11 PM</p>
    <a href="#" class="inline-block px-8 py-3 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-500 transition">Make a Reservation</a>
  </section>

  <footer class="py-6 text-center text-stone-400 text-sm bg-stone-950">
    &copy; 2026 La Maison. All rights reserved.
  </footer>

  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.menu-tab {
  padding: 8px 24px; font-size: 14px; font-weight: 600; font-family: serif;
  border: 2px solid #d6d3d1; border-radius: 9999px;
  background: transparent; color: #78716c; cursor: pointer; transition: all 0.3s;
}
.menu-tab:hover { border-color: #d97706; color: #d97706; }
.menu-tab.active { background: #d97706; color: white; border-color: #d97706; }

.menu-item { animation: fadeUp 0.3s ease; }
@keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.dietary { display: inline-flex; align-items: center; gap: 2px; font-size: 10px; padding: 2px 8px; border-radius: 9999px; font-weight: 600; }
.dietary-v { background: #dcfce7; color: #16a34a; }
.dietary-gf { background: #fef9c3; color: #ca8a04; }
.dietary-spicy { background: #fee2e2; color: #dc2626; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const menuData = {
  starters: [
    { name: 'Burrata Caprese', desc: 'Fresh burrata with heirloom tomatoes, basil oil, and aged balsamic', price: 18, dietary: ['v'] },
    { name: 'Tuna Tartare', desc: 'Yellowfin tuna with avocado, sesame, and wonton crisps', price: 22, dietary: ['gf'] },
    { name: 'French Onion Soup', desc: 'Caramelized onion broth with gruyère crouton', price: 14, dietary: [] },
    { name: 'Spicy Shrimp Cocktail', desc: 'Tiger prawns with sriracha-lime cocktail sauce', price: 19, dietary: ['gf', 'spicy'] },
    { name: 'Wild Mushroom Crostini', desc: 'Truffle cream, sautéed mushrooms, and microgreens', price: 16, dietary: ['v'] },
  ],
  mains: [
    { name: 'Wagyu Beef Tenderloin', desc: 'A5 wagyu with red wine jus, roasted garlic mash, and asparagus', price: 65, dietary: ['gf'] },
    { name: 'Pan-Seared Salmon', desc: 'Atlantic salmon with lemon dill cream, fingerling potatoes', price: 38, dietary: ['gf'] },
    { name: 'Lobster Linguine', desc: 'Fresh Maine lobster with cherry tomatoes in a white wine sauce', price: 45, dietary: [] },
    { name: 'Lamb Rack', desc: 'Herb-crusted lamb rack with mint gremolata and root vegetables', price: 52, dietary: ['gf'] },
    { name: 'Eggplant Parmigiana', desc: 'Layers of eggplant, marinara, and mozzarella', price: 28, dietary: ['v'] },
  ],
  desserts: [
    { name: 'Crème Brûlée', desc: 'Classic vanilla bean custard with caramelized sugar', price: 14, dietary: ['v', 'gf'] },
    { name: 'Chocolate Fondant', desc: 'Warm chocolate lava cake with vanilla ice cream', price: 16, dietary: ['v'] },
    { name: 'Tiramisu', desc: 'Espresso-soaked ladyfingers with mascarpone cream', price: 14, dietary: ['v'] },
    { name: 'Citrus Sorbet Trio', desc: 'Lemon, blood orange, and passionfruit sorbets', price: 12, dietary: ['v', 'gf'] },
  ],
  drinks: [
    { name: 'Negroni', desc: 'Gin, Campari, and sweet vermouth', price: 16, dietary: [] },
    { name: 'Classic Espresso Martini', desc: 'Vodka, Kahlúa, and fresh espresso', price: 18, dietary: [] },
    { name: 'Sparkling Rosé', desc: 'Domaine Chandon, Napa Valley — glass', price: 14, dietary: ['v'] },
    { name: 'Fresh Juice Selection', desc: 'Orange, watermelon, or green detox', price: 8, dietary: ['v', 'gf'] },
  ],
};

const dietaryLabels = { v: ['🌿 Vegetarian', 'dietary-v'], gf: ['GF', 'dietary-gf'], spicy: ['🌶️ Spicy', 'dietary-spicy'] };
const container = document.getElementById('menuItems');
let activeCategory = 'starters';

function renderMenu(cat) {
  activeCategory = cat;
  const items = menuData[cat] || [];
  container.innerHTML = items.map(item => \`
    <div class="menu-item flex justify-between items-start p-5 bg-white rounded-xl border border-stone-100 hover:shadow-md transition">
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-1">
          <h3 class="font-bold text-lg">\${item.name}</h3>
          \${item.dietary.map(d => \`<span class="dietary \${dietaryLabels[d][1]}">\${dietaryLabels[d][0]}</span>\`).join('')}
        </div>
        <p class="text-stone-400 text-sm">\${item.desc}</p>
      </div>
      <span class="text-amber-600 font-bold text-lg ml-4">$\${item.price}</span>
    </div>
  \`).join('');
}

document.querySelectorAll('.menu-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.menu-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderMenu(tab.dataset.cat);
  });
});

renderMenu('starters');
`,
      },
    ],
  },

  // 7. Food Delivery App
  {
    name: 'Food Delivery App',
    icon: '🛵',
    category: 'restaurant',
    description: 'Food delivery UI with restaurant listings, search, cart sidebar, and order tracking.',
    prompt: 'Create a food delivery app UI with restaurant listings (image, name, rating, delivery time, cuisine tags), a search bar with category filters, cart sidebar with item list and total, address input, and order tracking timeline.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>QuickBite — Food Delivery</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-50 font-sans text-gray-800">
  <div class="flex h-screen overflow-hidden">
    <!-- Main Content -->
    <div class="flex-1 overflow-y-auto">
      <!-- Header -->
      <header class="sticky top-0 bg-white/95 backdrop-blur z-40 border-b border-gray-100 px-6 py-4">
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-xl font-bold text-orange-500">🛵 QuickBite</h1>
          <div class="flex items-center gap-3">
            <span class="text-sm text-canvas-muted-deep">📍 123 Main St</span>
            <button id="cartToggle" class="relative p-2 bg-orange-50 rounded-lg hover:bg-orange-100 transition">
              🛒 <span id="cartBadge" class="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center hidden">0</span>
            </button>
          </div>
        </div>
        <div class="relative">
          <input id="search" type="text" placeholder="Search restaurants or cuisines..." class="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400" />
          <svg class="absolute left-3 top-3.5 w-4 h-4 text-canvas-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
      </header>

      <div class="px-6 py-6">
        <!-- Category Filters -->
        <div class="flex gap-3 overflow-x-auto pb-4 mb-6 no-scrollbar">
          <button class="cat-btn active" data-cat="all">🍱 All</button>
          <button class="cat-btn" data-cat="pizza">🍕 Pizza</button>
          <button class="cat-btn" data-cat="sushi">🍣 Sushi</button>
          <button class="cat-btn" data-cat="burger">🍔 Burgers</button>
          <button class="cat-btn" data-cat="chinese">🥡 Chinese</button>
          <button class="cat-btn" data-cat="mexican">🌮 Mexican</button>
          <button class="cat-btn" data-cat="healthy">🥗 Healthy</button>
        </div>

        <!-- Restaurant Grid -->
        <div id="restaurants" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"></div>
      </div>
    </div>

    <!-- Cart Sidebar -->
    <div id="cartPanel" class="w-80 bg-white border-l border-gray-100 flex-col hidden lg:flex">
      <div class="p-5 border-b border-gray-100">
        <h2 class="font-bold text-lg">Your Order</h2>
      </div>
      <div id="cartItems" class="flex-1 overflow-y-auto p-5 space-y-3">
        <p class="text-canvas-muted text-sm text-center py-8">Your cart is empty</p>
      </div>
      <div class="p-5 border-t border-gray-100 space-y-3">
        <div class="flex justify-between text-sm"><span class="text-canvas-muted-deep">Subtotal</span><span id="cartSubtotal" class="font-semibold">$0.00</span></div>
        <div class="flex justify-between text-sm"><span class="text-canvas-muted-deep">Delivery</span><span class="font-semibold text-green-600">Free</span></div>
        <div class="flex justify-between font-bold text-lg border-t pt-3"><span>Total</span><span id="cartTotal" class="text-orange-500">$0.00</span></div>
        <button id="checkoutBtn" class="w-full py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition disabled:opacity-50" disabled>Checkout</button>
      </div>
    </div>
  </div>

  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.cat-btn {
  white-space: nowrap; padding: 8px 18px; font-size: 13px; font-weight: 600;
  border: 1px solid #e5e7eb; border-radius: 9999px;
  background: white; color: #6b7280; cursor: pointer; transition: all 0.2s;
}
.cat-btn:hover { border-color: #f97316; color: #f97316; }
.cat-btn.active { background: #f97316; color: white; border-color: #f97316; }

.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

.restaurant-card { transition: all 0.2s; cursor: pointer; }
.restaurant-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.08); }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const restaurants = [
  { name: "Mario's Pizzeria", cuisine: 'pizza', rating: 4.8, time: '25-35', tags: ['Pizza','Italian'], img: '🍕', items: [{name:'Margherita',price:14},{name:'Pepperoni',price:16},{name:'Hawaiian',price:15}] },
  { name: 'Sakura Sushi', cuisine: 'sushi', rating: 4.9, time: '30-40', tags: ['Sushi','Japanese'], img: '🍣', items: [{name:'Salmon Roll',price:12},{name:'Dragon Roll',price:18},{name:'Sashimi Set',price:24}] },
  { name: 'Burger Barn', cuisine: 'burger', rating: 4.6, time: '20-30', tags: ['Burgers','American'], img: '🍔', items: [{name:'Classic Burger',price:13},{name:'Bacon Cheese',price:16},{name:'Veggie Burger',price:12}] },
  { name: 'Golden Dragon', cuisine: 'chinese', rating: 4.5, time: '25-40', tags: ['Chinese','Noodles'], img: '🥡', items: [{name:'Kung Pao Chicken',price:14},{name:'Fried Rice',price:11},{name:'Spring Rolls',price:8}] },
  { name: 'Casa Mexicana', cuisine: 'mexican', rating: 4.7, time: '20-30', tags: ['Mexican','Tacos'], img: '🌮', items: [{name:'Taco Trio',price:13},{name:'Burrito Bowl',price:14},{name:'Quesadilla',price:11}] },
  { name: 'Green Bowl', cuisine: 'healthy', rating: 4.8, time: '15-25', tags: ['Healthy','Salads'], img: '🥗', items: [{name:'Buddha Bowl',price:14},{name:'Acai Bowl',price:12},{name:'Quinoa Salad',price:13}] },
  { name: 'Napoli Express', cuisine: 'pizza', rating: 4.4, time: '30-45', tags: ['Pizza','Pasta'], img: '🍝', items: [{name:'Four Cheese',price:17},{name:'Carbonara',price:15},{name:'Calzone',price:14}] },
  { name: 'Zen Kitchen', cuisine: 'sushi', rating: 4.7, time: '35-45', tags: ['Japanese','Ramen'], img: '🍜', items: [{name:'Tonkotsu Ramen',price:16},{name:'Teriyaki Bowl',price:14},{name:'Edamame',price:6}] },
  { name: 'Fit Fuel', cuisine: 'healthy', rating: 4.6, time: '15-20', tags: ['Healthy','Wraps'], img: '🌯', items: [{name:'Protein Wrap',price:12},{name:'Smoothie Bowl',price:11},{name:'Energy Bowl',price:13}] },
];

let activeCat = 'all';
let cart = [];
const grid = document.getElementById('restaurants');
const search = document.getElementById('search');

function renderRestaurants() {
  const q = search.value.toLowerCase();
  const filtered = restaurants.filter(r =>
    (activeCat === 'all' || r.cuisine === activeCat) &&
    (r.name.toLowerCase().includes(q) || r.tags.some(t => t.toLowerCase().includes(q)))
  );
  grid.innerHTML = filtered.map((r, idx) => \`
    <div class="restaurant-card bg-white rounded-xl overflow-hidden border border-gray-100">
      <div class="h-36 bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center text-6xl">\${r.img}</div>
      <div class="p-4">
        <div class="flex justify-between items-start mb-1">
          <h3 class="font-bold">\${r.name}</h3>
          <span class="text-sm bg-green-50 text-green-700 px-2 py-0.5 rounded-lg font-semibold">⭐ \${r.rating}</span>
        </div>
        <div class="flex gap-2 mb-3">\${r.tags.map(t => \`<span class="text-xs bg-gray-100 text-canvas-muted-deep px-2 py-0.5 rounded-full">\${t}</span>\`).join('')}</div>
        <p class="text-xs text-canvas-muted mb-3">🕐 \${r.time} min</p>
        <div class="space-y-2">\${r.items.map(item => \`
          <div class="flex justify-between items-center text-sm">
            <span>\${item.name}</span>
            <div class="flex items-center gap-2">
              <span class="text-canvas-muted-deep">$\${item.price}</span>
              <button class="add-btn px-2 py-1 bg-orange-50 text-orange-600 rounded-lg text-xs font-bold hover:bg-orange-100 transition" data-name="\${item.name}" data-price="\${item.price}">+</button>
            </div>
          </div>\`).join('')}
        </div>
      </div>
    </div>
  \`).join('');

  grid.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', () => addToCart(btn.dataset.name, +btn.dataset.price));
  });
}

function addToCart(name, price) {
  const existing = cart.find(i => i.name === name);
  if (existing) existing.qty++;
  else cart.push({ name, price, qty: 1 });
  renderCart();
}

function renderCart() {
  const items = document.getElementById('cartItems');
  const badge = document.getElementById('cartBadge');
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);

  badge.textContent = count;
  badge.classList.toggle('hidden', count === 0);
  document.getElementById('checkoutBtn').disabled = count === 0;
  document.getElementById('cartSubtotal').textContent = '$' + total.toFixed(2);
  document.getElementById('cartTotal').textContent = '$' + total.toFixed(2);

  if (cart.length === 0) {
    items.innerHTML = '<p class="text-canvas-muted text-sm text-center py-8">Your cart is empty</p>';
    return;
  }
  items.innerHTML = cart.map((item, i) => \`
    <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
      <div>
        <p class="font-semibold text-sm">\${item.name}</p>
        <p class="text-xs text-canvas-muted">$\${item.price} × \${item.qty}</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="font-bold text-sm">$\${(item.price * item.qty).toFixed(2)}</span>
        <button class="remove-btn text-primary-400 hover:text-primary-600" data-idx="\${i}">&times;</button>
      </div>
    </div>
  \`).join('');
  items.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => { cart.splice(+btn.dataset.idx, 1); renderCart(); });
  });
}

// Filters
document.querySelectorAll('.cat-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCat = btn.dataset.cat;
    renderRestaurants();
  });
});

search.addEventListener('input', renderRestaurants);

// Cart toggle for mobile
document.getElementById('cartToggle').addEventListener('click', () => {
  document.getElementById('cartPanel').classList.toggle('hidden');
});

renderRestaurants();
renderCart();
`,
      },
    ],
  },

  // 8. Recipe Collection
  {
    name: 'Recipe Collection',
    icon: '📖',
    category: 'restaurant',
    description: 'Recipe site with featured hero, category grid, recipe cards, and detailed recipe view.',
    prompt: 'Design a recipe collection website with featured recipe hero, category grid, recipe cards showing image placeholder, title, cook time, difficulty, and rating.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Yumbook — Recipe Collection</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-amber-50 font-sans text-gray-800 min-h-screen">
  <!-- Header -->
  <nav class="bg-white border-b border-amber-100 px-6 py-3 sticky top-0 z-40">
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <span class="text-xl font-bold text-amber-600">📖 Yumbook</span>
      <input id="search" type="text" placeholder="Search recipes..." class="px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm outline-none focus:border-amber-400 w-64" />
    </div>
  </nav>

  <div class="max-w-6xl mx-auto px-6 py-8">
    <!-- Featured Recipe Hero -->
    <div class="bg-gradient-to-r from-amber-600 to-orange-500 rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 mb-12 text-white">
      <div class="flex-1">
        <span class="text-amber-200 text-xs font-bold uppercase tracking-widest">⭐ Featured Recipe</span>
        <h1 class="text-3xl md:text-4xl font-bold mt-2 mb-3">Creamy Tuscan Chicken Pasta</h1>
        <p class="text-amber-100 mb-4">A rich and creamy pasta dish with sun-dried tomatoes, spinach, and parmesan.</p>
        <div class="flex gap-4 text-sm text-amber-200">
          <span>⏱ 35 min</span><span>👨‍🍳 Medium</span><span>⭐ 4.9</span>
        </div>
      </div>
      <div class="w-48 h-48 bg-white/20 rounded-2xl flex items-center justify-center text-7xl">🍝</div>
    </div>

    <!-- Category Grid -->
    <h2 class="text-xl font-bold mb-4">Browse by Category</h2>
    <div class="grid grid-cols-3 md:grid-cols-6 gap-3 mb-12">
      <button class="cat-btn active" data-cat="all">🍱<br><span class="text-xs">All</span></button>
      <button class="cat-btn" data-cat="breakfast">🥞<br><span class="text-xs">Breakfast</span></button>
      <button class="cat-btn" data-cat="lunch">🥪<br><span class="text-xs">Lunch</span></button>
      <button class="cat-btn" data-cat="dinner">🥩<br><span class="text-xs">Dinner</span></button>
      <button class="cat-btn" data-cat="dessert">🍰<br><span class="text-xs">Dessert</span></button>
      <button class="cat-btn" data-cat="vegan">🥗<br><span class="text-xs">Vegan</span></button>
    </div>

    <!-- Recipe Cards -->
    <h2 class="text-xl font-bold mb-4" id="recipesTitle">All Recipes</h2>
    <div id="recipes" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"></div>
  </div>

  <!-- Recipe Detail Modal -->
  <div id="modal" class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center hidden">
    <div class="bg-white rounded-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto p-8 relative">
      <button id="closeModal" class="absolute top-4 right-4 text-canvas-muted hover:text-gray-600 text-2xl">&times;</button>
      <div id="modalContent"></div>
    </div>
  </div>

  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.cat-btn {
  padding: 12px 8px; background: white; border: 2px solid #fde68a; border-radius: 12px;
  cursor: pointer; transition: all 0.2s; font-size: 1.5rem; text-align: center;
}
.cat-btn:hover { border-color: #f59e0b; transform: translateY(-2px); }
.cat-btn.active { background: #f59e0b; border-color: #f59e0b; color: white; }
.cat-btn.active span { color: white; }

.recipe-card { transition: all 0.2s; cursor: pointer; }
.recipe-card:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0,0,0,0.1); }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const recipes = [
  { name: 'Avocado Toast', cat: 'breakfast', time: '10 min', diff: 'Easy', rating: 4.5, img: '🥑', ingredients: ['2 slices sourdough','1 avocado','Cherry tomatoes','Feta cheese','Everything bagel seasoning'], steps: ['Toast the bread until golden','Mash avocado with salt and lime','Top with tomatoes and feta','Sprinkle seasoning'] },
  { name: 'Fluffy Pancakes', cat: 'breakfast', time: '20 min', diff: 'Easy', rating: 4.8, img: '🥞', ingredients: ['1.5 cups flour','1 egg','1 cup milk','2 tbsp sugar','Butter'], steps: ['Mix dry ingredients','Add wet ingredients','Cook on medium heat','Flip when bubbly','Serve with maple syrup'] },
  { name: 'Club Sandwich', cat: 'lunch', time: '15 min', diff: 'Easy', rating: 4.3, img: '🥪', ingredients: ['3 slices bread','Turkey','Bacon','Lettuce, tomato','Mayo'], steps: ['Toast bread','Layer turkey and bacon','Add lettuce and tomato','Stack and cut diagonally'] },
  { name: 'Caesar Salad', cat: 'lunch', time: '15 min', diff: 'Easy', rating: 4.4, img: '🥗', ingredients: ['Romaine lettuce','Croutons','Parmesan','Caesar dressing','Grilled chicken'], steps: ['Chop lettuce','Grill and slice chicken','Toss with dressing','Top with croutons and parmesan'] },
  { name: 'Grilled Salmon', cat: 'dinner', time: '30 min', diff: 'Medium', rating: 4.9, img: '🐟', ingredients: ['Salmon fillet','Lemon','Garlic butter','Asparagus','Dill'], steps: ['Season salmon with salt and pepper','Make garlic butter sauce','Grill on medium-high 5 min per side','Serve with asparagus and lemon'] },
  { name: 'Beef Stir Fry', cat: 'dinner', time: '25 min', diff: 'Medium', rating: 4.6, img: '🥩', ingredients: ['Beef strips','Bell peppers','Soy sauce','Ginger','Rice'], steps: ['Cook rice','Stir fry beef until browned','Add vegetables','Pour soy sauce and ginger','Serve over rice'] },
  { name: 'Chocolate Lava Cake', cat: 'dessert', time: '25 min', diff: 'Medium', rating: 4.9, img: '🍫', ingredients: ['Dark chocolate','Butter','Eggs','Sugar','Flour'], steps: ['Melt chocolate and butter','Whisk eggs and sugar','Fold in flour and chocolate','Bake at 425°F for 12 min','Serve immediately'] },
  { name: 'Panna Cotta', cat: 'dessert', time: '20 min', diff: 'Easy', rating: 4.7, img: '🍮', ingredients: ['Heavy cream','Vanilla','Sugar','Gelatin','Berries'], steps: ['Bloom gelatin','Heat cream with sugar and vanilla','Add gelatin','Pour into molds','Chill 4 hours, top with berries'] },
  { name: 'Buddha Bowl', cat: 'vegan', time: '20 min', diff: 'Easy', rating: 4.6, img: '🥙', ingredients: ['Quinoa','Chickpeas','Sweet potato','Avocado','Tahini dressing'], steps: ['Cook quinoa','Roast sweet potato and chickpeas','Arrange in bowl','Top with avocado and tahini'] },
  { name: 'Vegan Curry', cat: 'vegan', time: '35 min', diff: 'Medium', rating: 4.8, img: '🍛', ingredients: ['Coconut milk','Chickpeas','Spinach','Curry paste','Basmati rice'], steps: ['Cook rice','Sauté curry paste','Add coconut milk and chickpeas','Simmer 15 min','Stir in spinach'] },
];

const grid = document.getElementById('recipes');
const search = document.getElementById('search');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');
let activeCat = 'all';

function render() {
  const q = search.value.toLowerCase();
  const filtered = recipes.filter(r => (activeCat === 'all' || r.cat === activeCat) && r.name.toLowerCase().includes(q));
  document.getElementById('recipesTitle').textContent = activeCat === 'all' ? 'All Recipes' : activeCat.charAt(0).toUpperCase() + activeCat.slice(1) + ' Recipes';

  grid.innerHTML = filtered.map((r, i) => \`
    <div class="recipe-card bg-white rounded-xl overflow-hidden border border-amber-100" data-idx="\${recipes.indexOf(r)}">
      <div class="h-40 bg-gradient-to-br from-amber-100 to-orange-50 flex items-center justify-center text-6xl">\${r.img}</div>
      <div class="p-4">
        <h3 class="font-bold mb-1">\${r.name}</h3>
        <div class="flex gap-3 text-xs text-canvas-muted">
          <span>⏱ \${r.time}</span><span>👨‍🍳 \${r.diff}</span><span>⭐ \${r.rating}</span>
        </div>
      </div>
    </div>
  \`).join('');

  grid.querySelectorAll('.recipe-card').forEach(card => {
    card.addEventListener('click', () => {
      const r = recipes[card.dataset.idx];
      modalContent.innerHTML = \`
        <div class="text-center mb-6">
          <div class="w-24 h-24 bg-amber-50 rounded-2xl mx-auto flex items-center justify-center text-5xl mb-3">\${r.img}</div>
          <h2 class="text-2xl font-bold">\${r.name}</h2>
          <div class="flex justify-center gap-4 text-sm text-canvas-muted mt-1"><span>⏱ \${r.time}</span><span>👨‍🍳 \${r.diff}</span><span>⭐ \${r.rating}</span></div>
        </div>
        <h3 class="font-bold mb-2">Ingredients</h3>
        <ul class="mb-4 space-y-1">\${r.ingredients.map(i => \`<li class="text-sm text-gray-600 flex items-center gap-2"><span class="w-2 h-2 bg-amber-400 rounded-full shrink-0"></span>\${i}</li>\`).join('')}</ul>
        <h3 class="font-bold mb-2">Steps</h3>
        <ol class="space-y-2">\${r.steps.map((s, i) => \`<li class="text-sm text-gray-600 flex gap-2"><span class="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">\${i+1}</span>\${s}</li>\`).join('')}</ol>
      \`;
      modal.classList.remove('hidden');
    });
  });
}

document.querySelectorAll('.cat-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCat = btn.dataset.cat;
    render();
  });
});
search.addEventListener('input', render);
document.getElementById('closeModal').addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });
render();
`,
      },
    ],
  },

  // 9. Cafe & Bakery
  {
    name: 'Cafe & Bakery',
    icon: '☕',
    category: 'restaurant',
    description: 'Warm cafe website with hero, daily specials, pastry gallery, about the baker, and order online CTA.',
    prompt: 'Build a cozy cafe and bakery website with hero banner, daily specials carousel, pastry gallery grid, about section, and an order online call-to-action.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Flour & Bloom — Cafe & Bakery</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-stone-50 font-sans text-stone-800">
  <!-- Nav -->
  <nav class="bg-white/80 backdrop-blur sticky top-0 z-40 border-b border-stone-100 px-6 py-3">
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <span class="text-xl font-bold text-amber-700">🌸 Flour & Bloom</span>
      <div class="flex gap-6 text-sm font-medium text-stone-500">
        <a href="#specials" class="hover:text-amber-700">Specials</a>
        <a href="#pastries" class="hover:text-amber-700">Pastries</a>
        <a href="#about" class="hover:text-amber-700">About</a>
      </div>
      <button class="px-4 py-2 bg-amber-600 text-white text-sm rounded-full font-medium hover:bg-amber-700 transition">Order Online</button>
    </div>
  </nav>

  <!-- Hero -->
  <section class="bg-gradient-to-br from-amber-700 to-amber-900 text-white py-20 px-6">
    <div class="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-10">
      <div class="flex-1">
        <p class="text-amber-200 font-medium text-sm uppercase tracking-widest mb-2">Since 2015</p>
        <h1 class="text-4xl md:text-5xl font-bold mb-4 leading-tight">Freshly Baked<br/>Every Morning</h1>
        <p class="text-amber-100 mb-6 max-w-md">Artisan breads, handcrafted pastries, and specialty coffee made with love in the heart of downtown.</p>
        <div class="flex gap-3">
          <button class="px-6 py-3 bg-white text-amber-800 rounded-full font-bold hover:bg-amber-50 transition">View Menu</button>
          <button class="px-6 py-3 border-2 border-canvas-border rounded-full font-medium hover:bg-white/10 transition">Find Us</button>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="w-36 h-36 bg-white/10 rounded-2xl flex items-center justify-center text-6xl">🥐</div>
        <div class="w-36 h-36 bg-white/10 rounded-2xl flex items-center justify-center text-6xl mt-6">☕</div>
        <div class="w-36 h-36 bg-white/10 rounded-2xl flex items-center justify-center text-6xl">🍞</div>
        <div class="w-36 h-36 bg-white/10 rounded-2xl flex items-center justify-center text-6xl mt-6">🧁</div>
      </div>
    </div>
  </section>

  <!-- Daily Specials -->
  <section id="specials" class="py-16 px-6">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-2xl font-bold text-center mb-2">Today's Specials</h2>
      <p class="text-stone-400 text-center mb-8">Fresh picks for <span id="todayDate"></span></p>
      <div class="relative overflow-hidden">
        <div id="carousel" class="flex gap-6 transition-transform duration-500"></div>
        <div class="flex justify-center gap-2 mt-6">
          <button id="prevBtn" class="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center hover:bg-amber-200 text-lg">&larr;</button>
          <button id="nextBtn" class="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center hover:bg-amber-200 text-lg">&rarr;</button>
        </div>
      </div>
    </div>
  </section>

  <!-- Pastry Gallery -->
  <section id="pastries" class="py-16 px-6 bg-white">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-2xl font-bold text-center mb-2">Our Pastries</h2>
      <p class="text-stone-400 text-center mb-8">Handcrafted daily with the finest ingredients</p>
      <div class="flex justify-center gap-2 mb-8" id="galleryTabs"></div>
      <div id="gallery" class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"></div>
    </div>
  </section>

  <!-- About -->
  <section id="about" class="py-16 px-6">
    <div class="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-10">
      <div class="w-48 h-48 bg-amber-100 rounded-full flex items-center justify-center text-7xl shrink-0">👩‍🍳</div>
      <div>
        <h2 class="text-2xl font-bold mb-3">Meet Chef Amelie</h2>
        <p class="text-stone-500 mb-4">With over 15 years of baking experience and training at Le Cordon Bleu, Chef Amelie brings Parisian techniques to every loaf and pastry.</p>
        <p class="text-stone-500">"Baking is about patience, precision, and a whole lot of butter." — Amelie</p>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="py-16 px-6 bg-amber-700 text-white text-center">
    <h2 class="text-3xl font-bold mb-3">Order Fresh for Tomorrow</h2>
    <p class="text-amber-100 mb-6 max-w-md mx-auto">Place your order by 8 PM and pick up freshly baked goods in the morning.</p>
    <button class="px-8 py-3 bg-white text-amber-800 rounded-full font-bold hover:bg-amber-50 transition">Start Order</button>
  </section>

  <footer class="bg-stone-800 text-stone-400 text-center text-sm py-6">&copy; 2025 Flour & Bloom. Made with ❤ and 🧈</footer>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.special-card { min-width: 260px; transition: transform 0.2s; }
.special-card:hover { transform: translateY(-3px); }
.pastry-card { transition: all 0.2s; cursor: pointer; }
.pastry-card:hover { transform: scale(1.03); box-shadow: 0 8px 25px rgba(0,0,0,0.08); }
.tab-btn { padding: 6px 16px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; border: 2px solid #e7e5e4; background: white; cursor: pointer; transition: all 0.2s; }
.tab-btn:hover { border-color: #d97706; }
.tab-btn.active { background: #d97706; color: white; border-color: #d97706; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const specials = [
  { name: 'Almond Croissant', price: '$4.50', img: '🥐', desc: 'Flaky layers with almond cream filling' },
  { name: 'Lavender Latte', price: '$5.00', img: '☕', desc: 'Smooth espresso with lavender syrup' },
  { name: 'Sourdough Loaf', price: '$7.00', img: '🍞', desc: 'Slow-fermented 48-hour sourdough' },
  { name: 'Berry Tart', price: '$6.00', img: '🍰', desc: 'Custard tart with seasonal berries' },
  { name: 'Matcha Muffin', price: '$3.50', img: '🧁', desc: 'Green tea muffin with white chocolate' },
  { name: 'Cinnamon Roll', price: '$4.00', img: '🍩', desc: 'Loaded with cream cheese frosting' },
];

const pastries = [
  { name: 'Pain au Chocolat', cat: 'pastry', price: '$4', img: '🍫' },
  { name: 'Eclair', cat: 'pastry', price: '$5', img: '🥖' },
  { name: 'Macaron Set', cat: 'pastry', price: '$8', img: '🟣' },
  { name: 'Fruit Danish', cat: 'pastry', price: '$4.50', img: '🍑' },
  { name: 'Baguette', cat: 'bread', price: '$5', img: '🥖' },
  { name: 'Rye Loaf', cat: 'bread', price: '$6', img: '🍞' },
  { name: 'Brioche', cat: 'bread', price: '$5.50', img: '🍞' },
  { name: 'Focaccia', cat: 'bread', price: '$7', img: '🫓' },
  { name: 'Espresso', cat: 'drinks', price: '$3', img: '☕' },
  { name: 'Chai Latte', cat: 'drinks', price: '$4.50', img: '🍵' },
  { name: 'Hot Chocolate', cat: 'drinks', price: '$4', img: '🍫' },
  { name: 'Fresh Juice', cat: 'drinks', price: '$5', img: '🍊' },
];

// Date display
document.getElementById('todayDate').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

// Carousel
const carousel = document.getElementById('carousel');
carousel.innerHTML = specials.map(s => \`
  <div class="special-card bg-white rounded-xl p-5 border border-stone-100 flex-shrink-0">
    <div class="w-16 h-16 bg-amber-50 rounded-xl flex items-center justify-center text-3xl mb-3">\${s.img}</div>
    <h3 class="font-bold mb-1">\${s.name}</h3>
    <p class="text-xs text-stone-400 mb-2">\${s.desc}</p>
    <span class="text-amber-700 font-bold">\${s.price}</span>
  </div>
\`).join('');

let offset = 0;
const slide = (dir) => {
  const max = (specials.length - 3) * 276;
  offset = Math.max(0, Math.min(offset + dir * 276, max));
  carousel.style.transform = \`translateX(-\${offset}px)\`;
};
document.getElementById('prevBtn').addEventListener('click', () => slide(-1));
document.getElementById('nextBtn').addEventListener('click', () => slide(1));

// Gallery
const tabContainer = document.getElementById('galleryTabs');
const cats = ['all', 'pastry', 'bread', 'drinks'];
tabContainer.innerHTML = cats.map(c => \`<button class="tab-btn \${c === 'all' ? 'active' : ''}" data-cat="\${c}">\${c.charAt(0).toUpperCase() + c.slice(1)}</button>\`).join('');
let activeCat = 'all';

function renderGallery() {
  const filtered = activeCat === 'all' ? pastries : pastries.filter(p => p.cat === activeCat);
  document.getElementById('gallery').innerHTML = filtered.map(p => \`
    <div class="pastry-card bg-stone-50 rounded-xl overflow-hidden border border-stone-100">
      <div class="h-32 bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center text-5xl">\${p.img}</div>
      <div class="p-4 flex items-center justify-between">
        <div><h3 class="font-bold text-sm">\${p.name}</h3><span class="text-xs text-stone-400">\${p.cat}</span></div>
        <span class="text-amber-700 font-bold text-sm">\${p.price}</span>
      </div>
    </div>
  \`).join('');
}

tabContainer.addEventListener('click', e => {
  if (!e.target.classList.contains('tab-btn')) return;
  tabContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  e.target.classList.add('active');
  activeCat = e.target.dataset.cat;
  renderGallery();
});
renderGallery();
`,
      },
    ],
  },

  // 10. Food Blog
  {
    name: 'Food Blog',
    icon: '📝',
    category: 'restaurant',
    description: 'Blog layout with featured post hero, post grid with read-time and category tags, and newsletter signup.',
    prompt: 'Create a food blog website with featured post hero, blog post grid showing category tags, read time, and author, plus a newsletter subscription section.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TasteTrail — Food Blog</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-orange-50 font-sans text-gray-800">
  <nav class="bg-white border-b border-orange-100 px-6 py-3 sticky top-0 z-40">
    <div class="max-w-5xl mx-auto flex items-center justify-between">
      <span class="text-xl font-bold text-orange-600">🍴 TasteTrail</span>
      <div class="flex gap-4 text-sm text-canvas-muted-deep font-medium">
        <a href="#" class="hover:text-orange-600">Home</a>
        <a href="#posts" class="hover:text-orange-600">Recipes</a>
        <a href="#newsletter" class="hover:text-orange-600">Subscribe</a>
      </div>
    </div>
  </nav>

  <!-- Featured Post -->
  <section class="max-w-5xl mx-auto px-6 py-10">
    <div class="bg-gradient-to-r from-orange-600 to-primary-500 rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 text-white">
      <div class="flex-1">
        <span class="text-orange-200 text-xs font-bold uppercase tracking-widest">Featured Post</span>
        <h1 class="text-3xl md:text-4xl font-bold mt-2 mb-3">The Perfect Homemade Ramen</h1>
        <p class="text-orange-100 mb-4">Learn how to make authentic tonkotsu ramen from scratch — rich broth, handmade noodles, and all the toppings.</p>
        <div class="flex items-center gap-4 text-sm text-orange-200">
          <span>📅 March 15, 2025</span><span>⏱ 8 min read</span>
        </div>
        <button class="mt-4 px-6 py-2 bg-white text-orange-700 rounded-full text-sm font-bold hover:bg-orange-50 transition">Read Full Post</button>
      </div>
      <div class="w-40 h-40 bg-white/20 rounded-2xl flex items-center justify-center text-7xl">🍜</div>
    </div>
  </section>

  <!-- Filters -->
  <section class="max-w-5xl mx-auto px-6 mb-6">
    <div class="flex items-center gap-3 flex-wrap" id="filters"></div>
  </section>

  <!-- Post Grid -->
  <section id="posts" class="max-w-5xl mx-auto px-6 pb-16">
    <div id="postGrid" class="grid md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
  </section>

  <!-- Newsletter -->
  <section id="newsletter" class="bg-orange-700 text-white py-16 px-6">
    <div class="max-w-lg mx-auto text-center">
      <h2 class="text-2xl font-bold mb-2">Get Recipes in Your Inbox</h2>
      <p class="text-orange-200 mb-6">Join 12,000+ food lovers. New recipes every week.</p>
      <form id="subForm" class="flex gap-2 max-w-md mx-auto">
        <input type="email" placeholder="your@email.com" class="flex-1 px-4 py-3 rounded-lg text-gray-800 outline-none" required />
        <button type="submit" class="px-6 py-3 bg-white text-orange-700 font-bold rounded-lg hover:bg-orange-50 transition">Subscribe</button>
      </form>
      <p id="subMsg" class="text-sm mt-3 text-orange-200 hidden">✅ You're subscribed! Check your inbox.</p>
    </div>
  </section>

  <footer class="bg-gray-800 text-canvas-muted text-center text-sm py-6">&copy; 2025 TasteTrail. All rights reserved.</footer>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.filter-btn { padding: 6px 16px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; border: 2px solid #fed7aa; background: white; cursor: pointer; transition: all 0.2s; }
.filter-btn:hover { border-color: #ea580c; }
.filter-btn.active { background: #ea580c; color: white; border-color: #ea580c; }

.post-card { transition: all 0.25s; cursor: pointer; }
.post-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.08); }

.tag { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 0.65rem; font-weight: 600; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const posts = [
  { title: 'Crispy Korean Fried Chicken', cat: 'asian', time: '6 min', date: 'Mar 12', author: 'Alex Kim', img: '🍗', excerpt: 'Double-fried for extra crunch with gochujang glaze.', tagColor: 'bg-red-100 text-primary-600' },
  { title: 'Farm-to-Table Summer Salad', cat: 'healthy', time: '4 min', date: 'Mar 10', author: 'Mia Rose', img: '🥗', excerpt: 'Seasonal greens, heirloom tomatoes, and citrus vinaigrette.', tagColor: 'bg-green-100 text-green-600' },
  { title: '5-Ingredient Pasta', cat: 'quick', time: '3 min', date: 'Mar 8', author: 'Luca Di Roma', img: '🍝', excerpt: 'Simple cacio e pepe with a modern twist.', tagColor: 'bg-yellow-100 text-yellow-700' },
  { title: 'Artisan Sourdough Guide', cat: 'baking', time: '10 min', date: 'Mar 5', author: 'Amelie Blanc', img: '🍞', excerpt: 'Master the art of slow-fermented sourdough bread.', tagColor: 'bg-amber-100 text-amber-700' },
  { title: 'Thai Green Curry', cat: 'asian', time: '7 min', date: 'Mar 3', author: 'Alex Kim', img: '🍛', excerpt: 'Aromatic coconut curry with fresh Thai basil.', tagColor: 'bg-red-100 text-primary-600' },
  { title: 'Smoothie Bowl Combos', cat: 'healthy', time: '3 min', date: 'Feb 28', author: 'Mia Rose', img: '🫐', excerpt: 'Acai, pitaya, and matcha bowl recipes.', tagColor: 'bg-green-100 text-green-600' },
  { title: '15-Minute Tacos', cat: 'quick', time: '3 min', date: 'Feb 25', author: 'Carlos Ruiz', img: '🌮', excerpt: 'Easy street-style tacos for busy weeknights.', tagColor: 'bg-yellow-100 text-yellow-700' },
  { title: 'French Macaron Secrets', cat: 'baking', time: '12 min', date: 'Feb 22', author: 'Amelie Blanc', img: '🟣', excerpt: 'Tips for perfect feet, shells, and ganache.', tagColor: 'bg-amber-100 text-amber-700' },
  { title: 'Japanese Gyoza', cat: 'asian', time: '8 min', date: 'Feb 20', author: 'Alex Kim', img: '🥟', excerpt: 'Crispy pan-fried dumplings with dipping sauce.', tagColor: 'bg-red-100 text-primary-600' },
];

const cats = ['all', 'asian', 'healthy', 'quick', 'baking'];
let active = 'all';

const filters = document.getElementById('filters');
filters.innerHTML = cats.map(c => \`<button class="filter-btn \${c === 'all' ? 'active' : ''}" data-cat="\${c}">\${c.charAt(0).toUpperCase() + c.slice(1)}</button>\`).join('');

function render() {
  const list = active === 'all' ? posts : posts.filter(p => p.cat === active);
  document.getElementById('postGrid').innerHTML = list.map(p => \`
    <div class="post-card bg-white rounded-xl overflow-hidden border border-orange-100">
      <div class="h-36 bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center text-5xl">\${p.img}</div>
      <div class="p-5">
        <div class="flex items-center gap-2 mb-2">
          <span class="tag \${p.tagColor}">\${p.cat}</span>
          <span class="text-xs text-canvas-muted">⏱ \${p.time}</span>
        </div>
        <h3 class="font-bold mb-1">\${p.title}</h3>
        <p class="text-sm text-canvas-muted mb-3">\${p.excerpt}</p>
        <div class="flex items-center justify-between text-xs text-canvas-muted">
          <span>\${p.author}</span><span>\${p.date}</span>
        </div>
      </div>
    </div>
  \`).join('');
}

filters.addEventListener('click', e => {
  if (!e.target.classList.contains('filter-btn')) return;
  filters.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  e.target.classList.add('active');
  active = e.target.dataset.cat;
  render();
});

document.getElementById('subForm').addEventListener('submit', e => {
  e.preventDefault();
  document.getElementById('subMsg').classList.remove('hidden');
  e.target.reset();
});

render();
`,
      },
    ],
  },

  // ─── E-COMMERCE ──────────────────────────────────

  // 11. Product Showcase
  {
    name: 'Product Showcase',
    icon: '🛍️',
    category: 'ecommerce',
    description: 'Product landing page with image gallery, color/size selectors, add-to-cart, and reviews.',
    prompt: 'Build a product showcase landing page with image gallery, color and size selectors, add to cart button, specifications, and customer reviews section.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NovaTech — Product Showcase</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-50 font-sans text-gray-800">
  <nav class="bg-white border-b px-6 py-3 sticky top-0 z-40">
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <span class="text-xl font-bold text-indigo-600">⚡ NovaTech</span>
      <div class="flex items-center gap-4">
        <span class="text-sm text-canvas-muted-deep">Free shipping on orders $50+</span>
        <button id="cartBtn" class="relative px-3 py-2 bg-indigo-50 rounded-lg text-indigo-600 font-medium text-sm">🛒 <span id="cartCount">0</span></button>
      </div>
    </div>
  </nav>

  <div class="max-w-6xl mx-auto px-6 py-10">
    <div class="flex flex-col lg:flex-row gap-12">
      <!-- Gallery -->
      <div class="flex-1">
        <div id="mainImg" class="w-full h-80 bg-gradient-to-br from-indigo-100 to-purple-50 rounded-2xl flex items-center justify-center text-8xl mb-4">🎧</div>
        <div class="grid grid-cols-4 gap-3">
          <div class="thumb active h-20 bg-indigo-50 rounded-lg flex items-center justify-center text-3xl cursor-pointer" data-img="🎧">🎧</div>
          <div class="thumb h-20 bg-indigo-50 rounded-lg flex items-center justify-center text-3xl cursor-pointer" data-img="🎵">🎵</div>
          <div class="thumb h-20 bg-indigo-50 rounded-lg flex items-center justify-center text-3xl cursor-pointer" data-img="📦">📦</div>
          <div class="thumb h-20 bg-indigo-50 rounded-lg flex items-center justify-center text-3xl cursor-pointer" data-img="⚡">⚡</div>
        </div>
      </div>

      <!-- Product Info -->
      <div class="flex-1">
        <span class="text-xs text-indigo-500 font-bold uppercase tracking-widest">New Release</span>
        <h1 class="text-3xl font-bold mt-1 mb-2">NovaSound Pro X1</h1>
        <div class="flex items-center gap-2 mb-4">
          <span class="text-yellow-500">★★★★★</span><span class="text-sm text-canvas-muted">(142 reviews)</span>
        </div>
        <div class="flex items-baseline gap-3 mb-6">
          <span class="text-3xl font-bold text-indigo-600">$149.99</span>
          <span class="text-lg text-canvas-muted line-through">$199.99</span>
          <span class="bg-red-100 text-primary-600 px-2 py-1 rounded text-xs font-bold">25% OFF</span>
        </div>

        <p class="text-canvas-muted-deep mb-6">Premium wireless headphones with active noise cancellation, 40-hour battery life, and Hi-Res Audio support.</p>

        <!-- Color Selector -->
        <div class="mb-4">
          <label class="text-sm font-bold block mb-2">Color: <span id="colorName">Midnight Black</span></label>
          <div class="flex gap-2" id="colors">
            <button class="color-dot active" data-color="Midnight Black" style="background:#1e1b4b"></button>
            <button class="color-dot" data-color="Arctic White" style="background:#f5f5f4"></button>
            <button class="color-dot" data-color="Ocean Blue" style="background:#3b82f6"></button>
            <button class="color-dot" data-color="Rose Gold" style="background:#f59e0b"></button>
          </div>
        </div>

        <!-- Quantity -->
        <div class="mb-6">
          <label class="text-sm font-bold block mb-2">Quantity</label>
          <div class="flex items-center gap-3">
            <button id="decQty" class="w-9 h-9 rounded-lg bg-gray-100 text-lg font-bold hover:bg-gray-200">−</button>
            <span id="qty" class="text-lg font-bold w-8 text-center">1</span>
            <button id="incQty" class="w-9 h-9 rounded-lg bg-gray-100 text-lg font-bold hover:bg-gray-200">+</button>
          </div>
        </div>

        <button id="addToCart" class="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition mb-3">Add to Cart — $149.99</button>
        <button class="w-full py-3 border-2 border-indigo-200 rounded-xl font-bold text-indigo-600 hover:bg-indigo-50 transition">♡ Add to Wishlist</button>

        <!-- Specs -->
        <div class="mt-8 border-t pt-6 space-y-3">
          <h3 class="font-bold mb-2">Specifications</h3>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <span class="text-canvas-muted">Driver</span><span>40mm Custom</span>
            <span class="text-canvas-muted">Battery</span><span>40 hours</span>
            <span class="text-canvas-muted">Noise Cancel</span><span>Hybrid ANC</span>
            <span class="text-canvas-muted">Bluetooth</span><span>5.3</span>
            <span class="text-canvas-muted">Weight</span><span>250g</span>
            <span class="text-canvas-muted">Codec</span><span>LDAC, AAC, SBC</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Reviews -->
    <section class="mt-16">
      <h2 class="text-2xl font-bold mb-6">Customer Reviews</h2>
      <div id="reviews" class="space-y-4"></div>
    </section>
  </div>

  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.color-dot { width: 32px; height: 32px; border-radius: 50%; border: 3px solid transparent; cursor: pointer; transition: all 0.2s; }
.color-dot:hover { transform: scale(1.1); }
.color-dot.active { border-color: #4f46e5; box-shadow: 0 0 0 2px white, 0 0 0 4px #4f46e5; }
.thumb { border: 2px solid transparent; transition: all 0.2s; }
.thumb.active { border-color: #4f46e5; }
.thumb:hover { border-color: #a5b4fc; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const price = 149.99;
let qty = 1, cartItems = 0;

// Gallery
document.querySelectorAll('.thumb').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.thumb').forEach(th => th.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('mainImg').textContent = t.dataset.img;
  });
});

// Colors
document.getElementById('colors').addEventListener('click', e => {
  if (!e.target.classList.contains('color-dot')) return;
  document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
  e.target.classList.add('active');
  document.getElementById('colorName').textContent = e.target.dataset.color;
});

// Quantity
const update = () => {
  document.getElementById('qty').textContent = qty;
  document.getElementById('addToCart').textContent = \`Add to Cart — $\${(price * qty).toFixed(2)}\`;
};
document.getElementById('decQty').addEventListener('click', () => { if (qty > 1) { qty--; update(); } });
document.getElementById('incQty').addEventListener('click', () => { if (qty < 10) { qty++; update(); } });

// Add to cart
document.getElementById('addToCart').addEventListener('click', () => {
  cartItems += qty;
  document.getElementById('cartCount').textContent = cartItems;
  document.getElementById('addToCart').textContent = '✓ Added!';
  setTimeout(update, 1200);
});

// Reviews
const reviews = [
  { name: 'James T.', rating: 5, text: 'Best headphones I have ever owned. ANC is incredible and battery lasts forever.', date: '2 days ago' },
  { name: 'Sarah M.', rating: 5, text: 'Sound quality is phenomenal. Comfortable enough for all-day wear.', date: '1 week ago' },
  { name: 'David L.', rating: 4, text: 'Great build quality and sound. Wish the case was a bit smaller.', date: '2 weeks ago' },
  { name: 'Emma R.', rating: 5, text: 'The noise cancellation makes my commute so much better. Highly recommend!', date: '3 weeks ago' },
];
document.getElementById('reviews').innerHTML = reviews.map(r => \`
  <div class="bg-white rounded-xl p-5 border border-gray-100">
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-bold text-indigo-600">\${r.name[0]}</div>
        <div><span class="font-bold text-sm">\${r.name}</span><br/><span class="text-xs text-canvas-muted">\${r.date}</span></div>
      </div>
      <span class="text-yellow-500 text-sm">\${'★'.repeat(r.rating)}\${'☆'.repeat(5-r.rating)}</span>
    </div>
    <p class="text-sm text-canvas-muted-deep">\${r.text}</p>
  </div>
\`).join('');
`,
      },
    ],
  },

  // 12. Shopping Cart
  {
    name: 'Shopping Cart',
    icon: '🛒',
    category: 'ecommerce',
    description: 'Full shopping cart page with item list, quantity controls, promo code, order summary, and checkout.',
    prompt: 'Create a shopping cart page with product list showing thumbnails, quantity controls, remove item, promo code input, order summary with subtotal/shipping/tax/total, and checkout button.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Shopping Cart</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-50 font-sans text-gray-800 min-h-screen">
  <nav class="bg-white border-b px-6 py-3">
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <span class="text-xl font-bold text-indigo-600">🛒 ShopNow</span>
      <span class="text-sm text-canvas-muted">Continue Shopping →</span>
    </div>
  </nav>

  <div class="max-w-6xl mx-auto px-6 py-10">
    <h1 class="text-2xl font-bold mb-8">Your Cart (<span id="itemCount">0</span> items)</h1>
    <div class="flex flex-col lg:flex-row gap-8">
      <!-- Cart Items -->
      <div class="flex-1">
        <div id="cartItems" class="space-y-4"></div>
        <div id="emptyCart" class="hidden text-center py-16 text-canvas-muted">
          <span class="text-5xl block mb-4">🛒</span>
          <p class="text-lg font-medium">Your cart is empty</p>
        </div>
      </div>

      <!-- Order Summary -->
      <div class="w-full lg:w-80">
        <div class="bg-white rounded-xl p-6 border border-gray-100 sticky top-20">
          <h2 class="font-bold text-lg mb-4">Order Summary</h2>
          <div class="space-y-3 text-sm mb-4">
            <div class="flex justify-between"><span class="text-canvas-muted-deep">Subtotal</span><span id="subtotal" class="font-medium">$0</span></div>
            <div class="flex justify-between"><span class="text-canvas-muted-deep">Shipping</span><span id="shipping" class="font-medium">$0</span></div>
            <div class="flex justify-between"><span class="text-canvas-muted-deep">Tax</span><span id="tax" class="font-medium">$0</span></div>
            <div id="discountRow" class="flex justify-between hidden"><span class="text-green-600">Discount</span><span id="discount" class="text-green-600 font-medium">-$0</span></div>
          </div>

          <!-- Promo -->
          <div class="flex gap-2 mb-4">
            <input id="promoInput" type="text" placeholder="Promo code" class="flex-1 px-3 py-2 border rounded-lg text-sm outline-none focus:border-indigo-400" />
            <button id="applyPromo" class="px-3 py-2 bg-indigo-50 text-indigo-600 text-sm font-bold rounded-lg hover:bg-indigo-100">Apply</button>
          </div>
          <div id="promoMsg" class="text-xs mb-3 hidden"></div>

          <div class="border-t pt-3 flex justify-between items-center font-bold text-lg mb-4">
            <span>Total</span><span id="total">$0</span>
          </div>
          <button id="checkoutBtn" class="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition">Proceed to Checkout</button>
          <p class="text-xs text-canvas-muted text-center mt-3">🔒 Secure checkout powered by Stripe</p>
        </div>
      </div>
    </div>
  </div>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.cart-item { transition: all 0.3s; }
.cart-item:hover { box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
.cart-item.removing { opacity: 0; transform: translateX(50px); }
.qty-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e5e7eb; background: white; cursor: pointer; font-weight: bold; transition: all 0.15s; display: flex; align-items: center; justify-content: center; }
.qty-btn:hover { background: #f3f4f6; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `let cart = [
  { id: 1, name: 'Wireless Headphones', variant: 'Black / Over-ear', price: 149.99, qty: 1, img: '🎧' },
  { id: 2, name: 'Smart Watch Pro', variant: 'Silver / 44mm', price: 299.99, qty: 1, img: '⌚' },
  { id: 3, name: 'USB-C Hub Adapter', variant: '7-in-1', price: 49.99, qty: 2, img: '🔌' },
  { id: 4, name: 'Mechanical Keyboard', variant: 'Cherry MX Blue', price: 129.99, qty: 1, img: '⌨️' },
];

let promoApplied = false, promoRate = 0;
const SHIPPING_THRESHOLD = 100;
const TAX_RATE = 0.08;

function calcTotals() {
  const sub = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const ship = sub >= SHIPPING_THRESHOLD ? 0 : 9.99;
  const disc = promoApplied ? sub * promoRate : 0;
  const taxable = sub - disc;
  const tax = taxable * TAX_RATE;
  const total = taxable + ship + tax;
  return { sub, ship, disc, tax, total };
}

function render() {
  const container = document.getElementById('cartItems');
  const empty = document.getElementById('emptyCart');
  document.getElementById('itemCount').textContent = cart.reduce((s, i) => s + i.qty, 0);

  if (!cart.length) { container.innerHTML = ''; empty.classList.remove('hidden'); }
  else {
    empty.classList.add('hidden');
    container.innerHTML = cart.map(item => \`
      <div class="cart-item bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-4" data-id="\${item.id}">
        <div class="w-16 h-16 bg-indigo-50 rounded-xl flex items-center justify-center text-3xl shrink-0">\${item.img}</div>
        <div class="flex-1 min-w-0">
          <h3 class="font-bold text-sm truncate">\${item.name}</h3>
          <p class="text-xs text-canvas-muted">\${item.variant}</p>
          <span class="text-indigo-600 font-bold text-sm">$\${item.price.toFixed(2)}</span>
        </div>
        <div class="flex items-center gap-2">
          <button class="qty-btn" data-action="dec" data-id="\${item.id}">−</button>
          <span class="w-8 text-center font-bold text-sm">\${item.qty}</span>
          <button class="qty-btn" data-action="inc" data-id="\${item.id}">+</button>
        </div>
        <span class="font-bold text-sm w-20 text-right">$\${(item.price * item.qty).toFixed(2)}</span>
        <button class="text-canvas-text hover:text-primary-500 transition text-lg" data-action="remove" data-id="\${item.id}">&times;</button>
      </div>
    \`).join('');
  }

  const t = calcTotals();
  document.getElementById('subtotal').textContent = '$' + t.sub.toFixed(2);
  document.getElementById('shipping').textContent = t.ship === 0 ? 'FREE' : '$' + t.ship.toFixed(2);
  document.getElementById('tax').textContent = '$' + t.tax.toFixed(2);
  document.getElementById('total').textContent = '$' + t.total.toFixed(2);
  if (promoApplied) {
    document.getElementById('discountRow').classList.remove('hidden');
    document.getElementById('discount').textContent = '-$' + t.disc.toFixed(2);
  }
}

document.addEventListener('click', e => {
  const id = Number(e.target.dataset?.id);
  const action = e.target.dataset?.action;
  if (!action || !id) return;
  const item = cart.find(i => i.id === id);
  if (!item) return;
  if (action === 'inc') { item.qty = Math.min(item.qty + 1, 10); render(); }
  if (action === 'dec') { if (item.qty > 1) { item.qty--; render(); } }
  if (action === 'remove') {
    const el = e.target.closest('.cart-item');
    el.classList.add('removing');
    setTimeout(() => { cart = cart.filter(i => i.id !== id); render(); }, 300);
  }
});

document.getElementById('applyPromo').addEventListener('click', () => {
  const code = document.getElementById('promoInput').value.trim().toUpperCase();
  const msg = document.getElementById('promoMsg');
  if (code === 'SAVE10') { promoApplied = true; promoRate = 0.10; msg.textContent = '✅ 10% discount applied!'; msg.className = 'text-xs mb-3 text-green-600'; }
  else if (code === 'SAVE20') { promoApplied = true; promoRate = 0.20; msg.textContent = '✅ 20% discount applied!'; msg.className = 'text-xs mb-3 text-green-600'; }
  else { msg.textContent = '❌ Invalid promo code'; msg.className = 'text-xs mb-3 text-primary-500'; }
  msg.classList.remove('hidden');
  render();
});

document.getElementById('checkoutBtn').addEventListener('click', () => {
  if (!cart.length) return;
  alert('Proceeding to checkout with ' + cart.reduce((s, i) => s + i.qty, 0) + ' items. Total: $' + calcTotals().total.toFixed(2));
});

render();
`,
      },
    ],
  },

  // 13. Fashion Store
  {
    name: 'Fashion Store',
    icon: '👗',
    category: 'ecommerce',
    description: 'Trendy fashion storefront with lookbook hero, category filters, product grid, and quick-view modal.',
    prompt: 'Build a fashion store website with a fullscreen lookbook hero, category filters, product grid with hover quick-view, and wishlist toggle.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>VOGUE Studio — Fashion Store</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-white font-sans text-gray-900">
  <nav class="bg-white border-b px-6 py-4 sticky top-0 z-40">
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <span class="text-xl font-bold tracking-widest uppercase">VOGUE Studio</span>
      <div class="flex gap-6 text-xs font-medium uppercase tracking-widest text-canvas-muted-deep">
        <a href="#new" class="hover:text-black">New</a>
        <a href="#products" class="hover:text-black">Shop</a>
        <a href="#" class="hover:text-black">Collections</a>
      </div>
      <div class="flex items-center gap-3 text-sm">
        <button id="wishCount" class="hover:text-pink-500">♡ 0</button>
        <button class="hover:text-black">🛒 0</button>
      </div>
    </div>
  </nav>

  <!-- Hero Lookbook -->
  <section class="bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100 py-24 px-6 text-center">
    <p class="text-xs uppercase tracking-widest text-pink-600 font-bold mb-2">Spring / Summer 2025</p>
    <h1 class="text-5xl md:text-6xl font-bold mb-4">New Arrivals</h1>
    <p class="text-canvas-muted-deep max-w-md mx-auto mb-6">Discover this season's latest trends — from effortless minimalism to bold statement pieces.</p>
    <button class="px-8 py-3 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition">Shop the Collection</button>
  </section>

  <!-- Categories -->
  <section id="new" class="max-w-6xl mx-auto px-6 py-12">
    <div class="flex gap-2 flex-wrap justify-center mb-8" id="catFilters"></div>
  </section>

  <!-- Product Grid -->
  <section id="products" class="max-w-6xl mx-auto px-6 pb-16">
    <div id="grid" class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"></div>
  </section>

  <!-- Quick View Modal -->
  <div id="modal" class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm items-center justify-center hidden">
    <div class="bg-white rounded-2xl max-w-lg w-full mx-4 p-8 relative">
      <button id="closeModal" class="absolute top-4 right-4 text-canvas-muted hover:text-gray-700 text-2xl">&times;</button>
      <div id="modalContent"></div>
    </div>
  </div>

  <footer class="bg-gray-900 text-canvas-muted py-10 px-6">
    <div class="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 text-sm">
      <div><h4 class="text-white font-bold mb-3">VOGUE Studio</h4><p>Premium fashion for the modern aesthetic.</p></div>
      <div><h4 class="text-white font-bold mb-3">Quick Links</h4><p>New Arrivals · Sale · Lookbook · Contact</p></div>
      <div><h4 class="text-white font-bold mb-3">Follow Us</h4><p>Instagram · Pinterest · TikTok</p></div>
    </div>
  </footer>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.cat-btn { padding: 6px 18px; border-radius: 9999px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid #e5e7eb; background: white; cursor: pointer; transition: all 0.2s; }
.cat-btn:hover { border-color: #111; }
.cat-btn.active { background: #111; color: white; border-color: #111; }

.product-card { position: relative; overflow: hidden; transition: all 0.3s; }
.product-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.06); }
.product-card .overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; gap: 8px; opacity: 0; transition: opacity 0.3s; }
.product-card:hover .overlay { opacity: 1; }
.wish-active { color: #ec4899 !important; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const products = [
  { id: 1, name: 'Linen Blazer', cat: 'tops', price: 89, img: '🧥', color: 'Beige', sizes: ['S','M','L'] },
  { id: 2, name: 'Silk Blouse', cat: 'tops', price: 65, img: '👚', color: 'Ivory', sizes: ['XS','S','M','L'] },
  { id: 3, name: 'Wide Leg Trousers', cat: 'bottoms', price: 72, img: '👖', color: 'Black', sizes: ['S','M','L','XL'] },
  { id: 4, name: 'Pleated Skirt', cat: 'bottoms', price: 58, img: '👗', color: 'Navy', sizes: ['XS','S','M'] },
  { id: 5, name: 'Leather Tote', cat: 'accessories', price: 120, img: '👜', color: 'Tan', sizes: ['One Size'] },
  { id: 6, name: 'Gold Hoop Earrings', cat: 'accessories', price: 35, img: '💍', color: 'Gold', sizes: ['One Size'] },
  { id: 7, name: 'Cashmere Sweater', cat: 'tops', price: 110, img: '🧶', color: 'Cream', sizes: ['S','M','L'] },
  { id: 8, name: 'Denim Jacket', cat: 'tops', price: 95, img: '🧥', color: 'Washed Blue', sizes: ['S','M','L','XL'] },
  { id: 9, name: 'Midi Dress', cat: 'dresses', price: 88, img: '👗', color: 'Forest Green', sizes: ['XS','S','M','L'] },
  { id: 10, name: 'Wrap Dress', cat: 'dresses', price: 76, img: '👗', color: 'Burgundy', sizes: ['S','M','L'] },
  { id: 11, name: 'Chino Shorts', cat: 'bottoms', price: 45, img: '🩳', color: 'Khaki', sizes: ['S','M','L'] },
  { id: 12, name: 'Straw Hat', cat: 'accessories', price: 28, img: '👒', color: 'Natural', sizes: ['One Size'] },
];

const cats = ['all', 'tops', 'bottoms', 'dresses', 'accessories'];
let active = 'all';
const wishlist = new Set();

const filterContainer = document.getElementById('catFilters');
filterContainer.innerHTML = cats.map(c => \`<button class="cat-btn \${c === 'all' ? 'active' : ''}" data-cat="\${c}">\${c}</button>\`).join('');

function render() {
  const list = active === 'all' ? products : products.filter(p => p.cat === active);
  document.getElementById('grid').innerHTML = list.map(p => \`
    <div class="product-card bg-white rounded-xl border border-gray-100 cursor-pointer" data-id="\${p.id}">
      <div class="relative h-56 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center text-6xl">
        \${p.img}
        <div class="overlay rounded-t-xl">
          <button class="px-4 py-2 bg-white text-black rounded-full text-xs font-bold quick-view" data-id="\${p.id}">Quick View</button>
          <button class="w-9 h-9 bg-white rounded-full flex items-center justify-center wish-btn \${wishlist.has(p.id) ? 'wish-active' : ''}" data-id="\${p.id}">♡</button>
        </div>
      </div>
      <div class="p-4">
        <h3 class="font-medium text-sm">\${p.name}</h3>
        <p class="text-xs text-canvas-muted">\${p.color}</p>
        <span class="font-bold mt-1 block">$\${p.price}</span>
      </div>
    </div>
  \`).join('');
}

filterContainer.addEventListener('click', e => {
  if (!e.target.classList.contains('cat-btn')) return;
  filterContainer.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  e.target.classList.add('active');
  active = e.target.dataset.cat;
  render();
});

document.addEventListener('click', e => {
  if (e.target.classList.contains('wish-btn')) {
    const id = Number(e.target.dataset.id);
    wishlist.has(id) ? wishlist.delete(id) : wishlist.add(id);
    document.getElementById('wishCount').textContent = '♡ ' + wishlist.size;
    render();
  }
  if (e.target.classList.contains('quick-view')) {
    const p = products.find(pr => pr.id === Number(e.target.dataset.id));
    document.getElementById('modalContent').innerHTML = \`
      <div class="flex flex-col items-center text-center">
        <div class="w-32 h-32 bg-gray-50 rounded-2xl flex items-center justify-center text-6xl mb-4">\${p.img}</div>
        <h2 class="text-xl font-bold">\${p.name}</h2>
        <p class="text-canvas-muted text-sm">\${p.color}</p>
        <span class="text-2xl font-bold my-3">$\${p.price}</span>
        <div class="flex gap-2 mb-4">\${p.sizes.map(s => \`<span class="px-3 py-1 border rounded-lg text-xs font-medium hover:bg-black hover:text-white cursor-pointer transition">\${s}</span>\`).join('')}</div>
        <button class="px-6 py-3 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition">Add to Bag</button>
      </div>
    \`;
    document.getElementById('modal').classList.remove('hidden');
    document.getElementById('modal').style.display = 'flex';
  }
});

document.getElementById('closeModal').addEventListener('click', () => { document.getElementById('modal').classList.add('hidden'); document.getElementById('modal').style.display = ''; });
document.getElementById('modal').addEventListener('click', e => { if (e.target === document.getElementById('modal')) { document.getElementById('modal').classList.add('hidden'); document.getElementById('modal').style.display = ''; } });

render();
`,
      },
    ],
  },

  // 14. Pricing Page
  {
    name: 'Pricing Page',
    icon: '💰',
    category: 'ecommerce',
    description: 'SaaS-style pricing with monthly/annual toggle, 3-tier cards, feature comparison table, and FAQ.',
    prompt: 'Create a pricing page with monthly/annual billing toggle, three pricing tiers with feature lists, a feature comparison table, and FAQ accordion.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pricing — CloudBase</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-50 font-sans text-gray-800">
  <nav class="bg-white border-b px-6 py-3">
    <div class="max-w-5xl mx-auto flex items-center justify-between">
      <span class="text-xl font-bold text-blue-600">☁️ CloudBase</span>
      <a href="#faq" class="text-sm text-canvas-muted-deep hover:text-blue-600">FAQ</a>
    </div>
  </nav>

  <section class="py-16 px-6 text-center">
    <h1 class="text-4xl font-bold mb-3">Simple, Transparent Pricing</h1>
    <p class="text-canvas-muted-deep max-w-md mx-auto mb-8">Choose the plan that fits your team. All plans include a 14-day free trial.</p>

    <!-- Toggle -->
    <div class="flex items-center justify-center gap-3 mb-12">
      <span id="monthLabel" class="text-sm font-medium text-gray-800">Monthly</span>
      <button id="toggle" class="w-14 h-7 bg-gray-200 rounded-full relative cursor-pointer transition-colors">
        <div id="toggleDot" class="w-5 h-5 bg-white rounded-full absolute top-1 left-1 transition-transform shadow"></div>
      </button>
      <span id="yearLabel" class="text-sm font-medium text-canvas-muted">Annual <span class="text-green-600 text-xs font-bold">Save 20%</span></span>
    </div>

    <!-- Pricing Cards -->
    <div class="max-w-5xl mx-auto grid md:grid-cols-3 gap-6" id="cards"></div>
  </section>

  <!-- Feature Comparison -->
  <section class="max-w-4xl mx-auto px-6 pb-16">
    <h2 class="text-2xl font-bold text-center mb-8">Feature Comparison</h2>
    <div class="overflow-x-auto">
      <table class="w-full text-sm bg-white rounded-xl border border-gray-100 overflow-hidden">
        <thead>
          <tr class="bg-gray-50 border-b"><th class="text-left p-4">Feature</th><th class="p-4">Starter</th><th class="p-4">Pro</th><th class="p-4">Enterprise</th></tr>
        </thead>
        <tbody id="featureTable"></tbody>
      </table>
    </div>
  </section>

  <!-- FAQ -->
  <section id="faq" class="max-w-3xl mx-auto px-6 pb-16">
    <h2 class="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
    <div id="faqList" class="space-y-3"></div>
  </section>

  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.pricing-card { transition: all 0.3s; border: 2px solid transparent; }
.pricing-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.08); }
.pricing-card.popular { border-color: #3b82f6; }
.faq-item { background: white; border: 1px solid #f3f4f6; border-radius: 12px; overflow: hidden; }
.faq-header { padding: 16px 20px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: 0.9rem; }
.faq-header:hover { background: #f9fafb; }
.faq-body { max-height: 0; overflow: hidden; transition: max-height 0.3s ease; }
.faq-body.open { max-height: 200px; }
.faq-body p { padding: 0 20px 16px; color: #6b7280; font-size: 0.875rem; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const plans = [
  { name: 'Starter', monthly: 19, features: ['5 Users','10 GB Storage','Basic Analytics','Email Support','API Access'], cta: 'Start Free Trial' },
  { name: 'Pro', monthly: 49, popular: true, features: ['25 Users','100 GB Storage','Advanced Analytics','Priority Support','API Access','Custom Integrations','Team Collaboration'], cta: 'Start Free Trial' },
  { name: 'Enterprise', monthly: 99, features: ['Unlimited Users','1 TB Storage','Enterprise Analytics','24/7 Phone Support','API Access','Custom Integrations','SSO & SAML','Dedicated Manager'], cta: 'Contact Sales' },
];

const features = [
  ['Users', '5', '25', 'Unlimited'],
  ['Storage', '10 GB', '100 GB', '1 TB'],
  ['Analytics', 'Basic', 'Advanced', 'Enterprise'],
  ['API Access', '✓', '✓', '✓'],
  ['Custom Integrations', '—', '✓', '✓'],
  ['SSO / SAML', '—', '—', '✓'],
  ['Support', 'Email', 'Priority', '24/7 Phone'],
  ['SLA Guarantee', '—', '99.9%', '99.99%'],
];

const faqs = [
  { q: 'Can I switch plans anytime?', a: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.' },
  { q: 'What happens after the free trial?', a: 'After 14 days, you'll be prompted to choose a plan. No charges during the trial period.' },
  { q: 'Do you offer refunds?', a: 'We offer a 30-day money-back guarantee on all plans. No questions asked.' },
  { q: 'Is there a setup fee?', a: 'No, there are no setup fees or hidden costs. You only pay for your chosen plan.' },
  { q: 'Can I cancel anytime?', a: 'Absolutely. Cancel anytime from your account settings. No cancellation fees.' },
];

let annual = false;

function renderCards() {
  document.getElementById('cards').innerHTML = plans.map(p => {
    const price = annual ? Math.round(p.monthly * 0.8) : p.monthly;
    return \`
    <div class="pricing-card bg-white rounded-2xl p-8 text-left \${p.popular ? 'popular' : ''}">
      \${p.popular ? '<span class="text-xs bg-blue-600 text-white px-3 py-1 rounded-full font-bold">Most Popular</span>' : ''}
      <h3 class="text-xl font-bold mt-\${p.popular ? '3' : '0'} mb-1">\${p.name}</h3>
      <div class="flex items-baseline gap-1 mb-1">
        <span class="text-4xl font-bold">$\${price}</span>
        <span class="text-canvas-muted text-sm">/mo</span>
      </div>
      <p class="text-xs text-canvas-muted mb-6">\${annual ? 'Billed annually' : 'Billed monthly'}</p>
      <button class="w-full py-3 rounded-xl font-bold transition mb-6 \${p.popular ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}">\${p.cta}</button>
      <ul class="space-y-2">\${p.features.map(f => \`<li class="text-sm text-gray-600 flex items-center gap-2"><span class="text-green-500">✓</span>\${f}</li>\`).join('')}</ul>
    </div>\`;
  }).join('');
}

// Toggle
const toggle = document.getElementById('toggle');
toggle.addEventListener('click', () => {
  annual = !annual;
  document.getElementById('toggleDot').style.transform = annual ? 'translateX(28px)' : '';
  toggle.style.background = annual ? '#3b82f6' : '#e5e7eb';
  document.getElementById('monthLabel').style.color = annual ? '#9ca3af' : '#111';
  document.getElementById('yearLabel').style.color = annual ? '#111' : '#9ca3af';
  renderCards();
});

// Feature table
document.getElementById('featureTable').innerHTML = features.map(f => \`
  <tr class="border-b last:border-0"><td class="p-4 font-medium">\${f[0]}</td><td class="p-4 text-center">\${f[1]}</td><td class="p-4 text-center font-medium text-blue-600">\${f[2]}</td><td class="p-4 text-center">\${f[3]}</td></tr>
\`).join('');

// FAQ
document.getElementById('faqList').innerHTML = faqs.map((f, i) => \`
  <div class="faq-item">
    <div class="faq-header" data-idx="\${i}">\${f.q}<span class="text-canvas-muted text-lg">+</span></div>
    <div class="faq-body" id="faq\${i}"><p>\${f.a}</p></div>
  </div>
\`).join('');

document.getElementById('faqList').addEventListener('click', e => {
  const header = e.target.closest('.faq-header');
  if (!header) return;
  const body = document.getElementById('faq' + header.dataset.idx);
  const icon = header.querySelector('span');
  const isOpen = body.classList.contains('open');
  document.querySelectorAll('.faq-body').forEach(b => b.classList.remove('open'));
  document.querySelectorAll('.faq-header span').forEach(s => s.textContent = '+');
  if (!isOpen) { body.classList.add('open'); icon.textContent = '−'; }
});

renderCards();
`,
      },
    ],
  },

  // 15. Digital Marketplace
  {
    name: 'Digital Marketplace',
    icon: '🎨',
    category: 'ecommerce',
    description: 'Marketplace for digital products with category sidebar, product cards, ratings, and instant download.',
    prompt: 'Create a digital marketplace for templates, icons, and fonts with category sidebar, product grid, ratings, preview, and instant download buttons.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PixelMarket — Digital Marketplace</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-50 font-sans text-gray-800 min-h-screen">
  <nav class="bg-white border-b px-6 py-3 sticky top-0 z-40">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <span class="text-xl font-bold text-purple-600">🎨 PixelMarket</span>
      <input id="search" type="text" placeholder="Search products..." class="px-4 py-2 bg-gray-50 border rounded-lg text-sm w-64 outline-none focus:border-purple-400" />
      <div class="flex items-center gap-3 text-sm">
        <span class="text-canvas-muted">Sell Your Work</span>
        <button class="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700">Sign Up</button>
      </div>
    </div>
  </nav>

  <div class="max-w-7xl mx-auto px-6 py-8 flex gap-8">
    <!-- Sidebar -->
    <aside class="w-52 shrink-0 hidden lg:block">
      <h3 class="font-bold text-sm mb-3 text-canvas-muted uppercase tracking-widest">Categories</h3>
      <div id="sidebar" class="space-y-1"></div>
      <h3 class="font-bold text-sm mt-8 mb-3 text-canvas-muted uppercase tracking-widest">Price</h3>
      <div class="space-y-2 text-sm">
        <label class="flex items-center gap-2"><input type="radio" name="price" value="all" checked class="price-radio" /> All Prices</label>
        <label class="flex items-center gap-2"><input type="radio" name="price" value="free" class="price-radio" /> Free</label>
        <label class="flex items-center gap-2"><input type="radio" name="price" value="paid" class="price-radio" /> Paid</label>
      </div>
    </aside>

    <!-- Main -->
    <main class="flex-1">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold" id="title">All Products</h2>
        <select id="sort" class="text-sm px-3 py-2 border rounded-lg outline-none">
          <option value="popular">Most Popular</option>
          <option value="newest">Newest</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
        </select>
      </div>
      <div id="grid" class="grid sm:grid-cols-2 xl:grid-cols-3 gap-6"></div>
    </main>
  </div>

  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.side-btn { display: block; width: 100%; text-align: left; padding: 8px 12px; border-radius: 8px; font-size: 0.875rem; cursor: pointer; transition: all 0.15s; border: none; background: none; }
.side-btn:hover { background: #f3f4f6; }
.side-btn.active { background: #ede9fe; color: #7c3aed; font-weight: 600; }

.product-card { transition: all 0.25s; cursor: pointer; }
.product-card:hover { transform: translateY(-3px); box-shadow: 0 10px 25px rgba(0,0,0,0.06); }
.badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 0.65rem; font-weight: 700; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const products = [
  { id: 1, name: 'Dashboard UI Kit', cat: 'templates', price: 29, img: '📊', rating: 4.8, downloads: 2340, date: '2025-03-10', author: 'DesignCo' },
  { id: 2, name: 'Icon Pack — 500 Icons', cat: 'icons', price: 0, img: '✨', rating: 4.9, downloads: 8700, date: '2025-03-12', author: 'IconLab' },
  { id: 3, name: 'Modern Sans Font', cat: 'fonts', price: 15, img: '🔤', rating: 4.7, downloads: 3100, date: '2025-03-08', author: 'TypeFoundry' },
  { id: 4, name: 'E-commerce Starter', cat: 'templates', price: 49, img: '🛒', rating: 4.6, downloads: 1200, date: '2025-02-28', author: 'WebCraft' },
  { id: 5, name: 'Hand-drawn Illustrations', cat: 'graphics', price: 19, img: '🎨', rating: 4.9, downloads: 5600, date: '2025-03-15', author: 'ArtStudio' },
  { id: 6, name: '3D Mockup Bundle', cat: 'graphics', price: 35, img: '📦', rating: 4.5, downloads: 980, date: '2025-03-01', author: 'MockupPro' },
  { id: 7, name: 'Neon Icon Set', cat: 'icons', price: 12, img: '💎', rating: 4.4, downloads: 2100, date: '2025-02-20', author: 'IconLab' },
  { id: 8, name: 'Serif Display Font', cat: 'fonts', price: 0, img: '📝', rating: 4.8, downloads: 4500, date: '2025-03-05', author: 'TypeFoundry' },
  { id: 9, name: 'Landing Page Kit', cat: 'templates', price: 39, img: '🖥️', rating: 4.7, downloads: 1800, date: '2025-03-11', author: 'WebCraft' },
  { id: 10, name: 'Watercolor Textures', cat: 'graphics', price: 0, img: '🌈', rating: 4.6, downloads: 3400, date: '2025-02-15', author: 'ArtStudio' },
  { id: 11, name: 'Monospace Code Font', cat: 'fonts', price: 10, img: '💻', rating: 4.9, downloads: 6200, date: '2025-03-13', author: 'TypeFoundry' },
  { id: 12, name: 'Social Media Templates', cat: 'templates', price: 22, img: '📱', rating: 4.5, downloads: 4100, date: '2025-03-09', author: 'DesignCo' },
];

const cats = ['all', 'templates', 'icons', 'fonts', 'graphics'];
let activeCat = 'all', priceFilter = 'all', sortBy = 'popular';

const sidebar = document.getElementById('sidebar');
sidebar.innerHTML = cats.map(c => \`<button class="side-btn \${c === 'all' ? 'active' : ''}" data-cat="\${c}">\${c === 'all' ? '🗂 All' : ({templates:'📄 Templates',icons:'✨ Icons',fonts:'🔤 Fonts',graphics:'🎨 Graphics'})[c]}</button>\`).join('');

function getFiltered() {
  let list = activeCat === 'all' ? [...products] : products.filter(p => p.cat === activeCat);
  if (priceFilter === 'free') list = list.filter(p => p.price === 0);
  if (priceFilter === 'paid') list = list.filter(p => p.price > 0);
  const q = document.getElementById('search').value.toLowerCase();
  if (q) list = list.filter(p => p.name.toLowerCase().includes(q));
  if (sortBy === 'popular') list.sort((a, b) => b.downloads - a.downloads);
  if (sortBy === 'newest') list.sort((a, b) => new Date(b.date) - new Date(a.date));
  if (sortBy === 'price-low') list.sort((a, b) => a.price - b.price);
  if (sortBy === 'price-high') list.sort((a, b) => b.price - a.price);
  return list;
}

function render() {
  const list = getFiltered();
  document.getElementById('title').textContent = (activeCat === 'all' ? 'All Products' : activeCat.charAt(0).toUpperCase() + activeCat.slice(1)) + \` (\${list.length})\`;
  document.getElementById('grid').innerHTML = list.map(p => \`
    <div class="product-card bg-white rounded-xl overflow-hidden border border-gray-100">
      <div class="h-40 bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center text-5xl">\${p.img}</div>
      <div class="p-4">
        <div class="flex items-center gap-2 mb-2">
          <span class="badge bg-purple-100 text-purple-600">\${p.cat}</span>
          <span class="text-xs text-canvas-muted">⭐ \${p.rating}</span>
          <span class="text-xs text-canvas-muted">⬇ \${(p.downloads / 1000).toFixed(1)}k</span>
        </div>
        <h3 class="font-bold text-sm mb-1">\${p.name}</h3>
        <p class="text-xs text-canvas-muted mb-3">by \${p.author}</p>
        <div class="flex items-center justify-between">
          <span class="font-bold \${p.price === 0 ? 'text-green-600' : 'text-gray-800'}">\${p.price === 0 ? 'Free' : '$' + p.price}</span>
          <button class="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 transition">\${p.price === 0 ? 'Download' : 'Buy Now'}</button>
        </div>
      </div>
    </div>
  \`).join('');
}

sidebar.addEventListener('click', e => {
  if (!e.target.classList.contains('side-btn')) return;
  sidebar.querySelectorAll('.side-btn').forEach(b => b.classList.remove('active'));
  e.target.classList.add('active');
  activeCat = e.target.dataset.cat;
  render();
});
document.querySelectorAll('.price-radio').forEach(r => r.addEventListener('change', e => { priceFilter = e.target.value; render(); }));
document.getElementById('sort').addEventListener('change', e => { sortBy = e.target.value; render(); });
document.getElementById('search').addEventListener('input', render);
render();
`,
      },
    ],
  },

  // ─── PORTFOLIO ──────────────────────────────────

  // 16. Developer Portfolio
  {
    name: 'Developer Portfolio',
    icon: '💻',
    category: 'portfolio',
    description: 'Dark-themed developer portfolio with terminal hero, tech stack, project cards, and contact form.',
    prompt: 'Build a dark-themed developer portfolio with terminal-style hero animation, tech stack grid, project showcase cards with GitHub links, and a contact form.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Alex Rivera — Developer</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-950 text-gray-100 font-sans min-h-screen">
  <nav class="border-b border-gray-800 px-6 py-4 sticky top-0 bg-gray-950/90 backdrop-blur z-40">
    <div class="max-w-5xl mx-auto flex items-center justify-between">
      <span class="text-lg font-bold text-green-400 font-mono">&lt;alex /&gt;</span>
      <div class="flex gap-6 text-sm text-canvas-muted">
        <a href="#stack" class="hover:text-green-400">Stack</a>
        <a href="#projects" class="hover:text-green-400">Projects</a>
        <a href="#contact" class="hover:text-green-400">Contact</a>
      </div>
    </div>
  </nav>

  <!-- Terminal Hero -->
  <section class="py-24 px-6">
    <div class="max-w-3xl mx-auto">
      <div class="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
          <span class="w-3 h-3 rounded-full bg-primary-500"></span>
          <span class="w-3 h-3 rounded-full bg-yellow-500"></span>
          <span class="w-3 h-3 rounded-full bg-green-500"></span>
          <span class="text-xs text-canvas-muted-deep ml-2 font-mono">~/portfolio</span>
        </div>
        <div class="p-6 font-mono text-sm leading-relaxed">
          <p class="text-canvas-muted-deep">$ whoami</p>
          <p class="text-green-400 text-lg font-bold" id="typedName"></p>
          <p class="text-canvas-muted-deep mt-3">$ cat about.txt</p>
          <p class="text-canvas-text mt-1">Full-stack developer with 6+ years of experience building scalable web applications. Passionate about clean code, open source, and developer tooling.</p>
          <p class="text-canvas-muted-deep mt-3">$ ls skills/</p>
          <p class="text-blue-400 mt-1">react/ &nbsp; node/ &nbsp; typescript/ &nbsp; python/ &nbsp; postgres/ &nbsp; docker/</p>
          <span class="inline-block w-2 h-5 bg-green-400 animate-pulse ml-1"></span>
        </div>
      </div>
    </div>
  </section>

  <!-- Tech Stack -->
  <section id="stack" class="py-16 px-6">
    <div class="max-w-5xl mx-auto">
      <h2 class="text-2xl font-bold text-center mb-8">Tech Stack</h2>
      <div class="grid grid-cols-3 md:grid-cols-6 gap-4" id="stackGrid"></div>
    </div>
  </section>

  <!-- Projects -->
  <section id="projects" class="py-16 px-6">
    <div class="max-w-5xl mx-auto">
      <h2 class="text-2xl font-bold text-center mb-8">Featured Projects</h2>
      <div id="projectGrid" class="grid md:grid-cols-2 gap-6"></div>
    </div>
  </section>

  <!-- Contact -->
  <section id="contact" class="py-16 px-6">
    <div class="max-w-lg mx-auto">
      <h2 class="text-2xl font-bold text-center mb-8">Get in Touch</h2>
      <form id="contactForm" class="space-y-4">
        <input type="text" placeholder="Name" class="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-sm outline-none focus:border-green-500" required />
        <input type="email" placeholder="Email" class="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-sm outline-none focus:border-green-500" required />
        <textarea placeholder="Message" rows="4" class="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-sm outline-none focus:border-green-500 resize-none" required></textarea>
        <button type="submit" class="w-full py-3 bg-green-500 text-gray-900 font-bold rounded-xl hover:bg-green-400 transition">Send Message</button>
      </form>
      <p id="msgSent" class="text-center text-green-400 text-sm mt-3 hidden">✅ Message sent successfully!</p>
    </div>
  </section>

  <footer class="border-t border-gray-800 py-6 text-center text-sm text-canvas-muted-deep">
    Built with ☕ by Alex Rivera — <a href="#" class="text-green-400 hover:underline">GitHub</a> · <a href="#" class="text-green-400 hover:underline">LinkedIn</a>
  </footer>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.stack-item { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; text-align: center; transition: all 0.2s; }
.stack-item:hover { background: rgba(74,222,128,0.05); border-color: rgba(74,222,128,0.2); transform: translateY(-2px); }

.project-card { background: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; transition: all 0.3s; }
.project-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.3); border-color: #374151; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `// Typing animation
const name = 'Alex Rivera — Full Stack Developer';
let i = 0;
const typed = document.getElementById('typedName');
function typeChar() { if (i < name.length) { typed.textContent += name[i]; i++; setTimeout(typeChar, 60); } }
typeChar();

// Tech stack
const stack = [
  { name: 'React', icon: '⚛️' }, { name: 'Node.js', icon: '🟢' },
  { name: 'TypeScript', icon: '🔷' }, { name: 'Python', icon: '🐍' },
  { name: 'PostgreSQL', icon: '🐘' }, { name: 'Docker', icon: '🐳' },
  { name: 'AWS', icon: '☁️' }, { name: 'Redis', icon: '🔴' },
  { name: 'GraphQL', icon: '◈' }, { name: 'Next.js', icon: '▲' },
  { name: 'Tailwind', icon: '🌊' }, { name: 'Git', icon: '📂' },
];
document.getElementById('stackGrid').innerHTML = stack.map(s => \`
  <div class="stack-item"><span class="text-2xl block mb-2">\${s.icon}</span><span class="text-xs text-canvas-muted">\${s.name}</span></div>
\`).join('');

// Projects
const projects = [
  { name: 'DevFlow', desc: 'Open-source project management tool for dev teams with kanban boards and sprint tracking.', tech: ['React', 'Node.js', 'PostgreSQL'], stars: 1240, color: 'from-green-500/20 to-emerald-500/10' },
  { name: 'CodeSync', desc: 'Real-time collaborative code editor with multi-cursor support and video chat.', tech: ['TypeScript', 'WebSocket', 'Redis'], stars: 890, color: 'from-blue-500/20 to-indigo-500/10' },
  { name: 'APIForge', desc: 'CLI tool to scaffold REST and GraphQL APIs with authentication and database setup.', tech: ['Python', 'Click', 'Docker'], stars: 2100, color: 'from-purple-500/20 to-pink-500/10' },
  { name: 'CloudDeploy', desc: 'One-click deployment platform for containerized apps with auto-scaling and monitoring.', tech: ['Go', 'Kubernetes', 'AWS'], stars: 560, color: 'from-orange-500/20 to-primary-500/10' },
];
document.getElementById('projectGrid').innerHTML = projects.map(p => \`
  <div class="project-card">
    <div class="h-32 bg-gradient-to-br \${p.color} flex items-center justify-center">
      <span class="text-3xl font-bold text-white/30">\${p.name}</span>
    </div>
    <div class="p-5">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-bold">\${p.name}</h3>
        <span class="text-xs text-yellow-400">⭐ \${p.stars}</span>
      </div>
      <p class="text-sm text-canvas-muted mb-3">\${p.desc}</p>
      <div class="flex flex-wrap gap-2">
        \${p.tech.map(t => \`<span class="px-2 py-1 bg-gray-800 text-canvas-muted text-xs rounded">\${t}</span>\`).join('')}
      </div>
      <div class="flex gap-3 mt-4">
        <a href="#" class="text-xs text-green-400 hover:underline">GitHub →</a>
        <a href="#" class="text-xs text-blue-400 hover:underline">Live Demo →</a>
      </div>
    </div>
  </div>
\`).join('');

// Contact form
document.getElementById('contactForm').addEventListener('submit', e => {
  e.preventDefault();
  document.getElementById('msgSent').classList.remove('hidden');
  e.target.reset();
});
`,
      },
    ],
  },

  // 17. Photography Portfolio
  {
    name: 'Photography Portfolio',
    icon: '📷',
    category: 'portfolio',
    description: 'Minimal photography portfolio with masonry gallery, lightbox viewer, and category filters.',
    prompt: 'Build a minimal photography portfolio with a masonry-style gallery, lightbox photo viewer with navigation, category filters, and an about the photographer section.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lens & Light — Photography</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-950 text-gray-100 font-sans min-h-screen">
  <nav class="border-b border-gray-800 px-6 py-4 sticky top-0 bg-gray-950/90 backdrop-blur z-40">
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <span class="text-xl font-bold tracking-widest">📷 LENS & LIGHT</span>
      <div class="flex gap-6 text-sm text-canvas-muted">
        <a href="#gallery" class="hover:text-white">Gallery</a>
        <a href="#about" class="hover:text-white">About</a>
        <a href="#" class="hover:text-white">Book a Session</a>
      </div>
    </div>
  </nav>

  <!-- Hero -->
  <section class="py-24 px-6 text-center">
    <p class="text-canvas-muted-deep uppercase text-xs tracking-widest mb-3">Professional Photography</p>
    <h1 class="text-4xl md:text-5xl font-bold mb-4">Capturing Moments<br/>That Last Forever</h1>
    <p class="text-canvas-muted max-w-md mx-auto mb-8">Wedding, portrait, landscape, and editorial photography based in San Francisco.</p>
    <div class="flex justify-center gap-3">
      <button class="px-6 py-3 bg-white text-gray-900 rounded-full font-medium hover:bg-gray-200 transition text-sm">View Portfolio</button>
      <button class="px-6 py-3 border border-gray-600 rounded-full font-medium hover:bg-white/5 transition text-sm">Contact</button>
    </div>
  </section>

  <!-- Filters -->
  <section class="max-w-6xl mx-auto px-6 mb-8">
    <div class="flex justify-center gap-2" id="filters"></div>
  </section>

  <!-- Gallery -->
  <section id="gallery" class="max-w-6xl mx-auto px-6 pb-16">
    <div id="masonry" class="columns-2 md:columns-3 gap-4 space-y-4"></div>
  </section>

  <!-- About -->
  <section id="about" class="py-16 px-6 border-t border-gray-800">
    <div class="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-10">
      <div class="w-40 h-40 bg-gray-800 rounded-full flex items-center justify-center text-6xl shrink-0">📷</div>
      <div>
        <h2 class="text-2xl font-bold mb-3">About the Artist</h2>
        <p class="text-canvas-muted mb-3">Hi, I'm Sofia Chen. For the past decade, I've traveled the world capturing the beauty in everyday moments and extraordinary events alike.</p>
        <p class="text-canvas-muted">My work has been featured in National Geographic, Vogue, and The New York Times. Available for commissions worldwide.</p>
      </div>
    </div>
  </section>

  <!-- Lightbox -->
  <div id="lightbox" class="fixed inset-0 z-50 bg-black/95 items-center justify-center hidden">
    <button id="lbClose" class="absolute top-6 right-6 text-white text-3xl hover:text-canvas-muted">&times;</button>
    <button id="lbPrev" class="absolute left-6 top-1/2 -translate-y-1/2 text-white text-3xl hover:text-canvas-muted">&larr;</button>
    <button id="lbNext" class="absolute right-6 top-1/2 -translate-y-1/2 text-white text-3xl hover:text-canvas-muted">&rarr;</button>
    <div class="text-center">
      <div id="lbImg" class="w-80 h-80 md:w-96 md:h-96 rounded-2xl mx-auto flex items-center justify-center text-9xl"></div>
      <p id="lbCaption" class="text-canvas-muted mt-4 text-sm"></p>
    </div>
  </div>

  <footer class="border-t border-gray-800 py-6 text-center text-sm text-canvas-muted-deep">&copy; 2025 Lens & Light Photography. All rights reserved.</footer>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.filter-btn { padding: 6px 16px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; border: 1px solid #374151; background: transparent; color: #9ca3af; cursor: pointer; transition: all 0.2s; }
.filter-btn:hover { border-color: #d1d5db; color: white; }
.filter-btn.active { background: white; color: #111; border-color: white; }

.photo-item { break-inside: avoid; cursor: pointer; transition: all 0.3s; border-radius: 12px; overflow: hidden; }
.photo-item:hover { transform: scale(1.02); box-shadow: 0 8px 30px rgba(0,0,0,0.4); }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const photos = [
  { cat: 'landscape', img: '🏔️', caption: 'Mountain Dawn — Yosemite', h: 'h-64' },
  { cat: 'portrait', img: '👩', caption: 'Studio Portrait — Natural Light', h: 'h-48' },
  { cat: 'wedding', img: '💒', caption: 'Garden Wedding — Napa Valley', h: 'h-56' },
  { cat: 'landscape', img: '🌊', caption: 'Pacific Coast — Big Sur', h: 'h-48' },
  { cat: 'editorial', img: '📰', caption: 'Editorial — Vogue SS25', h: 'h-64' },
  { cat: 'portrait', img: '👨', caption: 'Corporate Headshot', h: 'h-40' },
  { cat: 'wedding', img: '💍', caption: 'Ring Detail — Close Up', h: 'h-48' },
  { cat: 'landscape', img: '🌅', caption: 'Sunset — Golden Gate', h: 'h-56' },
  { cat: 'editorial', img: '🏙️', caption: 'Urban — Downtown SF', h: 'h-48' },
  { cat: 'portrait', img: '👶', caption: 'Newborn Session', h: 'h-56' },
  { cat: 'wedding', img: '🎂', caption: 'Wedding Cake — Details', h: 'h-40' },
  { cat: 'landscape', img: '🌲', caption: 'Redwood Forest — Muir Woods', h: 'h-64' },
];

const cats = ['all', 'landscape', 'portrait', 'wedding', 'editorial'];
let active = 'all', lbIdx = 0, filtered = [...photos];

const filtersEl = document.getElementById('filters');
filtersEl.innerHTML = cats.map(c => \`<button class="filter-btn \${c === 'all' ? 'active' : ''}" data-cat="\${c}">\${c.charAt(0).toUpperCase() + c.slice(1)}</button>\`).join('');

function render() {
  filtered = active === 'all' ? [...photos] : photos.filter(p => p.cat === active);
  document.getElementById('masonry').innerHTML = filtered.map((p, i) => \`
    <div class="photo-item" data-idx="\${i}">
      <div class="\${p.h} bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-5xl">\${p.img}</div>
      <div class="p-3 bg-gray-900">
        <p class="text-xs text-canvas-muted">\${p.caption}</p>
      </div>
    </div>
  \`).join('');
}

filtersEl.addEventListener('click', e => {
  if (!e.target.classList.contains('filter-btn')) return;
  filtersEl.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  e.target.classList.add('active');
  active = e.target.dataset.cat;
  render();
});

// Lightbox
const lb = document.getElementById('lightbox');
function showLb(idx) {
  lbIdx = idx;
  const p = filtered[idx];
  document.getElementById('lbImg').textContent = p.img;
  document.getElementById('lbCaption').textContent = p.caption;
  lb.classList.remove('hidden'); lb.style.display = 'flex';
}
function closeLb() { lb.classList.add('hidden'); lb.style.display = ''; }

document.getElementById('masonry').addEventListener('click', e => {
  const item = e.target.closest('.photo-item');
  if (item) showLb(Number(item.dataset.idx));
});
document.getElementById('lbClose').addEventListener('click', closeLb);
lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
document.getElementById('lbPrev').addEventListener('click', () => showLb((lbIdx - 1 + filtered.length) % filtered.length));
document.getElementById('lbNext').addEventListener('click', () => showLb((lbIdx + 1) % filtered.length));
document.addEventListener('keydown', e => {
  if (lb.classList.contains('hidden')) return;
  if (e.key === 'Escape') closeLb();
  if (e.key === 'ArrowLeft') showLb((lbIdx - 1 + filtered.length) % filtered.length);
  if (e.key === 'ArrowRight') showLb((lbIdx + 1) % filtered.length);
});

render();
`,
      },
    ],
  },

  // 18. Designer Portfolio
  {
    name: 'Designer Portfolio',
    icon: '🎨',
    category: 'portfolio',
    description: 'Creative designer portfolio with case study cards, skill bars, client logos, and process timeline.',
    prompt: 'Build a creative designer portfolio with a bold hero, case study project cards, animated skill progress bars, client logo marquee, and design process timeline.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Maya Chen — Designer</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-white font-sans text-gray-900">
  <nav class="border-b px-6 py-4 sticky top-0 bg-white/90 backdrop-blur z-40">
    <div class="max-w-5xl mx-auto flex items-center justify-between">
      <span class="text-xl font-bold">Maya Chen</span>
      <div class="flex gap-6 text-sm text-canvas-muted-deep">
        <a href="#work" class="hover:text-black">Work</a>
        <a href="#skills" class="hover:text-black">Skills</a>
        <a href="#process" class="hover:text-black">Process</a>
      </div>
    </div>
  </nav>

  <!-- Hero -->
  <section class="py-24 px-6">
    <div class="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12">
      <div class="flex-1">
        <p class="text-sm text-pink-500 font-bold uppercase tracking-widest mb-2">UI/UX Designer</p>
        <h1 class="text-4xl md:text-5xl font-bold leading-tight mb-4">I design digital<br/>experiences that<br/><span class="text-pink-500">people love</span></h1>
        <p class="text-canvas-muted-deep mb-6">8 years of crafting intuitive interfaces for startups and Fortune 500 companies.</p>
        <div class="flex gap-3">
          <button class="px-6 py-3 bg-pink-500 text-white rounded-full font-medium hover:bg-pink-600 transition">View Work</button>
          <button class="px-6 py-3 border-2 border-gray-200 rounded-full font-medium hover:bg-gray-50 transition">Download CV</button>
        </div>
      </div>
      <div class="w-64 h-64 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center text-8xl">👩‍🎨</div>
    </div>
  </section>

  <!-- Case Studies -->
  <section id="work" class="py-16 px-6 bg-gray-50">
    <div class="max-w-5xl mx-auto">
      <h2 class="text-2xl font-bold text-center mb-2">Selected Work</h2>
      <p class="text-canvas-muted text-center mb-10">Recent case studies and design projects</p>
      <div id="cases" class="grid md:grid-cols-2 gap-8"></div>
    </div>
  </section>

  <!-- Skills -->
  <section id="skills" class="py-16 px-6">
    <div class="max-w-3xl mx-auto">
      <h2 class="text-2xl font-bold text-center mb-8">Skills & Expertise</h2>
      <div id="skillBars" class="space-y-5"></div>
    </div>
  </section>

  <!-- Client Logos Marquee -->
  <section class="py-12 px-6 bg-gray-50 overflow-hidden">
    <p class="text-center text-xs text-canvas-muted uppercase tracking-widest mb-6">Trusted by leading brands</p>
    <div class="marquee"><div class="marquee-inner" id="logos"></div></div>
  </section>

  <!-- Process -->
  <section id="process" class="py-16 px-6">
    <div class="max-w-4xl mx-auto">
      <h2 class="text-2xl font-bold text-center mb-10">My Design Process</h2>
      <div id="timeline" class="space-y-0"></div>
    </div>
  </section>

  <footer class="border-t py-6 text-center text-sm text-canvas-muted">&copy; 2025 Maya Chen. Let's create something amazing.</footer>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.case-card { border-radius: 16px; overflow: hidden; transition: all 0.3s; cursor: pointer; }
.case-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0,0,0,0.08); }

.skill-bar { height: 10px; border-radius: 999px; background: #f3f4f6; overflow: hidden; }
.skill-fill { height: 100%; border-radius: 999px; width: 0; transition: width 1.2s ease; }

.marquee { position: relative; }
.marquee-inner { display: flex; gap: 40px; animation: scroll 20s linear infinite; white-space: nowrap; }
@keyframes scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }

.timeline-step { display: flex; gap: 24px; padding: 24px 0; }
.timeline-dot { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `// Case studies
const cases = [
  { name: 'FinanceApp Redesign', client: 'PayFlow', desc: 'Redesigned the mobile banking experience, increasing user engagement by 40%.', color: 'from-pink-500 to-primary-400', tags: ['Mobile','UI/UX','Fintech'] },
  { name: 'E-commerce Platform', client: 'ShopWave', desc: 'Built a conversion-optimized shopping experience with 25% higher checkout rates.', color: 'from-blue-500 to-indigo-400', tags: ['Web','E-commerce','UX Research'] },
  { name: 'Health Dashboard', client: 'MedTrack', desc: 'Designed an intuitive health monitoring dashboard for patients and doctors.', color: 'from-green-500 to-emerald-400', tags: ['Dashboard','Healthcare','Data Viz'] },
  { name: 'Brand Identity', client: 'NovaTech', desc: 'Complete brand identity system including logo, colors, typography, and guidelines.', color: 'from-purple-500 to-violet-400', tags: ['Branding','Identity','Print'] },
];
document.getElementById('cases').innerHTML = cases.map(c => \`
  <div class="case-card bg-white border border-gray-100">
    <div class="h-48 bg-gradient-to-br \${c.color} flex items-center justify-center">
      <span class="text-white/30 text-3xl font-bold">\${c.name}</span>
    </div>
    <div class="p-6">
      <span class="text-xs text-canvas-muted">\${c.client}</span>
      <h3 class="font-bold text-lg mt-1 mb-2">\${c.name}</h3>
      <p class="text-sm text-canvas-muted-deep mb-3">\${c.desc}</p>
      <div class="flex gap-2">\${c.tags.map(t => \`<span class="px-2 py-1 bg-gray-100 text-canvas-muted-deep text-xs rounded-full">\${t}</span>\`).join('')}</div>
    </div>
  </div>
\`).join('');

// Skills
const skills = [
  { name: 'UI Design', pct: 95, color: '#ec4899' },
  { name: 'UX Research', pct: 88, color: '#8b5cf6' },
  { name: 'Prototyping', pct: 92, color: '#3b82f6' },
  { name: 'Design Systems', pct: 85, color: '#10b981' },
  { name: 'Motion Design', pct: 78, color: '#f59e0b' },
];
const skillBars = document.getElementById('skillBars');
skillBars.innerHTML = skills.map(s => \`
  <div>
    <div class="flex justify-between text-sm mb-1"><span class="font-medium">\${s.name}</span><span class="text-canvas-muted">\${s.pct}%</span></div>
    <div class="skill-bar"><div class="skill-fill" data-pct="\${s.pct}" style="background:\${s.color}"></div></div>
  </div>
\`).join('');

const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { document.querySelectorAll('.skill-fill').forEach(b => b.style.width = b.dataset.pct + '%'); } });
}, { threshold: 0.3 });
observer.observe(skillBars);

// Logos marquee
const logos = ['Google', 'Apple', 'Spotify', 'Airbnb', 'Stripe', 'Figma', 'Notion', 'Slack'];
const logosHtml = logos.map(l => \`<span class="text-canvas-text text-lg font-bold">\${l}</span>\`).join('');
document.getElementById('logos').innerHTML = logosHtml + logosHtml;

// Timeline
const steps = [
  { num: '01', title: 'Discover', desc: 'Research, interviews, and competitive analysis to understand the problem.', color: 'bg-pink-100 text-pink-600' },
  { num: '02', title: 'Define', desc: 'Synthesize research into user personas, journey maps, and design requirements.', color: 'bg-blue-100 text-blue-600' },
  { num: '03', title: 'Design', desc: 'Wireframes, prototypes, and high-fidelity mockups with design system.', color: 'bg-purple-100 text-purple-600' },
  { num: '04', title: 'Deliver', desc: 'User testing, iteration, developer handoff, and launch support.', color: 'bg-green-100 text-green-600' },
];
document.getElementById('timeline').innerHTML = steps.map(s => \`
  <div class="timeline-step">
    <div class="timeline-dot \${s.color} font-bold text-sm">\${s.num}</div>
    <div><h3 class="font-bold mb-1">\${s.title}</h3><p class="text-sm text-canvas-muted-deep">\${s.desc}</p></div>
  </div>
\`).join('');
`,
      },
    ],
  },

  // 19. Resume / CV
  {
    name: 'Resume / CV',
    icon: '📄',
    category: 'portfolio',
    description: 'Clean printable resume with header, experience timeline, education, skills, and download button.',
    prompt: 'Create a clean, professional resume/CV page with a header with photo and summary, work experience timeline, education section, skills grid, and a print/download button.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Resume — Jordan Hayes</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-100 font-sans text-gray-800">
  <div class="max-w-3xl mx-auto my-8 bg-white rounded-2xl shadow-sm overflow-hidden print-container">
    <!-- Header -->
    <div class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 flex flex-col md:flex-row items-center gap-6">
      <div class="w-28 h-28 bg-white/20 rounded-full flex items-center justify-center text-5xl shrink-0">👤</div>
      <div>
        <h1 class="text-3xl font-bold mb-1">Jordan Hayes</h1>
        <p class="text-blue-200 font-medium mb-2">Senior Software Engineer</p>
        <div class="flex flex-wrap gap-4 text-sm text-blue-100">
          <span>📧 jordan@email.com</span>
          <span>📱 (555) 123-4567</span>
          <span>📍 San Francisco, CA</span>
          <span>🔗 linkedin.com/in/jordan</span>
        </div>
      </div>
    </div>

    <div class="p-8">
      <!-- Summary -->
      <section class="mb-8">
        <h2 class="section-title">Professional Summary</h2>
        <p class="text-gray-600 text-sm leading-relaxed">Results-driven software engineer with 7+ years of experience building high-performance web applications. Expert in React, Node.js, and cloud architecture. Led teams of 5-12 engineers, delivering products used by 2M+ users. Passionate about developer experience and scalable systems.</p>
      </section>

      <!-- Experience -->
      <section class="mb-8">
        <h2 class="section-title">Work Experience</h2>
        <div id="experience" class="space-y-6"></div>
      </section>

      <!-- Education -->
      <section class="mb-8">
        <h2 class="section-title">Education</h2>
        <div id="education" class="space-y-4"></div>
      </section>

      <!-- Skills -->
      <section class="mb-8">
        <h2 class="section-title">Skills</h2>
        <div id="skillsGrid" class="flex flex-wrap gap-2"></div>
      </section>

      <!-- Print Button -->
      <div class="text-center no-print">
        <button id="printBtn" class="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition">📄 Download / Print CV</button>
      </div>
    </div>
  </div>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.section-title { font-size: 1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #3b82f6; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #eff6ff; }

.exp-item { position: relative; padding-left: 24px; }
.exp-item::before { content: ''; position: absolute; left: 4px; top: 8px; width: 10px; height: 10px; background: #3b82f6; border-radius: 50%; }
.exp-item::after { content: ''; position: absolute; left: 8px; top: 22px; bottom: -20px; width: 2px; background: #eff6ff; }
.exp-item:last-child::after { display: none; }

@media print {
  body { background: white; }
  .print-container { box-shadow: none; margin: 0; border-radius: 0; }
  .no-print { display: none !important; }
}
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const experience = [
  { role: 'Senior Software Engineer', company: 'TechCorp', period: '2022 — Present', bullets: ['Led migration of monolith to microservices, reducing deploy time by 60%', 'Architected real-time data pipeline processing 1M+ events/day', 'Mentored 4 junior engineers and established code review practices'] },
  { role: 'Software Engineer', company: 'StartupXYZ', period: '2019 — 2022', bullets: ['Built customer-facing dashboard used by 500K+ users', 'Implemented CI/CD pipeline reducing release cycle from 2 weeks to 2 days', 'Designed and shipped GraphQL API serving 100+ frontend components'] },
  { role: 'Junior Developer', company: 'WebAgency', period: '2017 — 2019', bullets: ['Developed responsive web applications for 20+ client projects', 'Created reusable component library adopted across the organization', 'Reduced page load times by 40% through performance optimization'] },
];

const education = [
  { degree: 'M.S. Computer Science', school: 'Stanford University', year: '2017', extra: 'Focus: Distributed Systems. GPA: 3.9/4.0' },
  { degree: 'B.S. Computer Science', school: 'UC Berkeley', year: '2015', extra: 'Dean\\'s List. Minor in Mathematics' },
];

const skills = [
  { name: 'React', level: 'expert' },
  { name: 'TypeScript', level: 'expert' },
  { name: 'Node.js', level: 'expert' },
  { name: 'Python', level: 'advanced' },
  { name: 'PostgreSQL', level: 'advanced' },
  { name: 'AWS', level: 'advanced' },
  { name: 'Docker', level: 'advanced' },
  { name: 'GraphQL', level: 'intermediate' },
  { name: 'Kubernetes', level: 'intermediate' },
  { name: 'Redis', level: 'intermediate' },
  { name: 'CI/CD', level: 'advanced' },
  { name: 'System Design', level: 'expert' },
];

const levelColors = { expert: 'bg-blue-100 text-blue-700', advanced: 'bg-green-100 text-green-700', intermediate: 'bg-yellow-100 text-yellow-700' };

document.getElementById('experience').innerHTML = experience.map(e => \`
  <div class="exp-item">
    <div class="flex items-baseline justify-between mb-1">
      <h3 class="font-bold text-sm">\${e.role}</h3>
      <span class="text-xs text-canvas-muted shrink-0 ml-3">\${e.period}</span>
    </div>
    <p class="text-xs text-blue-600 font-medium mb-2">\${e.company}</p>
    <ul class="space-y-1">\${e.bullets.map(b => \`<li class="text-sm text-gray-600 flex gap-2"><span class="text-blue-400 shrink-0">▸</span>\${b}</li>\`).join('')}</ul>
  </div>
\`).join('');

document.getElementById('education').innerHTML = education.map(e => \`
  <div class="flex items-start gap-3">
    <div class="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-lg shrink-0">🎓</div>
    <div>
      <h3 class="font-bold text-sm">\${e.degree}</h3>
      <p class="text-xs text-canvas-muted-deep">\${e.school} · \${e.year}</p>
      <p class="text-xs text-canvas-muted mt-1">\${e.extra}</p>
    </div>
  </div>
\`).join('');

document.getElementById('skillsGrid').innerHTML = skills.map(s => \`
  <span class="px-3 py-1 rounded-full text-xs font-medium \${levelColors[s.level]}">\${s.name}</span>
\`).join('');

document.getElementById('printBtn').addEventListener('click', () => window.print());
`,
      },
    ],
  },

  // 20. Creative Agency
  {
    name: 'Creative Agency',
    icon: '🏢',
    category: 'portfolio',
    description: 'Bold agency landing page with video hero, service cards, team grid, stats counter, and CTA section.',
    prompt: 'Create a creative agency landing page with bold hero, animated stats counter, services grid, team member cards, client testimonials, and a CTA contact section.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pixel & Pulse — Creative Agency</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-white font-sans text-gray-900">
  <nav class="border-b px-6 py-4 sticky top-0 bg-white/90 backdrop-blur z-40">
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <span class="text-xl font-bold">⚡ Pixel & Pulse</span>
      <div class="flex gap-6 text-sm text-canvas-muted-deep">
        <a href="#services" class="hover:text-black">Services</a>
        <a href="#team" class="hover:text-black">Team</a>
        <a href="#contact" class="hover:text-black">Contact</a>
      </div>
      <button class="px-4 py-2 bg-black text-white text-sm rounded-full font-medium hover:bg-gray-800">Get in Touch</button>
    </div>
  </nav>

  <!-- Hero -->
  <section class="bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-white py-28 px-6 text-center">
    <p class="text-violet-200 uppercase text-xs tracking-widest font-bold mb-3">Award-Winning Agency</p>
    <h1 class="text-4xl md:text-6xl font-bold mb-4">We Build Brands<br/>That Move People</h1>
    <p class="text-violet-100 max-w-lg mx-auto mb-8">Strategy, design, and technology to transform your business and captivate your audience.</p>
    <div class="flex justify-center gap-3">
      <button class="px-8 py-3 bg-white text-purple-700 rounded-full font-bold hover:bg-violet-50 transition">Our Work</button>
      <button class="px-8 py-3 border-2 border-canvas-border rounded-full font-medium hover:bg-white/10 transition">Watch Reel</button>
    </div>
  </section>

  <!-- Stats -->
  <section class="py-12 px-6 bg-gray-50">
    <div class="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center" id="stats"></div>
  </section>

  <!-- Services -->
  <section id="services" class="py-16 px-6">
    <div class="max-w-5xl mx-auto">
      <h2 class="text-2xl font-bold text-center mb-2">What We Do</h2>
      <p class="text-canvas-muted text-center mb-10">End-to-end creative services</p>
      <div id="serviceGrid" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"></div>
    </div>
  </section>

  <!-- Team -->
  <section id="team" class="py-16 px-6 bg-gray-50">
    <div class="max-w-5xl mx-auto">
      <h2 class="text-2xl font-bold text-center mb-2">Meet the Team</h2>
      <p class="text-canvas-muted text-center mb-10">The creative minds behind the magic</p>
      <div id="teamGrid" class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"></div>
    </div>
  </section>

  <!-- Testimonials -->
  <section class="py-16 px-6">
    <div class="max-w-4xl mx-auto">
      <h2 class="text-2xl font-bold text-center mb-10">What Clients Say</h2>
      <div id="testimonials" class="grid md:grid-cols-2 gap-6"></div>
    </div>
  </section>

  <!-- CTA -->
  <section id="contact" class="py-20 px-6 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-center">
    <h2 class="text-3xl md:text-4xl font-bold mb-4">Ready to Start Your Project?</h2>
    <p class="text-violet-100 max-w-md mx-auto mb-8">Let's create something extraordinary together. Get a free consultation.</p>
    <button class="px-10 py-4 bg-white text-purple-700 rounded-full font-bold text-lg hover:bg-violet-50 transition">Let's Talk →</button>
  </section>

  <footer class="bg-gray-900 text-canvas-muted py-8 text-center text-sm">&copy; 2025 Pixel & Pulse. All rights reserved.</footer>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.service-card { background: white; border: 1px solid #f3f4f6; border-radius: 16px; padding: 24px; transition: all 0.3s; }
.service-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.06); border-color: #e5e7eb; }

.team-card { text-align: center; transition: all 0.3s; }
.team-card:hover { transform: translateY(-3px); }

.testimonial-card { background: #f9fafb; border-radius: 16px; padding: 24px; border: 1px solid #f3f4f6; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `// Stats counter
const statsData = [
  { label: 'Projects Delivered', target: 320, suffix: '+' },
  { label: 'Happy Clients', target: 150, suffix: '+' },
  { label: 'Team Members', target: 28, suffix: '' },
  { label: 'Awards Won', target: 45, suffix: '' },
];
const statsEl = document.getElementById('stats');
statsEl.innerHTML = statsData.map((s, i) => \`
  <div><span class="text-3xl md:text-4xl font-bold text-purple-600" id="stat\${i}">0</span><span class="text-3xl font-bold text-purple-600">\${s.suffix}</span><p class="text-sm text-canvas-muted-deep mt-1">\${s.label}</p></div>
\`).join('');

const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      statsData.forEach((s, i) => {
        let current = 0;
        const step = Math.ceil(s.target / 50);
        const interval = setInterval(() => {
          current += step;
          if (current >= s.target) { current = s.target; clearInterval(interval); }
          document.getElementById('stat' + i).textContent = current;
        }, 30);
      });
      observer.unobserve(statsEl);
    }
  });
}, { threshold: 0.5 });
observer.observe(statsEl);

// Services
const services = [
  { icon: '🎨', title: 'Brand Identity', desc: 'Logo, visual identity, and brand guidelines that tell your story.' },
  { icon: '📱', title: 'UI/UX Design', desc: 'User-centered interfaces that are beautiful and intuitive.' },
  { icon: '💻', title: 'Web Development', desc: 'Fast, responsive, and scalable web applications.' },
  { icon: '📈', title: 'Digital Marketing', desc: 'SEO, Social, and paid campaigns that drive results.' },
  { icon: '🎬', title: 'Motion & Video', desc: 'Compelling video content and motion graphics.' },
  { icon: '📊', title: 'Analytics & Strategy', desc: 'Data-driven insights to optimize your business.' },
];
document.getElementById('serviceGrid').innerHTML = services.map(s => \`
  <div class="service-card">
    <span class="text-3xl block mb-3">\${s.icon}</span>
    <h3 class="font-bold mb-2">\${s.title}</h3>
    <p class="text-sm text-canvas-muted-deep">\${s.desc}</p>
  </div>
\`).join('');

// Team
const team = [
  { name: 'Sarah Kim', role: 'Creative Director', img: '👩‍🎨' },
  { name: 'Marcus Lee', role: 'Lead Developer', img: '👨‍💻' },
  { name: 'Emma Rose', role: 'UX Strategist', img: '👩‍💼' },
  { name: 'David Chen', role: 'Motion Designer', img: '🧑‍🎤' },
];
document.getElementById('teamGrid').innerHTML = team.map(t => \`
  <div class="team-card">
    <div class="w-24 h-24 bg-purple-50 rounded-full mx-auto flex items-center justify-center text-4xl mb-3">\${t.img}</div>
    <h3 class="font-bold text-sm">\${t.name}</h3>
    <p class="text-xs text-canvas-muted">\${t.role}</p>
  </div>
\`).join('');

// Testimonials
const testimonials = [
  { text: 'Pixel & Pulse transformed our brand completely. The results exceeded all expectations.', name: 'Lisa Wang', company: 'TechFlow' },
  { text: 'Incredible team to work with. They delivered on time, on budget, and above quality.', name: 'Tom Richards', company: 'StartupHub' },
];
document.getElementById('testimonials').innerHTML = testimonials.map(t => \`
  <div class="testimonial-card">
    <p class="text-gray-600 text-sm mb-4 italic">"\${t.text}"</p>
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-sm font-bold text-purple-600">\${t.name[0]}</div>
      <div><span class="font-bold text-sm block">\${t.name}</span><span class="text-xs text-canvas-muted">\${t.company}</span></div>
    </div>
  </div>
\`).join('');
`,
      },
    ],
  },

  // ─── DASHBOARD ──────────────────────────────────

  // 21. Analytics Dashboard
  {
    name: 'Analytics Dashboard',
    icon: '📊',
    category: 'dashboard',
    description: 'Web analytics dashboard with KPI cards, line/bar charts, top pages table, and date range picker.',
    prompt: 'Build a web analytics dashboard with KPI stat cards, line chart for visitors, bar chart for revenue, top pages table, and a date range picker.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Analytics Dashboard</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-100 font-sans text-gray-800 min-h-screen">
  <div class="flex">
    <!-- Sidebar -->
    <aside class="w-56 bg-white border-r min-h-screen px-4 py-6 hidden lg:block">
      <div class="text-lg font-bold text-blue-600 mb-8 px-2">📊 Analytics</div>
      <nav class="space-y-1">
        <a href="#" class="side-link active">📈 Overview</a>
        <a href="#" class="side-link">👥 Audience</a>
        <a href="#" class="side-link">📄 Pages</a>
        <a href="#" class="side-link">🔗 Referrals</a>
        <a href="#" class="side-link">⚙️ Settings</a>
      </nav>
    </aside>

    <!-- Main -->
    <main class="flex-1 p-6 md:p-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold">Dashboard Overview</h1>
          <p class="text-sm text-canvas-muted">Welcome back! Here's your traffic summary.</p>
        </div>
        <select id="dateRange" class="text-sm px-4 py-2 border rounded-lg outline-none bg-white">
          <option>Last 7 days</option>
          <option selected>Last 30 days</option>
          <option>Last 90 days</option>
          <option>This year</option>
        </select>
      </div>

      <!-- KPI Cards -->
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" id="kpiCards"></div>

      <!-- Charts -->
      <div class="grid lg:grid-cols-2 gap-6 mb-8">
        <div class="bg-white rounded-xl p-6 border border-gray-100">
          <h3 class="font-bold mb-4">Visitors</h3>
          <canvas id="lineChart" height="200"></canvas>
        </div>
        <div class="bg-white rounded-xl p-6 border border-gray-100">
          <h3 class="font-bold mb-4">Revenue</h3>
          <canvas id="barChart" height="200"></canvas>
        </div>
      </div>

      <!-- Top Pages -->
      <div class="bg-white rounded-xl p-6 border border-gray-100">
        <h3 class="font-bold mb-4">Top Pages</h3>
        <table class="w-full text-sm">
          <thead><tr class="text-left text-canvas-muted border-b"><th class="pb-3">Page</th><th class="pb-3">Views</th><th class="pb-3">Unique</th><th class="pb-3">Bounce</th><th class="pb-3">Avg Time</th></tr></thead>
          <tbody id="pagesTable"></tbody>
        </table>
      </div>
    </main>
  </div>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.side-link { display: block; padding: 10px 12px; border-radius: 8px; font-size: 0.875rem; color: #6b7280; transition: all 0.15s; text-decoration: none; }
.side-link:hover { background: #f3f4f6; color: #111827; }
.side-link.active { background: #eff6ff; color: #2563eb; font-weight: 600; }

.kpi-card { background: white; border: 1px solid #f3f4f6; border-radius: 12px; padding: 20px; transition: all 0.2s; }
.kpi-card:hover { box-shadow: 0 4px 15px rgba(0,0,0,0.04); }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `// KPI Cards
const kpis = [
  { label: 'Total Visitors', value: '48,290', change: '+12.5%', up: true, icon: '👥' },
  { label: 'Page Views', value: '125,430', change: '+8.2%', up: true, icon: '📄' },
  { label: 'Bounce Rate', value: '34.2%', change: '-3.1%', up: true, icon: '📉' },
  { label: 'Revenue', value: '$12,840', change: '+18.7%', up: true, icon: '💰' },
];
document.getElementById('kpiCards').innerHTML = kpis.map(k => \`
  <div class="kpi-card">
    <div class="flex items-center justify-between mb-3">
      <span class="text-2xl">\${k.icon}</span>
      <span class="text-xs font-bold \${k.up ? 'text-green-600' : 'text-primary-500'}">\${k.change}</span>
    </div>
    <p class="text-2xl font-bold">\${k.value}</p>
    <p class="text-xs text-canvas-muted mt-1">\${k.label}</p>
  </div>
\`).join('');

// Simple canvas line chart
function drawLine(canvasId, data, color) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth * 2; canvas.height = 400;
  ctx.scale(2, 2);
  const w = canvas.offsetWidth, h = 200, pad = 30;
  const max = Math.max(...data);
  const points = data.map((v, i) => ({ x: pad + (i / (data.length - 1)) * (w - pad * 2), y: pad + (1 - v / max) * (h - pad * 2) }));

  // Grid
  ctx.strokeStyle = '#f3f4f6'; ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) { const y = pad + (i / 4) * (h - pad * 2); ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke(); }

  // Line
  ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  ctx.beginPath();
  points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.stroke();

  // Fill
  ctx.fillStyle = color.replace(')', ', 0.08)').replace('rgb', 'rgba');
  ctx.beginPath(); ctx.moveTo(points[0].x, h - pad);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, h - pad); ctx.closePath(); ctx.fill();

  // Dots
  points.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); });
}

// Bar chart
function drawBars(canvasId, data, color) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth * 2; canvas.height = 400;
  ctx.scale(2, 2);
  const w = canvas.offsetWidth, h = 200, pad = 30;
  const max = Math.max(...data);
  const barW = (w - pad * 2) / data.length * 0.7;
  const gap = (w - pad * 2) / data.length;

  ctx.strokeStyle = '#f3f4f6'; ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) { const y = pad + (i / 4) * (h - pad * 2); ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke(); }

  data.forEach((v, i) => {
    const barH = (v / max) * (h - pad * 2);
    const x = pad + i * gap + (gap - barW) / 2;
    ctx.fillStyle = color; ctx.beginPath();
    const r = 4;
    ctx.moveTo(x + r, h - pad - barH); ctx.arcTo(x + barW, h - pad - barH, x + barW, h - pad, r); ctx.arcTo(x + barW, h - pad, x, h - pad, 0); ctx.arcTo(x, h - pad, x, h - pad - barH, 0); ctx.arcTo(x, h - pad - barH, x + barW, h - pad - barH, r);
    ctx.fill();
  });
}

drawLine('lineChart', [1200, 2100, 1800, 2800, 2400, 3200, 2900, 3600, 3100, 4200, 3800, 4500], 'rgb(59, 130, 246)');
drawBars('barChart', [820, 1200, 980, 1500, 1350, 1800, 1600, 2100, 1900, 2400, 2200, 2800], 'rgb(16, 185, 129)');

// Top Pages
const pages = [
  { page: '/home', views: '32,410', unique: '18,200', bounce: '28%', time: '2m 45s' },
  { page: '/pricing', views: '18,640', unique: '12,100', bounce: '42%', time: '3m 12s' },
  { page: '/blog/top-10-tips', views: '12,350', unique: '9,800', bounce: '35%', time: '4m 30s' },
  { page: '/about', views: '8,920', unique: '6,400', bounce: '48%', time: '1m 55s' },
  { page: '/contact', views: '5,210', unique: '4,100', bounce: '52%', time: '1m 20s' },
];
document.getElementById('pagesTable').innerHTML = pages.map(p => \`
  <tr class="border-b last:border-0"><td class="py-3 font-medium text-blue-600">\${p.page}</td><td class="py-3">\${p.views}</td><td class="py-3">\${p.unique}</td><td class="py-3">\${p.bounce}</td><td class="py-3">\${p.time}</td></tr>
\`).join('');
`,
      },
    ],
  },

  // 22. Project Manager
  {
    name: 'Project Manager',
    icon: '📋',
    category: 'dashboard',
    description: 'Kanban-style project board with drag columns, task cards, progress tracking, and team assignment.',
    prompt: 'Build a project management dashboard with kanban columns (To Do, In Progress, Review, Done), draggable task cards, progress bars, priority labels, and team member avatars.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TaskFlow — Project Manager</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-100 font-sans text-gray-800 min-h-screen">
  <nav class="bg-white border-b px-6 py-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <span class="text-lg font-bold text-blue-600">📋 TaskFlow</span>
        <span class="text-sm text-canvas-muted">/ Website Redesign</span>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex -space-x-2">
          <div class="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-blue-700 border-2 border-white">JH</div>
          <div class="w-8 h-8 bg-pink-200 rounded-full flex items-center justify-center text-xs font-bold text-pink-700 border-2 border-white">SK</div>
          <div class="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center text-xs font-bold text-green-700 border-2 border-white">ML</div>
        </div>
        <button id="addTask" class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700">+ Add Task</button>
      </div>
    </div>
  </nav>

  <!-- Progress Bar -->
  <div class="bg-white border-b px-6 py-3">
    <div class="flex items-center gap-4 text-sm">
      <span class="text-canvas-muted">Progress:</span>
      <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden"><div id="progressBar" class="h-full bg-blue-500 rounded-full transition-all duration-500"></div></div>
      <span id="progressPct" class="font-bold text-blue-600">0%</span>
      <span class="text-canvas-muted" id="taskCount"></span>
    </div>
  </div>

  <!-- Kanban Board -->
  <div class="p-6 overflow-x-auto">
    <div class="flex gap-6 min-w-max" id="board"></div>
  </div>

  <!-- Add Task Modal -->
  <div id="modal" class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center hidden">
    <div class="bg-white rounded-2xl p-6 w-96 mx-4">
      <h3 class="font-bold text-lg mb-4">New Task</h3>
      <input id="taskTitle" type="text" placeholder="Task title" class="w-full px-4 py-2 border rounded-lg text-sm mb-3 outline-none focus:border-blue-400" />
      <select id="taskPriority" class="w-full px-4 py-2 border rounded-lg text-sm mb-3 outline-none">
        <option value="low">Low Priority</option>
        <option value="medium" selected>Medium Priority</option>
        <option value="high">High Priority</option>
      </select>
      <select id="taskAssignee" class="w-full px-4 py-2 border rounded-lg text-sm mb-4 outline-none">
        <option value="JH">Jordan Hayes</option>
        <option value="SK">Sarah Kim</option>
        <option value="ML">Marcus Lee</option>
      </select>
      <div class="flex gap-2">
        <button id="cancelTask" class="flex-1 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
        <button id="saveTask" class="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">Add Task</button>
      </div>
    </div>
  </div>

  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.column { width: 300px; flex-shrink: 0; background: #f9fafb; border-radius: 12px; padding: 16px; }
.column-header { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
.task-card { background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; margin-bottom: 8px; cursor: grab; transition: all 0.15s; }
.task-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
.task-card.dragging { opacity: 0.5; }
.priority-high { border-left: 3px solid #ef4444; }
.priority-medium { border-left: 3px solid #f59e0b; }
.priority-low { border-left: 3px solid #10b981; }
.badge-high { background: #fef2f2; color: #dc2626; }
.badge-medium { background: #fffbeb; color: #d97706; }
.badge-low { background: #ecfdf5; color: #059669; }
.drop-zone { min-height: 60px; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const columns = [
  { id: 'todo', label: 'To Do', color: 'text-canvas-muted-deep' },
  { id: 'progress', label: 'In Progress', color: 'text-blue-500' },
  { id: 'review', label: 'In Review', color: 'text-yellow-500' },
  { id: 'done', label: 'Done', color: 'text-green-500' },
];

let tasks = [
  { id: 1, title: 'Design homepage wireframe', col: 'todo', priority: 'high', assignee: 'SK' },
  { id: 2, title: 'Set up project repo', col: 'done', priority: 'low', assignee: 'ML' },
  { id: 3, title: 'Create color palette', col: 'progress', priority: 'medium', assignee: 'SK' },
  { id: 4, title: 'Write API documentation', col: 'todo', priority: 'medium', assignee: 'JH' },
  { id: 5, title: 'Deploy staging environment', col: 'review', priority: 'high', assignee: 'ML' },
  { id: 6, title: 'Mobile responsive testing', col: 'todo', priority: 'low', assignee: 'JH' },
  { id: 7, title: 'User authentication flow', col: 'progress', priority: 'high', assignee: 'JH' },
  { id: 8, title: 'Logo design concepts', col: 'done', priority: 'medium', assignee: 'SK' },
];

let nextId = 9;
const avatarColors = { JH: 'bg-blue-200 text-blue-700', SK: 'bg-pink-200 text-pink-700', ML: 'bg-green-200 text-green-700' };

function render() {
  const board = document.getElementById('board');
  board.innerHTML = columns.map(col => {
    const colTasks = tasks.filter(t => t.col === col.id);
    return \`
      <div class="column" data-col="\${col.id}">
        <div class="column-header \${col.color}">
          <span>\${col.label} (\${colTasks.length})</span>
        </div>
        <div class="drop-zone" data-col="\${col.id}">
          \${colTasks.map(t => \`
            <div class="task-card priority-\${t.priority}" draggable="true" data-id="\${t.id}">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold px-2 py-0.5 rounded-full badge-\${t.priority}">\${t.priority}</span>
                <div class="w-6 h-6 \${avatarColors[t.assignee]} rounded-full flex items-center justify-center text-xs font-bold">\${t.assignee}</div>
              </div>
              <p class="text-sm font-medium">\${t.title}</p>
            </div>
          \`).join('')}
        </div>
      </div>
    \`;
  }).join('');

  updateProgress();
  setupDrag();
}

function updateProgress() {
  const done = tasks.filter(t => t.col === 'done').length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  document.getElementById('progressBar').style.width = pct + '%';
  document.getElementById('progressPct').textContent = pct + '%';
  document.getElementById('taskCount').textContent = done + '/' + tasks.length + ' tasks';
}

function setupDrag() {
  document.querySelectorAll('.task-card').forEach(card => {
    card.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', card.dataset.id); card.classList.add('dragging'); });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
  });
  document.querySelectorAll('.drop-zone').forEach(zone => {
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.background = '#eff6ff'; });
    zone.addEventListener('dragleave', () => zone.style.background = '');
    zone.addEventListener('drop', e => {
      e.preventDefault(); zone.style.background = '';
      const id = Number(e.dataTransfer.getData('text/plain'));
      const task = tasks.find(t => t.id === id);
      if (task) { task.col = zone.dataset.col; render(); }
    });
  });
}

// Modal
const modal = document.getElementById('modal');
document.getElementById('addTask').addEventListener('click', () => modal.classList.remove('hidden'));
document.getElementById('cancelTask').addEventListener('click', () => modal.classList.add('hidden'));
document.getElementById('saveTask').addEventListener('click', () => {
  const title = document.getElementById('taskTitle').value.trim();
  if (!title) return;
  tasks.push({ id: nextId++, title, col: 'todo', priority: document.getElementById('taskPriority').value, assignee: document.getElementById('taskAssignee').value });
  document.getElementById('taskTitle').value = '';
  modal.classList.add('hidden');
  render();
});

render();
`,
      },
    ],
  },

  // 23. Finance Dashboard
  {
    name: 'Finance Dashboard',
    icon: '💰',
    category: 'dashboard',
    description: 'Financial overview with income/expense charts, transaction history, budget tracking, and savings goals.',
    prompt: 'Build a personal finance dashboard with income vs expense comparison, transaction history table, budget category donut chart, and savings goal trackers.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FinView — Finance Dashboard</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-50 font-sans text-gray-800 min-h-screen">
  <div class="flex">
    <!-- Sidebar -->
    <aside class="w-56 bg-white min-h-screen border-r px-4 py-6">
      <h1 class="text-lg font-bold text-green-600 mb-8">💰 FinView</h1>
      <nav class="space-y-1">
        <a class="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-green-50 text-green-700 rounded-lg">📊 Overview</a>
        <a class="flex items-center gap-2 px-3 py-2 text-sm text-canvas-muted-deep hover:bg-gray-50 rounded-lg cursor-pointer">💳 Transactions</a>
        <a class="flex items-center gap-2 px-3 py-2 text-sm text-canvas-muted-deep hover:bg-gray-50 rounded-lg cursor-pointer">📈 Investments</a>
        <a class="flex items-center gap-2 px-3 py-2 text-sm text-canvas-muted-deep hover:bg-gray-50 rounded-lg cursor-pointer">🎯 Goals</a>
        <a class="flex items-center gap-2 px-3 py-2 text-sm text-canvas-muted-deep hover:bg-gray-50 rounded-lg cursor-pointer">⚙️ Settings</a>
      </nav>
    </aside>

    <main class="flex-1 p-6">
      <!-- Summary Cards -->
      <div class="grid grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-xl p-5 border">
          <p class="text-xs text-canvas-muted mb-1">Total Balance</p>
          <p class="text-2xl font-bold text-gray-800">$24,580</p>
          <p class="text-xs text-green-500 mt-1">↑ 12.3% vs last month</p>
        </div>
        <div class="bg-white rounded-xl p-5 border">
          <p class="text-xs text-canvas-muted mb-1">Monthly Income</p>
          <p class="text-2xl font-bold text-green-600">$8,450</p>
          <p class="text-xs text-green-500 mt-1">↑ 5.2%</p>
        </div>
        <div class="bg-white rounded-xl p-5 border">
          <p class="text-xs text-canvas-muted mb-1">Monthly Expenses</p>
          <p class="text-2xl font-bold text-primary-500">$5,230</p>
          <p class="text-xs text-primary-400 mt-1">↑ 3.1%</p>
        </div>
        <div class="bg-white rounded-xl p-5 border">
          <p class="text-xs text-canvas-muted mb-1">Savings Rate</p>
          <p class="text-2xl font-bold text-blue-600">38.1%</p>
          <p class="text-xs text-green-500 mt-1">↑ 2.4%</p>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-6 mb-6">
        <!-- Income vs Expense Chart -->
        <div class="col-span-2 bg-white rounded-xl p-5 border">
          <h3 class="font-bold text-sm mb-4">Income vs Expenses (6 months)</h3>
          <canvas id="incomeChart" height="220"></canvas>
        </div>

        <!-- Budget Donut -->
        <div class="bg-white rounded-xl p-5 border">
          <h3 class="font-bold text-sm mb-4">Budget Breakdown</h3>
          <canvas id="donutChart" width="200" height="200"></canvas>
          <div id="donutLegend" class="mt-4 space-y-2 text-xs"></div>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-6">
        <!-- Transactions -->
        <div class="col-span-2 bg-white rounded-xl p-5 border">
          <h3 class="font-bold text-sm mb-4">Recent Transactions</h3>
          <table class="w-full text-sm">
            <thead><tr class="text-xs text-canvas-muted border-b"><th class="text-left pb-2">Description</th><th class="text-left pb-2">Category</th><th class="text-left pb-2">Date</th><th class="text-right pb-2">Amount</th></tr></thead>
            <tbody id="txTable"></tbody>
          </table>
        </div>

        <!-- Savings Goals -->
        <div class="bg-white rounded-xl p-5 border">
          <h3 class="font-bold text-sm mb-4">Savings Goals</h3>
          <div id="goals" class="space-y-4"></div>
        </div>
      </div>
    </main>
  </div>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `body { overflow-x: hidden; }
canvas { width: 100% !important; }
table tbody tr { border-bottom: 1px solid #f3f4f6; }
table tbody td { padding: 10px 0; }
.goal-bar { height: 8px; border-radius: 999px; background: #e5e7eb; overflow: hidden; }
.goal-fill { height: 100%; border-radius: 999px; transition: width 0.6s ease; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `// Income vs Expense bar chart
const incCanvas = document.getElementById('incomeChart');
const incCtx = incCanvas.getContext('2d');
const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const income =  [7200, 7500, 7800, 8100, 8200, 8450];
const expense = [4800, 5100, 4600, 5300, 5000, 5230];

function drawBarChart() {
  const w = incCanvas.width = incCanvas.parentElement.clientWidth - 40;
  const h = 200;
  incCanvas.height = h;
  const max = 10000;
  const barW = 24;
  const gap = w / months.length;

  incCtx.clearRect(0, 0, w, h);
  // Grid
  for (let i = 0; i <= 4; i++) {
    const y = (i / 4) * (h - 30);
    incCtx.strokeStyle = '#f3f4f6';
    incCtx.beginPath(); incCtx.moveTo(0, y); incCtx.lineTo(w, y); incCtx.stroke();
    incCtx.fillStyle = '#9ca3af'; incCtx.font = '10px sans-serif';
    incCtx.fillText('$' + ((4 - i) * 2500), 0, y + 12);
  }

  months.forEach((m, i) => {
    const x = 40 + i * gap;
    const incH = (income[i] / max) * (h - 40);
    const expH = (expense[i] / max) * (h - 40);
    // Income
    incCtx.fillStyle = '#10b981';
    incCtx.fillRect(x, h - 20 - incH, barW, incH);
    // Expense
    incCtx.fillStyle = '#ef4444';
    incCtx.fillRect(x + barW + 4, h - 20 - expH, barW, expH);
    // Label
    incCtx.fillStyle = '#6b7280'; incCtx.font = '11px sans-serif';
    incCtx.fillText(m, x + 10, h - 4);
  });
}
drawBarChart();

// Budget Donut
const donutCanvas = document.getElementById('donutChart');
const dCtx = donutCanvas.getContext('2d');
const budgetData = [
  { label: 'Housing', value: 1800, color: '#3b82f6' },
  { label: 'Food', value: 900, color: '#10b981' },
  { label: 'Transport', value: 450, color: '#f59e0b' },
  { label: 'Shopping', value: 680, color: '#ef4444' },
  { label: 'Entertainment', value: 400, color: '#8b5cf6' },
  { label: 'Other', value: 1000, color: '#6b7280' },
];

function drawDonut() {
  const size = 180;
  donutCanvas.width = size; donutCanvas.height = size;
  const cx = size / 2, cy = size / 2, r = 70, inner = 45;
  const total = budgetData.reduce((s, d) => s + d.value, 0);
  let angle = -Math.PI / 2;

  budgetData.forEach(d => {
    const slice = (d.value / total) * Math.PI * 2;
    dCtx.beginPath(); dCtx.moveTo(cx, cy);
    dCtx.arc(cx, cy, r, angle, angle + slice);
    dCtx.fillStyle = d.color; dCtx.fill();
    angle += slice;
  });
  // Inner circle
  dCtx.beginPath(); dCtx.arc(cx, cy, inner, 0, Math.PI * 2);
  dCtx.fillStyle = '#fff'; dCtx.fill();
  dCtx.fillStyle = '#1f2937'; dCtx.font = 'bold 16px sans-serif'; dCtx.textAlign = 'center';
  dCtx.fillText('$' + total.toLocaleString(), cx, cy + 6);

  // Legend
  document.getElementById('donutLegend').innerHTML = budgetData.map(d =>
    \`<div class="flex items-center justify-between"><span class="flex items-center gap-2"><span class="w-2 h-2 rounded-full" style="background:\${d.color}"></span>\${d.label}</span><span class="font-bold">$\${d.value}</span></div>\`
  ).join('');
}
drawDonut();

// Transactions
const transactions = [
  { desc: 'Salary Deposit', cat: 'Income', date: 'Dec 1', amount: 8450, type: 'income' },
  { desc: 'Rent Payment', cat: 'Housing', date: 'Dec 2', amount: -1800, type: 'expense' },
  { desc: 'Whole Foods', cat: 'Food', date: 'Dec 3', amount: -156.40, type: 'expense' },
  { desc: 'Uber Rides', cat: 'Transport', date: 'Dec 4', amount: -42.50, type: 'expense' },
  { desc: 'Freelance Project', cat: 'Income', date: 'Dec 5', amount: 1200, type: 'income' },
  { desc: 'Netflix + Spotify', cat: 'Entertainment', date: 'Dec 6', amount: -28.98, type: 'expense' },
  { desc: 'Nike Store', cat: 'Shopping', date: 'Dec 7', amount: -189.00, type: 'expense' },
];

document.getElementById('txTable').innerHTML = transactions.map(t =>
  \`<tr><td class="font-medium">\${t.desc}</td><td class="text-canvas-muted">\${t.cat}</td><td class="text-canvas-muted">\${t.date}</td><td class="text-right font-bold \${t.type === 'income' ? 'text-green-600' : 'text-primary-500'}">\${t.amount > 0 ? '+' : ''}$\${Math.abs(t.amount).toFixed(2)}</td></tr>\`
).join('');

// Savings Goals
const goals = [
  { name: 'Emergency Fund', current: 8500, target: 15000, color: '#3b82f6' },
  { name: 'Vacation', current: 2400, target: 5000, color: '#10b981' },
  { name: 'New Laptop', current: 1100, target: 2000, color: '#8b5cf6' },
  { name: 'Car Down Payment', current: 3200, target: 10000, color: '#f59e0b' },
];

document.getElementById('goals').innerHTML = goals.map(g => {
  const pct = Math.round((g.current / g.target) * 100);
  return \`<div><div class="flex justify-between text-xs mb-1"><span class="font-medium">\${g.name}</span><span class="text-canvas-muted">$\${g.current.toLocaleString()} / $\${g.target.toLocaleString()}</span></div><div class="goal-bar"><div class="goal-fill" style="width:\${pct}%;background:\${g.color}"></div></div></div>\`;
}).join('');
`,
      },
    ],
  },

  // 24. Social Media Dashboard
  {
    name: 'Social Media Dashboard',
    icon: '📱',
    category: 'dashboard',
    description: 'Social analytics with follower growth, engagement metrics, post performance, and platform comparison.',
    prompt: 'Build a social media analytics dashboard with follower growth chart, engagement rate cards, top posts table, and platform comparison bars.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SocialPulse — Analytics</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-900 text-white font-sans min-h-screen">
  <nav class="border-b border-gray-700 px-6 py-4 flex items-center justify-between">
    <h1 class="text-lg font-bold">📱 SocialPulse</h1>
    <div class="flex items-center gap-3">
      <select id="period" class="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm outline-none">
        <option>Last 7 days</option><option selected>Last 30 days</option><option>Last 90 days</option>
      </select>
    </div>
  </nav>

  <main class="p-6 max-w-7xl mx-auto">
    <div class="grid grid-cols-4 gap-4 mb-6" id="platformCards"></div>
    <div class="grid grid-cols-3 gap-6 mb-6">
      <div class="col-span-2 bg-gray-800 rounded-xl p-5 border border-gray-700">
        <h3 class="font-bold text-sm mb-4">Follower Growth</h3>
        <canvas id="growthChart" height="220"></canvas>
      </div>
      <div class="bg-gray-800 rounded-xl p-5 border border-gray-700">
        <h3 class="font-bold text-sm mb-4">Engagement Rate</h3>
        <div id="engageList" class="space-y-4"></div>
      </div>
    </div>
    <div class="grid grid-cols-3 gap-6">
      <div class="col-span-2 bg-gray-800 rounded-xl p-5 border border-gray-700">
        <h3 class="font-bold text-sm mb-4">Top Performing Posts</h3>
        <div id="topPosts" class="space-y-3"></div>
      </div>
      <div class="bg-gray-800 rounded-xl p-5 border border-gray-700">
        <h3 class="font-bold text-sm mb-4">Platform Comparison</h3>
        <div id="comparison" class="space-y-4"></div>
      </div>
    </div>
  </main>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `canvas { width: 100% !important; }
.platform-card { background: #1f2937; border: 1px solid #374151; border-radius: 12px; padding: 20px; }
.compare-bar { height: 8px; border-radius: 999px; background: #374151; overflow: hidden; }
.compare-fill { height: 100%; border-radius: 999px; transition: width 0.6s ease; }
.post-row { background: #111827; border-radius: 10px; padding: 12px 16px; display: flex; align-items: center; gap: 12px; }
.post-row:hover { background: #1a2332; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const platforms = [
  { name: 'Instagram', icon: '📸', followers: '48.2K', growth: '+2.4K', color: '#e1306c', pct: 5.2 },
  { name: 'Twitter', icon: '🐦', followers: '32.1K', growth: '+1.8K', color: '#1da1f2', pct: 5.9 },
  { name: 'YouTube', icon: '🎬', followers: '125K', growth: '+8.3K', color: '#ff0000', pct: 7.1 },
  { name: 'TikTok', icon: '🎵', followers: '89.5K', growth: '+12.1K', color: '#00f2ea', pct: 15.6 },
];

document.getElementById('platformCards').innerHTML = platforms.map(p =>
  \`<div class="platform-card"><div class="flex items-center gap-2 mb-3"><span class="text-xl">\${p.icon}</span><span class="text-sm font-medium text-canvas-muted">\${p.name}</span></div><p class="text-2xl font-bold">\${p.followers}</p><p class="text-xs text-green-400 mt-1">\${p.growth} this month (↑\${p.pct}%)</p></div>\`
).join('');

// Follower Growth Chart
const canvas = document.getElementById('growthChart');
const ctx = canvas.getContext('2d');
const days = Array.from({length: 30}, (_, i) => i + 1);
const igData = days.map(d => 45800 + d * 80 + Math.sin(d) * 200);
const ttData = days.map(d => 77400 + d * 400 + Math.cos(d) * 500);

function drawGrowth() {
  const w = canvas.width = canvas.parentElement.clientWidth - 40;
  const h = canvas.height = 200;
  ctx.clearRect(0, 0, w, h);
  function drawLine(data, color) {
    const max = Math.max(...ttData) * 1.1;
    const min = Math.min(...igData) * 0.9;
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * (w - 20);
      const y = h - 20 - ((v - min) / (max - min)) * (h - 40);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.lineTo(w - 20, h - 20); ctx.lineTo(0, h - 20); ctx.closePath();
    ctx.fillStyle = color + '15'; ctx.fill();
  }
  drawLine(igData, '#e1306c');
  drawLine(ttData, '#00f2ea');
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#e1306c'; ctx.fillRect(w - 180, 10, 12, 12); ctx.fillStyle = '#9ca3af'; ctx.fillText('Instagram', w - 162, 20);
  ctx.fillStyle = '#00f2ea'; ctx.fillRect(w - 90, 10, 12, 12); ctx.fillStyle = '#9ca3af'; ctx.fillText('TikTok', w - 72, 20);
}
drawGrowth();

// Engagement
const engageData = [
  { platform: 'TikTok', rate: 8.4, icon: '🎵', cl: '#00f2ea' },
  { platform: 'Instagram', rate: 4.2, icon: '📸', cl: '#e1306c' },
  { platform: 'YouTube', rate: 3.8, icon: '🎬', cl: '#ff0000' },
  { platform: 'Twitter', rate: 2.1, icon: '🐦', cl: '#1da1f2' },
];
document.getElementById('engageList').innerHTML = engageData.map(e =>
  \`<div><div class="flex justify-between text-sm mb-1"><span>\${e.icon} \${e.platform}</span><span class="font-bold">\${e.rate}%</span></div><div class="compare-bar"><div class="compare-fill" style="width:\${(e.rate/10)*100}%;background:\${e.cl}"></div></div></div>\`
).join('');

// Top Posts
const topPosts = [
  { platform: '📸', title: 'Behind the scenes studio tour', likes: '12.4K', comments: '834', shares: '2.1K' },
  { platform: '🎵', title: 'Quick productivity hack #tips', likes: '45.2K', comments: '3.2K', shares: '8.9K' },
  { platform: '🎬', title: 'Complete Beginner Guide 2024', likes: '8.9K', comments: '1.2K', shares: '4.5K' },
  { platform: '🐦', title: 'Hot take on the new framework', likes: '3.2K', comments: '456', shares: '1.1K' },
  { platform: '📸', title: 'New product launch teaser', likes: '9.8K', comments: '672', shares: '1.8K' },
];
document.getElementById('topPosts').innerHTML = topPosts.map(p =>
  \`<div class="post-row"><span class="text-xl">\${p.platform}</span><span class="flex-1 text-sm font-medium">\${p.title}</span><span class="text-xs text-canvas-muted">❤️ \${p.likes}</span><span class="text-xs text-canvas-muted">💬 \${p.comments}</span><span class="text-xs text-canvas-muted">🔗 \${p.shares}</span></div>\`
).join('');

// Comparison
const compData = [
  { label: 'Reach', ig: 85, tw: 42, yt: 70, tt: 95 },
  { label: 'Engagement', ig: 62, tw: 35, yt: 55, tt: 88 },
  { label: 'Growth', ig: 40, tw: 30, yt: 60, tt: 92 },
];
document.getElementById('comparison').innerHTML = compData.map(c =>
  \`<div><p class="text-xs text-canvas-muted mb-2">\${c.label}</p><div class="space-y-1">\${[{n:'IG',v:c.ig,cl:'#e1306c'},{n:'TW',v:c.tw,cl:'#1da1f2'},{n:'YT',v:c.yt,cl:'#ff0000'},{n:'TT',v:c.tt,cl:'#00f2ea'}].map(b=>\`<div class="flex items-center gap-2 text-xs"><span class="w-6 text-canvas-muted-deep">\${b.n}</span><div class="compare-bar flex-1"><div class="compare-fill" style="width:\${b.v}%;background:\${b.cl}"></div></div><span class="w-8 text-right text-canvas-muted">\${b.v}%</span></div>\`).join('')}</div></div>\`
).join('');
`,
      },
    ],
  },

  // 25. CRM Dashboard
  {
    name: 'CRM Dashboard',
    icon: '🤝',
    category: 'dashboard',
    description: 'Customer relationship manager with deal pipeline, contact list, activity feed, and revenue funnel.',
    prompt: 'Build a CRM dashboard with a deal pipeline (lead, qualified, proposal, negotiation, closed), contact cards, activity timeline, and revenue funnel chart.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DealFlow — CRM</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-50 font-sans text-gray-800 min-h-screen">
  <nav class="bg-white border-b px-6 py-3 flex items-center justify-between">
    <div class="flex items-center gap-4">
      <span class="text-lg font-bold text-purple-600">🤝 DealFlow</span>
      <span class="text-sm text-canvas-muted">CRM Dashboard</span>
    </div>
    <div class="flex items-center gap-3">
      <span class="text-xs text-canvas-muted">Q4 2024</span>
      <button class="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg font-medium hover:bg-purple-700">+ New Deal</button>
    </div>
  </nav>

  <main class="p-6">
    <!-- KPI Cards -->
    <div class="grid grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-xl p-5 border"><p class="text-xs text-canvas-muted mb-1">Total Revenue</p><p class="text-2xl font-bold">$284K</p><p class="text-xs text-green-500 mt-1">↑ 18% vs Q3</p></div>
      <div class="bg-white rounded-xl p-5 border"><p class="text-xs text-canvas-muted mb-1">Active Deals</p><p class="text-2xl font-bold">47</p><p class="text-xs text-blue-500 mt-1">12 closing soon</p></div>
      <div class="bg-white rounded-xl p-5 border"><p class="text-xs text-canvas-muted mb-1">Win Rate</p><p class="text-2xl font-bold">34%</p><p class="text-xs text-green-500 mt-1">↑ 5% improvement</p></div>
      <div class="bg-white rounded-xl p-5 border"><p class="text-xs text-canvas-muted mb-1">Avg Deal Size</p><p class="text-2xl font-bold">$12.4K</p><p class="text-xs text-yellow-500 mt-1">→ Stable</p></div>
    </div>

    <!-- Pipeline -->
    <div class="bg-white rounded-xl p-5 border mb-6">
      <h3 class="font-bold text-sm mb-4">Deal Pipeline</h3>
      <div class="flex gap-4 overflow-x-auto" id="pipeline"></div>
    </div>

    <div class="grid grid-cols-3 gap-6">
      <!-- Revenue Funnel -->
      <div class="bg-white rounded-xl p-5 border">
        <h3 class="font-bold text-sm mb-4">Revenue Funnel</h3>
        <div id="funnel" class="space-y-2"></div>
      </div>

      <!-- Recent Activity -->
      <div class="bg-white rounded-xl p-5 border">
        <h3 class="font-bold text-sm mb-4">Recent Activity</h3>
        <div id="activity" class="space-y-3"></div>
      </div>

      <!-- Top Contacts -->
      <div class="bg-white rounded-xl p-5 border">
        <h3 class="font-bold text-sm mb-4">Top Contacts</h3>
        <div id="contacts" class="space-y-3"></div>
      </div>
    </div>
  </main>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.pipe-col { min-width: 220px; flex: 1; background: #f9fafb; border-radius: 10px; padding: 12px; }
.pipe-header { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; }
.deal-card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 6px; }
.deal-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.funnel-bar { border-radius: 6px; height: 36px; display: flex; align-items: center; padding: 0 12px; color: white; font-size: 0.75rem; font-weight: 600; transition: width 0.6s ease; margin: 0 auto; }
.activity-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.contact-card { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 8px; border: 1px solid #f3f4f6; }
.contact-card:hover { background: #f9fafb; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const stages = [
  { id: 'lead', label: 'Lead', color: 'text-canvas-muted-deep', deals: [
    { name: 'Acme Corp', value: '$15K', contact: 'John D.', days: 3 },
    { name: 'Beta Labs', value: '$8K', contact: 'Sarah M.', days: 7 },
    { name: 'Zeta Inc', value: '$22K', contact: 'Mike R.', days: 1 },
  ]},
  { id: 'qualified', label: 'Qualified', color: 'text-blue-500', deals: [
    { name: 'Delta Systems', value: '$34K', contact: 'Lisa K.', days: 5 },
    { name: 'Omega Group', value: '$12K', contact: 'Tom B.', days: 12 },
  ]},
  { id: 'proposal', label: 'Proposal', color: 'text-purple-500', deals: [
    { name: 'Nova Tech', value: '$28K', contact: 'Amy L.', days: 8 },
    { name: 'Star Digital', value: '$19K', contact: 'Dan W.', days: 15 },
    { name: 'Peak Co', value: '$41K', contact: 'Nina S.', days: 3 },
  ]},
  { id: 'negotiation', label: 'Negotiation', color: 'text-yellow-500', deals: [
    { name: 'Apex Solutions', value: '$52K', contact: 'Rob H.', days: 6 },
  ]},
  { id: 'closed', label: 'Closed Won', color: 'text-green-500', deals: [
    { name: 'Cloud Nine', value: '$38K', contact: 'Eva T.', days: 0 },
    { name: 'Bright Corp', value: '$16K', contact: 'Carl J.', days: 0 },
  ]},
];

// Pipeline
document.getElementById('pipeline').innerHTML = stages.map(s => \`
  <div class="pipe-col">
    <div class="pipe-header \${s.color}"><span>\${s.label}</span><span class="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">\${s.deals.length}</span></div>
    \${s.deals.map(d => \`
      <div class="deal-card">
        <p class="text-sm font-semibold">\${d.name}</p>
        <p class="text-xs text-canvas-muted mt-1">\${d.contact}</p>
        <div class="flex justify-between mt-2"><span class="text-xs font-bold text-purple-600">\${d.value}</span><span class="text-xs text-canvas-muted">\${d.days}d ago</span></div>
      </div>
    \`).join('')}
  </div>
\`).join('');

// Revenue Funnel
const funnelData = [
  { label: 'Leads', value: 245, pct: 100, color: '#6366f1' },
  { label: 'Qualified', value: 132, pct: 54, color: '#8b5cf6' },
  { label: 'Proposal', value: 68, pct: 28, color: '#a78bfa' },
  { label: 'Negotiation', value: 34, pct: 14, color: '#c4b5fd' },
  { label: 'Closed', value: 18, pct: 7, color: '#10b981' },
];
document.getElementById('funnel').innerHTML = funnelData.map(f =>
  \`<div><div class="flex justify-between text-xs mb-1"><span class="text-canvas-muted-deep">\${f.label}</span><span class="font-bold">\${f.value}</span></div><div class="funnel-bar" style="width:\${f.pct}%;background:\${f.color}">\${f.pct}%</div></div>\`
).join('');

// Activity
const activities = [
  { icon: '📞', text: 'Call with Apex Solutions', time: '2h ago', color: '#3b82f6' },
  { icon: '📧', text: 'Proposal sent to Nova Tech', time: '4h ago', color: '#8b5cf6' },
  { icon: '🤝', text: 'Deal closed — Cloud Nine', time: '1d ago', color: '#10b981' },
  { icon: '📋', text: 'Follow-up scheduled — Delta', time: '1d ago', color: '#f59e0b' },
  { icon: '💬', text: 'Note added for Beta Labs', time: '2d ago', color: '#6b7280' },
  { icon: '📞', text: 'Discovery call — Zeta Inc', time: '3d ago', color: '#3b82f6' },
];
document.getElementById('activity').innerHTML = activities.map(a =>
  \`<div class="flex items-start gap-3"><div class="activity-dot mt-1.5" style="background:\${a.color}"></div><div><p class="text-sm">\${a.icon} \${a.text}</p><p class="text-xs text-canvas-muted">\${a.time}</p></div></div>\`
).join('');

// Contacts
const contacts = [
  { name: 'Lisa Kim', company: 'Delta Systems', value: '$34K', initials: 'LK', bg: 'bg-blue-100 text-blue-700' },
  { name: 'Rob Hayes', company: 'Apex Solutions', value: '$52K', initials: 'RH', bg: 'bg-purple-100 text-purple-700' },
  { name: 'Eva Torres', company: 'Cloud Nine', value: '$38K', initials: 'ET', bg: 'bg-green-100 text-green-700' },
  { name: 'Amy Lin', company: 'Nova Tech', value: '$28K', initials: 'AL', bg: 'bg-pink-100 text-pink-700' },
  { name: 'Dan Walker', company: 'Star Digital', value: '$19K', initials: 'DW', bg: 'bg-yellow-100 text-yellow-700' },
];
document.getElementById('contacts').innerHTML = contacts.map(c =>
  \`<div class="contact-card"><div class="w-9 h-9 \${c.bg} rounded-full flex items-center justify-center text-xs font-bold">\${c.initials}</div><div class="flex-1"><p class="text-sm font-medium">\${c.name}</p><p class="text-xs text-canvas-muted">\${c.company}</p></div><span class="text-xs font-bold text-purple-600">\${c.value}</span></div>\`
).join('');
`,
      },
    ],
  },

  // 26. Online Course Platform
  {
    name: 'Online Course Platform',
    icon: '🎓',
    category: 'education',
    description: 'Course catalog with video lessons, progress tracking, curriculum outline, and enrollment system.',
    prompt: 'Build an online course platform with course catalog, video lesson player, curriculum sidebar, progress tracker, and enrollment buttons.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LearnHub — Online Courses</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-50 font-sans text-gray-800">
  <nav class="bg-white border-b px-6 py-3 flex items-center justify-between sticky top-0 z-30">
    <h1 class="text-lg font-bold text-indigo-600">🎓 LearnHub</h1>
    <div class="flex items-center gap-4">
      <div class="flex gap-2" id="viewTabs">
        <button class="tab-btn active" data-view="catalog">Catalog</button>
        <button class="tab-btn" data-view="course">My Course</button>
      </div>
    </div>
  </nav>

  <!-- Catalog View -->
  <section id="catalogView" class="p-6 max-w-6xl mx-auto">
    <div class="mb-6"><h2 class="text-2xl font-bold mb-1">Explore Courses</h2><p class="text-canvas-muted text-sm">Learn new skills with expert-led courses</p></div>
    <div class="flex gap-2 mb-6" id="catFilters"></div>
    <div class="grid grid-cols-3 gap-6" id="courseGrid"></div>
  </section>

  <!-- Course View -->
  <section id="courseView" class="hidden">
    <div class="flex min-h-screen">
      <!-- Sidebar Curriculum -->
      <aside class="w-80 bg-white border-r overflow-y-auto p-4">
        <button id="backBtn" class="text-sm text-indigo-600 mb-4 hover:underline">← Back to Catalog</button>
        <h3 class="font-bold text-sm mb-3" id="courseTitle"></h3>
        <div class="mb-4"><div class="flex justify-between text-xs mb-1"><span class="text-canvas-muted">Progress</span><span class="font-bold text-indigo-600" id="progressPct">0%</span></div><div class="h-2 bg-gray-200 rounded-full"><div id="progressBar" class="h-full bg-indigo-500 rounded-full transition-all"></div></div></div>
        <div id="curriculum" class="space-y-1"></div>
      </aside>
      <!-- Main Content -->
      <main class="flex-1 p-6">
        <div class="bg-gray-900 rounded-xl aspect-video flex items-center justify-center mb-6" id="videoPlayer">
          <div class="text-center text-white"><div class="text-5xl mb-3">▶️</div><p class="text-lg font-medium" id="lessonTitle">Select a lesson</p><p class="text-sm text-canvas-muted" id="lessonDuration"></p></div>
        </div>
        <div id="lessonContent" class="prose max-w-none"></div>
      </main>
    </div>
  </section>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.tab-btn { padding: 6px 16px; font-size: 0.8rem; font-weight: 600; border-radius: 8px; border: 1px solid #e5e7eb; cursor: pointer; background: white; }
.tab-btn.active { background: #4f46e5; color: white; border-color: #4f46e5; }
.cat-btn { padding: 6px 14px; font-size: 0.75rem; border-radius: 20px; border: 1px solid #e5e7eb; cursor: pointer; background: white; font-weight: 500; }
.cat-btn.active { background: #4f46e5; color: white; border-color: #4f46e5; }
.course-card { background: white; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden; cursor: pointer; transition: all 0.2s; }
.course-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.08); transform: translateY(-2px); }
.course-thumb { height: 160px; display: flex; align-items: center; justify-content: center; font-size: 3rem; }
.lesson-item { padding: 10px 12px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; }
.lesson-item:hover { background: #f3f4f6; }
.lesson-item.active { background: #eef2ff; color: #4f46e5; font-weight: 600; }
.lesson-item.completed { color: #10b981; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const courses = [
  { id: 1, title: 'React Masterclass', cat: 'Development', thumb: '⚛️', bg: 'bg-blue-100', instructor: 'Sarah Chen', rating: 4.8, students: '12.4K', price: '$49', lessons: [
    { title: 'Introduction to React', duration: '12:30', desc: 'Learn the fundamentals of React, including JSX, components, and the virtual DOM.' },
    { title: 'Components & Props', duration: '18:45', desc: 'Deep dive into functional and class components, passing props, and component composition.' },
    { title: 'State & Lifecycle', duration: '22:10', desc: 'Managing state with useState, useEffect, and understanding component lifecycle.' },
    { title: 'Hooks Deep Dive', duration: '25:00', desc: 'Advanced hooks: useContext, useReducer, useMemo, useCallback, and custom hooks.' },
    { title: 'Building a Project', duration: '35:20', desc: 'Put it all together by building a complete task management application.' },
  ]},
  { id: 2, title: 'UI/UX Design Fundamentals', cat: 'Design', thumb: '🎨', bg: 'bg-pink-100', instructor: 'Alex Mora', rating: 4.6, students: '8.2K', price: '$39', lessons: [
    { title: 'Design Principles', duration: '15:00', desc: 'Core design principles: hierarchy, contrast, alignment, and proximity.' },
    { title: 'Color Theory', duration: '20:30', desc: 'Understanding color wheels, palettes, and psychological effects of color.' },
    { title: 'Typography', duration: '14:20', desc: 'Font pairing, hierarchy, readability, and responsive typography.' },
    { title: 'Wireframing', duration: '28:00', desc: 'From sketches to low-fidelity wireframes using industry tools.' },
    { title: 'Prototyping', duration: '32:15', desc: 'Creating interactive prototypes and conducting user testing.' },
  ]},
  { id: 3, title: 'Python for Data Science', cat: 'Development', thumb: '🐍', bg: 'bg-green-100', instructor: 'James Park', rating: 4.9, students: '18.7K', price: '$59', lessons: [
    { title: 'Python Basics', duration: '20:00', desc: 'Variables, data types, loops, functions, and Python essentials.' },
    { title: 'NumPy & Pandas', duration: '30:45', desc: 'Data manipulation with NumPy arrays and Pandas DataFrames.' },
    { title: 'Data Visualization', duration: '25:10', desc: 'Creating charts and plots with Matplotlib and Seaborn.' },
    { title: 'Machine Learning Intro', duration: '35:00', desc: 'Supervised and unsupervised learning with scikit-learn.' },
    { title: 'Real-World Project', duration: '40:20', desc: 'End-to-end data science project from data cleaning to model deployment.' },
  ]},
  { id: 4, title: 'Digital Marketing', cat: 'Marketing', thumb: '📈', bg: 'bg-yellow-100', instructor: 'Maya Singh', rating: 4.5, students: '6.1K', price: '$29', lessons: [
    { title: 'Marketing Fundamentals', duration: '16:00', desc: 'Understanding digital marketing landscape and key channels.' },
    { title: 'SEO Strategies', duration: '22:30', desc: 'On-page and off-page SEO, keyword research, and ranking factors.' },
    { title: 'Social Media Marketing', duration: '19:45', desc: 'Platform-specific strategies for Instagram, Twitter, and LinkedIn.' },
    { title: 'Email Campaigns', duration: '18:20', desc: 'Building email lists, automation workflows, and A/B testing.' },
    { title: 'Analytics & Reporting', duration: '24:00', desc: 'Tracking KPIs, Google Analytics, and data-driven decisions.' },
  ]},
  { id: 5, title: 'Photography Basics', cat: 'Creative', thumb: '📷', bg: 'bg-purple-100', instructor: 'Emma Lee', rating: 4.7, students: '9.3K', price: '$34', lessons: [
    { title: 'Camera Settings', duration: '14:30', desc: 'Understanding aperture, shutter speed, and ISO.' },
    { title: 'Composition Rules', duration: '18:00', desc: 'Rule of thirds, leading lines, framing, and visual balance.' },
    { title: 'Lighting Techniques', duration: '22:45', desc: 'Natural light, golden hour, studio lighting, and flash.' },
    { title: 'Photo Editing', duration: '28:10', desc: 'Post-processing workflow in Lightroom and Photoshop.' },
    { title: 'Building Portfolio', duration: '20:00', desc: 'Curating, presenting, and sharing your photography work.' },
  ]},
  { id: 6, title: 'Business Strategy', cat: 'Business', thumb: '💼', bg: 'bg-indigo-100', instructor: 'David Chen', rating: 4.4, students: '5.8K', price: '$44', lessons: [
    { title: 'Strategic Thinking', duration: '17:00', desc: 'Frameworks for strategic analysis: SWOT, Porter Five Forces.' },
    { title: 'Market Research', duration: '21:30', desc: 'Primary and secondary research methods for market analysis.' },
    { title: 'Business Models', duration: '19:00', desc: 'Canvas model, revenue streams, and value propositions.' },
    { title: 'Growth Strategies', duration: '24:20', desc: 'Scaling strategies, partnerships, and market expansion.' },
    { title: 'Financial Planning', duration: '26:45', desc: 'Budgeting, forecasting, and financial decision-making.' },
  ]},
];

const categories = ['All', ...new Set(courses.map(c => c.cat))];
let activeCat = 'All';
let activeCourse = null;
let completed = new Set();

// Filters
document.getElementById('catFilters').innerHTML = categories.map(c =>
  \`<button class="cat-btn \${c === activeCat ? 'active' : ''}" data-cat="\${c}">\${c}</button>\`
).join('');

document.getElementById('catFilters').addEventListener('click', e => {
  if (!e.target.dataset.cat) return;
  activeCat = e.target.dataset.cat;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === activeCat));
  renderCatalog();
});

function renderCatalog() {
  const filtered = activeCat === 'All' ? courses : courses.filter(c => c.cat === activeCat);
  document.getElementById('courseGrid').innerHTML = filtered.map(c => \`
    <div class="course-card" data-id="\${c.id}">
      <div class="course-thumb \${c.bg}">\${c.thumb}</div>
      <div class="p-4">
        <span class="text-xs text-indigo-500 font-medium">\${c.cat}</span>
        <h3 class="font-bold mt-1">\${c.title}</h3>
        <p class="text-xs text-canvas-muted mt-1">by \${c.instructor}</p>
        <div class="flex items-center justify-between mt-3">
          <span class="text-xs text-canvas-muted">⭐ \${c.rating} · \${c.students} students</span>
          <span class="font-bold text-indigo-600">\${c.price}</span>
        </div>
      </div>
    </div>
  \`).join('');
}

renderCatalog();

// Click course
document.getElementById('courseGrid').addEventListener('click', e => {
  const card = e.target.closest('.course-card');
  if (!card) return;
  const course = courses.find(c => c.id === Number(card.dataset.id));
  if (course) openCourse(course);
});

function openCourse(course) {
  activeCourse = course;
  completed = new Set();
  document.getElementById('catalogView').classList.add('hidden');
  document.getElementById('courseView').classList.remove('hidden');
  document.getElementById('courseTitle').textContent = course.title;
  renderCurriculum();
  selectLesson(0);
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.view === 'course'));
}

function renderCurriculum() {
  document.getElementById('curriculum').innerHTML = activeCourse.lessons.map((l, i) => \`
    <div class="lesson-item \${i === 0 ? 'active' : ''} \${completed.has(i) ? 'completed' : ''}" data-idx="\${i}">
      <span>\${completed.has(i) ? '✅' : '○'}</span>
      <div class="flex-1"><p>\${l.title}</p><p class="text-xs text-canvas-muted">\${l.duration}</p></div>
    </div>
  \`).join('');
  const pct = activeCourse.lessons.length ? Math.round((completed.size / activeCourse.lessons.length) * 100) : 0;
  document.getElementById('progressPct').textContent = pct + '%';
  document.getElementById('progressBar').style.width = pct + '%';
}

function selectLesson(idx) {
  const lesson = activeCourse.lessons[idx];
  document.getElementById('lessonTitle').textContent = lesson.title;
  document.getElementById('lessonDuration').textContent = lesson.duration;
  document.getElementById('lessonContent').innerHTML = \`<h3 class="text-lg font-bold mb-2">\${lesson.title}</h3><p class="text-gray-600">\${lesson.desc}</p><button class="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg font-medium complete-btn" data-idx="\${idx}">Mark Complete</button>\`;
  document.querySelectorAll('.lesson-item').forEach((el, i) => el.classList.toggle('active', i === idx));
}

document.getElementById('curriculum').addEventListener('click', e => {
  const item = e.target.closest('.lesson-item');
  if (item) selectLesson(Number(item.dataset.idx));
});

document.getElementById('courseView').addEventListener('click', e => {
  if (e.target.classList.contains('complete-btn')) {
    completed.add(Number(e.target.dataset.idx));
    renderCurriculum();
  }
});

// Navigation
document.getElementById('backBtn').addEventListener('click', () => {
  document.getElementById('courseView').classList.add('hidden');
  document.getElementById('catalogView').classList.remove('hidden');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.view === 'catalog'));
});

document.getElementById('viewTabs').addEventListener('click', e => {
  if (!e.target.dataset.view) return;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === e.target));
  if (e.target.dataset.view === 'catalog') {
    document.getElementById('courseView').classList.add('hidden');
    document.getElementById('catalogView').classList.remove('hidden');
  } else if (activeCourse) {
    document.getElementById('catalogView').classList.add('hidden');
    document.getElementById('courseView').classList.remove('hidden');
  }
});
`,
      },
    ],
  },

  // 27. Quiz & Exam Builder
  {
    name: 'Quiz & Exam Builder',
    icon: '📝',
    category: 'education',
    description: 'Interactive quiz with multiple choice questions, timer, score tracking, and results summary.',
    prompt: 'Build an interactive quiz application with multiple choice questions, countdown timer, progress indicator, instant feedback, and a results page with score breakdown.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>QuizMaster — Test Your Knowledge</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gradient-to-br from-indigo-50 to-purple-50 font-sans min-h-screen flex items-center justify-center p-6">
  <div class="w-full max-w-2xl">
    <!-- Start Screen -->
    <div id="startScreen" class="bg-white rounded-2xl p-8 text-center shadow-lg">
      <div class="text-5xl mb-4">🧠</div>
      <h1 class="text-2xl font-bold mb-2">Web Development Quiz</h1>
      <p class="text-canvas-muted text-sm mb-6">Test your knowledge with 8 questions. You have 30 seconds per question.</p>
      <div class="flex justify-center gap-4 text-sm text-canvas-muted-deep mb-6">
        <span>📝 8 Questions</span><span>⏱️ 30s / question</span><span>🏆 Score Tracked</span>
      </div>
      <button id="startBtn" class="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition">Start Quiz</button>
    </div>

    <!-- Quiz Screen -->
    <div id="quizScreen" class="hidden">
      <div class="bg-white rounded-2xl p-6 shadow-lg">
        <div class="flex items-center justify-between mb-4">
          <span class="text-sm font-medium text-canvas-muted" id="qNumber">Question 1/8</span>
          <div class="flex items-center gap-2"><span class="text-lg">⏱️</span><span id="timer" class="font-bold text-indigo-600 text-lg">30</span></div>
        </div>
        <div class="h-2 bg-gray-100 rounded-full mb-6"><div id="progressBar" class="h-full bg-indigo-500 rounded-full transition-all duration-300"></div></div>
        <h2 class="text-lg font-bold mb-6" id="question"></h2>
        <div id="options" class="space-y-3"></div>
        <div id="feedback" class="mt-4 p-3 rounded-lg text-sm font-medium hidden"></div>
        <button id="nextBtn" class="mt-6 w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hidden hover:bg-indigo-700 transition">Next Question →</button>
      </div>
    </div>

    <!-- Results Screen -->
    <div id="resultsScreen" class="hidden">
      <div class="bg-white rounded-2xl p-8 text-center shadow-lg">
        <div class="text-5xl mb-4" id="resultEmoji"></div>
        <h2 class="text-2xl font-bold mb-2">Quiz Complete!</h2>
        <p class="text-canvas-muted text-sm mb-6" id="resultMsg"></p>
        <div class="grid grid-cols-3 gap-4 mb-6">
          <div class="bg-green-50 rounded-xl p-4"><p class="text-2xl font-bold text-green-600" id="correctCount">0</p><p class="text-xs text-canvas-muted">Correct</p></div>
          <div class="bg-red-50 rounded-xl p-4"><p class="text-2xl font-bold text-primary-500" id="wrongCount">0</p><p class="text-xs text-canvas-muted">Wrong</p></div>
          <div class="bg-indigo-50 rounded-xl p-4"><p class="text-2xl font-bold text-indigo-600" id="scoreTotal">0%</p><p class="text-xs text-canvas-muted">Score</p></div>
        </div>
        <div id="reviewList" class="text-left space-y-2 mb-6"></div>
        <button id="retryBtn" class="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition">Try Again</button>
      </div>
    </div>
  </div>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.option-btn { width: 100%; padding: 14px 18px; border: 2px solid #e5e7eb; border-radius: 12px; text-align: left; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; background: white; display: flex; align-items: center; gap: 12px; }
.option-btn:hover:not(.answered) { border-color: #818cf8; background: #eef2ff; }
.option-btn.correct { border-color: #10b981; background: #ecfdf5; }
.option-btn.wrong { border-color: #ef4444; background: #fef2f2; }
.option-btn.answered { cursor: default; }
.option-letter { width: 28px; height: 28px; border-radius: 8px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; flex-shrink: 0; }
.correct .option-letter { background: #10b981; color: white; }
.wrong .option-letter { background: #ef4444; color: white; }
.review-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 8px; font-size: 0.8rem; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const questions = [
  { q: 'What does HTML stand for?', options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Hyper Transfer Markup Logic', 'Home Tool Markup Language'], answer: 0 },
  { q: 'Which CSS property controls text size?', options: ['text-style', 'font-size', 'text-size', 'font-style'], answer: 1 },
  { q: 'What keyword declares a constant in JavaScript?', options: ['var', 'let', 'const', 'static'], answer: 2 },
  { q: 'Which tag is used for the largest heading?', options: ['<heading>', '<h6>', '<head>', '<h1>'], answer: 3 },
  { q: 'What does CSS stand for?', options: ['Cascading Style Sheets', 'Creative Style System', 'Computer Style Sheets', 'Colorful Style Sheets'], answer: 0 },
  { q: 'Which method adds an element to the end of an array?', options: ['append()', 'push()', 'add()', 'insert()'], answer: 1 },
  { q: 'What is the correct syntax for a JavaScript arrow function?', options: ['function => {}', '() -> {}', '=> function()', '() => {}'], answer: 3 },
  { q: 'Which HTML attribute specifies an alternate text for an image?', options: ['title', 'src', 'alt', 'description'], answer: 2 },
];

let current = 0, score = 0, answers = [], timer, timeLeft;
const letters = ['A', 'B', 'C', 'D'];

document.getElementById('startBtn').addEventListener('click', startQuiz);
document.getElementById('nextBtn').addEventListener('click', nextQuestion);
document.getElementById('retryBtn').addEventListener('click', () => location.reload());

function startQuiz() {
  document.getElementById('startScreen').classList.add('hidden');
  document.getElementById('quizScreen').classList.remove('hidden');
  showQuestion();
}

function showQuestion() {
  const q = questions[current];
  document.getElementById('qNumber').textContent = 'Question ' + (current + 1) + '/' + questions.length;
  document.getElementById('progressBar').style.width = ((current / questions.length) * 100) + '%';
  document.getElementById('question').textContent = q.q;
  document.getElementById('options').innerHTML = q.options.map((o, i) =>
    \`<button class="option-btn" data-idx="\${i}"><span class="option-letter">\${letters[i]}</span>\${o}</button>\`
  ).join('');
  document.getElementById('feedback').classList.add('hidden');
  document.getElementById('nextBtn').classList.add('hidden');
  startTimer();

  document.getElementById('options').addEventListener('click', handleAnswer, { once: true });
}

function startTimer() {
  timeLeft = 30;
  document.getElementById('timer').textContent = timeLeft;
  timer = setInterval(() => {
    timeLeft--;
    document.getElementById('timer').textContent = timeLeft;
    if (timeLeft <= 0) { clearInterval(timer); autoAnswer(); }
  }, 1000);
}

function handleAnswer(e) {
  const btn = e.target.closest('.option-btn');
  if (!btn) return;
  clearInterval(timer);
  const idx = Number(btn.dataset.idx);
  const correct = questions[current].answer;
  const isCorrect = idx === correct;
  if (isCorrect) score++;
  answers.push({ q: current, selected: idx, correct, isCorrect });

  document.querySelectorAll('.option-btn').forEach((b, i) => {
    b.classList.add('answered');
    if (i === correct) b.classList.add('correct');
    if (i === idx && !isCorrect) b.classList.add('wrong');
  });

  const fb = document.getElementById('feedback');
  fb.classList.remove('hidden');
  fb.className = 'mt-4 p-3 rounded-lg text-sm font-medium ' + (isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-primary-600');
  fb.textContent = isCorrect ? '✅ Correct!' : '❌ Wrong! The answer was: ' + questions[current].options[correct];
  document.getElementById('nextBtn').classList.remove('hidden');
  document.getElementById('nextBtn').textContent = current < questions.length - 1 ? 'Next Question →' : 'See Results →';
}

function autoAnswer() {
  answers.push({ q: current, selected: -1, correct: questions[current].answer, isCorrect: false });
  document.querySelectorAll('.option-btn').forEach((b, i) => {
    b.classList.add('answered');
    if (i === questions[current].answer) b.classList.add('correct');
  });
  const fb = document.getElementById('feedback');
  fb.classList.remove('hidden');
  fb.className = 'mt-4 p-3 rounded-lg text-sm font-medium bg-yellow-50 text-yellow-700';
  fb.textContent = "⏱️ Time's up! The answer was: " + questions[current].options[questions[current].answer];
  document.getElementById('nextBtn').classList.remove('hidden');
}

function nextQuestion() {
  current++;
  if (current < questions.length) showQuestion();
  else showResults();
}

function showResults() {
  document.getElementById('quizScreen').classList.add('hidden');
  document.getElementById('resultsScreen').classList.remove('hidden');
  const pct = Math.round((score / questions.length) * 100);
  document.getElementById('correctCount').textContent = score;
  document.getElementById('wrongCount').textContent = questions.length - score;
  document.getElementById('scoreTotal').textContent = pct + '%';
  document.getElementById('resultEmoji').textContent = pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '📚';
  document.getElementById('resultMsg').textContent = pct >= 80 ? 'Excellent! You really know your stuff!' : pct >= 50 ? 'Good job! Keep learning!' : 'Keep studying, you\\'ll get there!';
  document.getElementById('reviewList').innerHTML = answers.map((a, i) =>
    \`<div class="review-item \${a.isCorrect ? 'bg-green-50' : 'bg-red-50'}"><span>\${a.isCorrect ? '✅' : '❌'}</span><span class="flex-1">\${questions[i].q}</span></div>\`
  ).join('');
}
`,
      },
    ],
  },

  // 28. Digital Library
  {
    name: 'Digital Library',
    icon: '📚',
    category: 'education',
    description: 'Book catalog with search, genre filters, reading lists, book detail modals, and rating system.',
    prompt: 'Build a digital library with book catalog grid, search bar, genre filters, book detail modal with description and rating stars, and a reading list feature.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BookShelf — Digital Library</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-amber-50 font-sans text-gray-800 min-h-screen">
  <nav class="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-30">
    <h1 class="text-lg font-bold text-amber-700">📚 BookShelf</h1>
    <div class="flex items-center gap-3">
      <div class="relative"><input id="search" type="text" placeholder="Search books..." class="pl-8 pr-4 py-2 border rounded-lg text-sm w-64 outline-none focus:border-amber-400" /><span class="absolute left-2.5 top-2.5 text-canvas-text text-sm">🔍</span></div>
      <button id="listToggle" class="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-amber-50">📖 Reading List <span id="listCount" class="bg-amber-100 text-amber-700 px-1.5 rounded-full text-xs font-bold">0</span></button>
    </div>
  </nav>

  <main class="max-w-6xl mx-auto p-6">
    <div class="flex gap-2 mb-6 flex-wrap" id="genreFilters"></div>
    <div class="grid grid-cols-4 gap-5" id="bookGrid"></div>
  </main>

  <!-- Book Modal -->
  <div id="bookModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-lg w-full p-6 relative">
      <button id="closeModal" class="absolute top-4 right-4 text-canvas-text hover:text-gray-600 text-xl">✕</button>
      <div class="flex gap-5">
        <div id="modalCover" class="w-32 h-44 rounded-xl flex items-center justify-center text-4xl flex-shrink-0"></div>
        <div>
          <h2 id="modalTitle" class="text-lg font-bold"></h2>
          <p id="modalAuthor" class="text-sm text-canvas-muted mb-2"></p>
          <div id="modalStars" class="flex gap-0.5 mb-2"></div>
          <span id="modalGenre" class="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full"></span>
          <p id="modalPages" class="text-xs text-canvas-muted mt-2"></p>
        </div>
      </div>
      <p id="modalDesc" class="text-sm text-gray-600 mt-4 leading-relaxed"></p>
      <button id="modalListBtn" class="mt-4 w-full py-2.5 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition"></button>
    </div>
  </div>

  <!-- Reading List Drawer -->
  <div id="listDrawer" class="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 transform translate-x-full transition-transform p-6 overflow-y-auto">
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-bold">📖 Reading List</h3>
      <button id="closeList" class="text-canvas-text hover:text-gray-600 text-xl">✕</button>
    </div>
    <div id="readingList" class="space-y-3"></div>
    <p id="emptyList" class="text-sm text-canvas-muted text-center mt-8">No books in your list yet</p>
  </div>

  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.genre-btn { padding: 6px 14px; font-size: 0.75rem; border-radius: 20px; border: 1px solid #e5e7eb; cursor: pointer; background: white; font-weight: 500; transition: all 0.15s; }
.genre-btn.active { background: #d97706; color: white; border-color: #d97706; }
.genre-btn:hover:not(.active) { border-color: #d97706; }
.book-card { background: white; border-radius: 14px; overflow: hidden; cursor: pointer; transition: all 0.2s; border: 1px solid #f3f4f6; }
.book-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.08); }
.book-cover { height: 180px; display: flex; align-items: center; justify-content: center; font-size: 3.5rem; }
.list-item { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 10px; border: 1px solid #f3f4f6; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const books = [
  { id: 1, title: 'The Art of Code', author: 'Sarah Mitchell', genre: 'Technology', rating: 4.8, pages: 342, emoji: '💻', bg: 'bg-blue-100', desc: 'A beautifully written exploration of how code shapes our world, from algorithms to artificial intelligence.' },
  { id: 2, title: 'Midnight Garden', author: 'James Harper', genre: 'Fiction', rating: 4.5, pages: 298, emoji: '🌙', bg: 'bg-indigo-100', desc: 'A haunting tale of mystery and magic set in an English garden where time itself begins to unravel.' },
  { id: 3, title: 'Atomic Habits', author: 'Clear Johnson', genre: 'Self-Help', rating: 4.9, pages: 256, emoji: '⚡', bg: 'bg-yellow-100', desc: 'Practical strategies for building good habits, breaking bad ones, and mastering tiny behaviors.' },
  { id: 4, title: 'The Ocean Within', author: 'Maya Patel', genre: 'Fiction', rating: 4.3, pages: 384, emoji: '🌊', bg: 'bg-cyan-100', desc: 'An epic journey across continents exploring love, loss, and the search for belonging.' },
  { id: 5, title: 'Data Stories', author: 'Alex Chen', genre: 'Technology', rating: 4.6, pages: 310, emoji: '📊', bg: 'bg-green-100', desc: 'How data visualization transforms raw numbers into compelling narratives that drive decisions.' },
  { id: 6, title: 'Silent Stars', author: 'Emma Woods', genre: 'Science', rating: 4.7, pages: 420, emoji: '✨', bg: 'bg-purple-100', desc: 'A fascinating look at the cosmos, black holes, and the silent signals from distant galaxies.' },
  { id: 7, title: 'The Growth Mind', author: 'David Park', genre: 'Self-Help', rating: 4.4, pages: 228, emoji: '🧠', bg: 'bg-pink-100', desc: 'Unlocking your potential through mindset shifts, resilience building, and intentional learning.' },
  { id: 8, title: 'Wild Algorithms', author: 'Lisa Tran', genre: 'Science', rating: 4.8, pages: 366, emoji: '🦋', bg: 'bg-emerald-100', desc: 'How nature\\'s patterns inspire the most elegant computer science algorithms ever designed.' },
  { id: 9, title: 'City of Echoes', author: 'Robert Gray', genre: 'Fiction', rating: 4.2, pages: 452, emoji: '🏙️', bg: 'bg-gray-100', desc: 'A noir thriller set in a dystopian megalopolis where echoes of the past hold the key to survival.' },
  { id: 10, title: 'Design Thinking', author: 'Kate Moore', genre: 'Business', rating: 4.5, pages: 275, emoji: '🎨', bg: 'bg-rose-100', desc: 'A hands-on guide to applying design thinking methodology in business and product innovation.' },
  { id: 11, title: 'The Last Forest', author: 'Noah Kim', genre: 'Science', rating: 4.6, pages: 338, emoji: '🌲', bg: 'bg-green-100', desc: 'An urgent, beautifully told account of Earth\\'s forests and the fight to save them.' },
  { id: 12, title: 'Startup Playbook', author: 'Jack Rivera', genre: 'Business', rating: 4.3, pages: 290, emoji: '🚀', bg: 'bg-orange-100', desc: 'From idea to IPO: battle-tested strategies from founders who built billion-dollar companies.' },
];

const genres = ['All', ...new Set(books.map(b => b.genre))];
let activeGenre = 'All';
let readingList = new Set();
let searchTerm = '';

// Genre filters
function renderGenres() {
  document.getElementById('genreFilters').innerHTML = genres.map(g =>
    \`<button class="genre-btn \${g === activeGenre ? 'active' : ''}" data-genre="\${g}">\${g}</button>\`
  ).join('');
}
renderGenres();

document.getElementById('genreFilters').addEventListener('click', e => {
  if (!e.target.dataset.genre) return;
  activeGenre = e.target.dataset.genre;
  renderGenres();
  renderBooks();
});

// Search
document.getElementById('search').addEventListener('input', e => {
  searchTerm = e.target.value.toLowerCase();
  renderBooks();
});

function renderBooks() {
  let filtered = books;
  if (activeGenre !== 'All') filtered = filtered.filter(b => b.genre === activeGenre);
  if (searchTerm) filtered = filtered.filter(b => b.title.toLowerCase().includes(searchTerm) || b.author.toLowerCase().includes(searchTerm));
  document.getElementById('bookGrid').innerHTML = filtered.map(b => \`
    <div class="book-card" data-id="\${b.id}">
      <div class="book-cover \${b.bg}">\${b.emoji}</div>
      <div class="p-4">
        <span class="text-xs text-amber-600 font-medium">\${b.genre}</span>
        <h3 class="font-bold text-sm mt-1">\${b.title}</h3>
        <p class="text-xs text-canvas-muted mt-0.5">\${b.author}</p>
        <div class="flex items-center justify-between mt-3">
          <span class="text-xs text-yellow-500">\${'★'.repeat(Math.floor(b.rating))}\${'☆'.repeat(5 - Math.floor(b.rating))} \${b.rating}</span>
          <span class="text-xs text-canvas-text">\${b.pages}p</span>
        </div>
      </div>
    </div>
  \`).join('');
}
renderBooks();

// Book modal
document.getElementById('bookGrid').addEventListener('click', e => {
  const card = e.target.closest('.book-card');
  if (!card) return;
  const book = books.find(b => b.id === Number(card.dataset.id));
  if (book) openModal(book);
});

function openModal(b) {
  document.getElementById('modalCover').className = 'w-32 h-44 rounded-xl flex items-center justify-center text-4xl flex-shrink-0 ' + b.bg;
  document.getElementById('modalCover').textContent = b.emoji;
  document.getElementById('modalTitle').textContent = b.title;
  document.getElementById('modalAuthor').textContent = 'by ' + b.author;
  document.getElementById('modalStars').innerHTML = Array.from({length:5}, (_, i) => \`<span class="text-lg \${i < Math.floor(b.rating) ? 'text-yellow-400' : 'text-gray-200'}">\${i < Math.floor(b.rating) ? '★' : '☆'}</span>\`).join('');
  document.getElementById('modalGenre').textContent = b.genre;
  document.getElementById('modalPages').textContent = b.pages + ' pages';
  document.getElementById('modalDesc').textContent = b.desc;
  const inList = readingList.has(b.id);
  const btn = document.getElementById('modalListBtn');
  btn.textContent = inList ? '✓ In Reading List' : '+ Add to Reading List';
  btn.onclick = () => { if (inList) readingList.delete(b.id); else readingList.add(b.id); updateListCount(); openModal(b); };
  document.getElementById('bookModal').classList.remove('hidden');
}

document.getElementById('closeModal').addEventListener('click', () => document.getElementById('bookModal').classList.add('hidden'));

// Reading List
document.getElementById('listToggle').addEventListener('click', () => {
  document.getElementById('listDrawer').style.transform = 'translateX(0)';
  renderReadingList();
});
document.getElementById('closeList').addEventListener('click', () => {
  document.getElementById('listDrawer').style.transform = 'translateX(100%)';
});

function renderReadingList() {
  const items = books.filter(b => readingList.has(b.id));
  document.getElementById('emptyList').style.display = items.length ? 'none' : 'block';
  document.getElementById('readingList').innerHTML = items.map(b => \`
    <div class="list-item"><div class="w-10 h-10 \${b.bg} rounded-lg flex items-center justify-center text-lg">\${b.emoji}</div><div class="flex-1"><p class="text-sm font-medium">\${b.title}</p><p class="text-xs text-canvas-muted">\${b.author}</p></div><button class="text-xs text-primary-400 hover:text-primary-600 remove-btn" data-id="\${b.id}">✕</button></div>
  \`).join('');
}

document.getElementById('readingList').addEventListener('click', e => {
  if (e.target.classList.contains('remove-btn')) {
    readingList.delete(Number(e.target.dataset.id));
    updateListCount();
    renderReadingList();
  }
});

function updateListCount() {
  document.getElementById('listCount').textContent = readingList.size;
}
`,
      },
    ],
  },

  // 29. Virtual Classroom
  {
    name: 'Virtual Classroom',
    icon: '🏫',
    category: 'education',
    description: 'Classroom interface with lecture schedule, student roster, assignment board, and live chat.',
    prompt: 'Build a virtual classroom with a weekly schedule, student roster grid, assignment submission board with due dates, and a live class chat panel.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EduSpace — Virtual Classroom</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-50 font-sans text-gray-800 min-h-screen">
  <nav class="bg-white border-b px-6 py-3 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <span class="text-lg font-bold text-teal-600">🏫 EduSpace</span>
      <span class="text-sm text-canvas-muted">/ CS 101 — Intro to Computer Science</span>
    </div>
    <div class="flex items-center gap-2">
      <span class="w-2 h-2 bg-green-400 rounded-full"></span>
      <span class="text-xs text-canvas-muted">24 students online</span>
    </div>
  </nav>

  <div class="flex min-h-screen">
    <!-- Main Content -->
    <main class="flex-1 p-6">
      <!-- Schedule -->
      <div class="bg-white rounded-xl p-5 border mb-6">
        <h3 class="font-bold text-sm mb-4">📅 This Week's Schedule</h3>
        <div class="grid grid-cols-5 gap-3" id="schedule"></div>
      </div>

      <div class="grid grid-cols-2 gap-6 mb-6">
        <!-- Assignments -->
        <div class="bg-white rounded-xl p-5 border">
          <h3 class="font-bold text-sm mb-4">📋 Assignments</h3>
          <div id="assignments" class="space-y-3"></div>
        </div>

        <!-- Students -->
        <div class="bg-white rounded-xl p-5 border">
          <h3 class="font-bold text-sm mb-4">👥 Class Roster</h3>
          <div class="grid grid-cols-4 gap-3" id="roster"></div>
        </div>
      </div>
    </main>

    <!-- Chat Panel -->
    <aside class="w-80 bg-white border-l flex flex-col">
      <div class="p-4 border-b"><h3 class="font-bold text-sm">💬 Class Chat</h3></div>
      <div id="chatMessages" class="flex-1 p-4 overflow-y-auto space-y-3"></div>
      <div class="p-4 border-t">
        <div class="flex gap-2">
          <input id="chatInput" type="text" placeholder="Type a message..." class="flex-1 px-3 py-2 border rounded-lg text-sm outline-none focus:border-teal-400" />
          <button id="sendBtn" class="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">Send</button>
        </div>
      </div>
    </aside>
  </div>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.schedule-slot { border-radius: 10px; padding: 10px; font-size: 0.75rem; border: 1px solid #e5e7eb; }
.schedule-slot.active { background: #f0fdfa; border-color: #14b8a6; }
.assignment-card { padding: 12px; border: 1px solid #e5e7eb; border-radius: 10px; }
.assignment-card:hover { background: #f9fafb; }
.status-badge { font-size: 0.65rem; padding: 2px 8px; border-radius: 12px; font-weight: 600; }
.student-avatar { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; }
.chat-bubble { max-width: 85%; padding: 8px 12px; border-radius: 12px; font-size: 0.85rem; }
.chat-bubble.other { background: #f3f4f6; border-bottom-left-radius: 4px; }
.chat-bubble.self { background: #14b8a6; color: white; border-bottom-right-radius: 4px; margin-left: auto; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `// Schedule
const schedule = [
  { day: 'Monday', time: '9:00 AM', topic: 'Variables & Types', active: false },
  { day: 'Tuesday', time: '10:30 AM', topic: 'Control Flow', active: true },
  { day: 'Wednesday', time: '9:00 AM', topic: 'Functions', active: false },
  { day: 'Thursday', time: '2:00 PM', topic: 'Lab Session', active: false },
  { day: 'Friday', time: '11:00 AM', topic: 'Review & Q&A', active: false },
];

document.getElementById('schedule').innerHTML = schedule.map(s => \`
  <div class="schedule-slot \${s.active ? 'active' : ''}">
    <p class="font-bold text-xs \${s.active ? 'text-teal-600' : 'text-canvas-muted-deep'}">\${s.day}</p>
    <p class="text-canvas-muted mt-1">\${s.time}</p>
    <p class="font-medium mt-2 \${s.active ? 'text-teal-700' : ''}">\${s.topic}</p>
    \${s.active ? '<span class="inline-block mt-2 text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-bold">Live Now</span>' : ''}
  </div>
\`).join('');

// Assignments
const assignments = [
  { title: 'Hello World Program', due: 'Dec 8', status: 'submitted', color: 'bg-green-100 text-green-700' },
  { title: 'Calculator App', due: 'Dec 12', status: 'in-progress', color: 'bg-yellow-100 text-yellow-700' },
  { title: 'Data Types Essay', due: 'Dec 15', status: 'pending', color: 'bg-gray-100 text-canvas-muted-deep' },
  { title: 'Loop Exercises', due: 'Dec 18', status: 'pending', color: 'bg-gray-100 text-canvas-muted-deep' },
  { title: 'Final Project Proposal', due: 'Dec 22', status: 'pending', color: 'bg-gray-100 text-canvas-muted-deep' },
];

document.getElementById('assignments').innerHTML = assignments.map(a => \`
  <div class="assignment-card">
    <div class="flex items-center justify-between">
      <p class="text-sm font-medium">\${a.title}</p>
      <span class="status-badge \${a.color}">\${a.status}</span>
    </div>
    <p class="text-xs text-canvas-muted mt-1">Due: \${a.due}</p>
  </div>
\`).join('');

// Roster
const students = [
  { name: 'Alice', initials: 'AC', bg: 'bg-blue-100 text-blue-700', online: true },
  { name: 'Bob', initials: 'BK', bg: 'bg-green-100 text-green-700', online: true },
  { name: 'Carol', initials: 'CW', bg: 'bg-pink-100 text-pink-700', online: true },
  { name: 'Dan', initials: 'DM', bg: 'bg-purple-100 text-purple-700', online: false },
  { name: 'Eva', initials: 'ET', bg: 'bg-yellow-100 text-yellow-700', online: true },
  { name: 'Frank', initials: 'FJ', bg: 'bg-red-100 text-primary-700', online: true },
  { name: 'Grace', initials: 'GL', bg: 'bg-indigo-100 text-indigo-700', online: false },
  { name: 'Henry', initials: 'HP', bg: 'bg-teal-100 text-teal-700', online: true },
];

document.getElementById('roster').innerHTML = students.map(s => \`
  <div class="text-center">
    <div class="student-avatar \${s.bg} mx-auto relative">\${s.initials}\${s.online ? '<span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></span>' : ''}</div>
    <p class="text-xs mt-1 font-medium">\${s.name}</p>
  </div>
\`).join('');

// Chat
const chatData = [
  { name: 'Alice', msg: 'Can someone explain recursion again?', self: false },
  { name: 'Bob', msg: 'It\\'s when a function calls itself!', self: false },
  { name: 'You', msg: 'Think of it like Russian nesting dolls 🪆', self: true },
  { name: 'Eva', msg: 'That analogy is perfect!', self: false },
  { name: 'Frank', msg: 'Prof, will recursion be on the final?', self: false },
];

function renderChat() {
  document.getElementById('chatMessages').innerHTML = chatData.map(c => \`
    <div class="\${c.self ? 'text-right' : ''}">
      \${!c.self ? '<p class="text-xs text-canvas-muted mb-1">' + c.name + '</p>' : ''}
      <div class="chat-bubble \${c.self ? 'self' : 'other'}">\${c.msg}</div>
    </div>
  \`).join('');
  document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
}
renderChat();

document.getElementById('sendBtn').addEventListener('click', sendMessage);
document.getElementById('chatInput').addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

function sendMessage() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;
  chatData.push({ name: 'You', msg, self: true });
  input.value = '';
  renderChat();
}
`,
      },
    ],
  },

  // 30. Study Planner
  {
    name: 'Study Planner',
    icon: '📖',
    category: 'education',
    description: 'Study organizer with Pomodoro timer, subject tracking, study streaks, and daily goal setting.',
    prompt: 'Build a study planner with Pomodoro timer, subject-based task list, daily study goals, streak counter, and study session history.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>StudyBuddy — Planner</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gradient-to-br from-violet-50 to-blue-50 font-sans text-gray-800 min-h-screen p-6">
  <div class="max-w-5xl mx-auto">
    <header class="flex items-center justify-between mb-6">
      <div><h1 class="text-xl font-bold text-violet-700">📖 StudyBuddy</h1><p class="text-xs text-canvas-muted">Stay focused, stay ahead</p></div>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border"><span class="text-lg">🔥</span><span class="font-bold text-violet-700" id="streak">7</span><span class="text-xs text-canvas-muted">day streak</span></div>
        <div class="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border"><span class="text-lg">⏱️</span><span class="font-bold" id="totalTime">3h 45m</span><span class="text-xs text-canvas-muted">today</span></div>
      </div>
    </header>

    <div class="grid grid-cols-3 gap-6">
      <!-- Pomodoro Timer -->
      <div class="bg-white rounded-2xl p-6 border text-center">
        <h3 class="font-bold text-sm mb-4">Pomodoro Timer</h3>
        <div class="timer-circle mx-auto mb-4">
          <div class="timer-inner">
            <span class="text-3xl font-bold" id="timerDisplay">25:00</span>
            <span class="text-xs text-canvas-muted" id="timerLabel">Focus Time</span>
          </div>
        </div>
        <div class="flex justify-center gap-2 mb-4">
          <button id="startBtn" class="px-6 py-2 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700">Start</button>
          <button id="resetBtn" class="px-4 py-2 border rounded-xl text-sm font-medium hover:bg-gray-50">Reset</button>
        </div>
        <div class="flex justify-center gap-2">
          <button class="mode-btn active" data-min="25">25m</button>
          <button class="mode-btn" data-min="15">15m</button>
          <button class="mode-btn" data-min="5">5m Break</button>
        </div>
        <div class="mt-4 flex justify-center gap-1" id="pomodoroCount"></div>
      </div>

      <!-- Study Tasks -->
      <div class="bg-white rounded-2xl p-6 border">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-sm">Today's Tasks</h3>
          <button id="addTaskBtn" class="text-xs text-violet-600 font-medium hover:underline">+ Add</button>
        </div>
        <div id="taskList" class="space-y-2"></div>
        <div id="addTaskForm" class="mt-3 hidden">
          <input id="taskInput" type="text" placeholder="Task name..." class="w-full px-3 py-2 border rounded-lg text-sm mb-2 outline-none focus:border-violet-400" />
          <select id="subjectInput" class="w-full px-3 py-2 border rounded-lg text-sm mb-2 outline-none">
            <option>Math</option><option>Science</option><option>English</option><option>History</option><option>Art</option>
          </select>
          <button id="saveTaskBtn" class="w-full py-2 bg-violet-600 text-white rounded-lg text-sm font-bold">Add Task</button>
        </div>
      </div>

      <!-- Daily Goals & History -->
      <div class="space-y-6">
        <div class="bg-white rounded-2xl p-6 border">
          <h3 class="font-bold text-sm mb-4">Daily Goals</h3>
          <div id="goals" class="space-y-3"></div>
        </div>
        <div class="bg-white rounded-2xl p-6 border">
          <h3 class="font-bold text-sm mb-4">This Week</h3>
          <div id="weekChart" class="flex items-end gap-2 justify-center" style="height:100px"></div>
        </div>
      </div>
    </div>
  </div>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.timer-circle { width: 180px; height: 180px; border-radius: 50%; background: conic-gradient(#7c3aed var(--progress, 0%), #ede9fe var(--progress, 0%)); display: flex; align-items: center; justify-content: center; }
.timer-inner { width: 150px; height: 150px; border-radius: 50%; background: white; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.mode-btn { padding: 4px 12px; font-size: 0.7rem; border-radius: 8px; border: 1px solid #e5e7eb; cursor: pointer; background: white; font-weight: 500; }
.mode-btn.active { background: #7c3aed; color: white; border-color: #7c3aed; }
.task-item { display: flex; align-items: center; gap: 8px; padding: 10px; border-radius: 8px; border: 1px solid #f3f4f6; font-size: 0.85rem; }
.task-item:hover { background: #f9fafb; }
.task-check { width: 18px; height: 18px; border-radius: 50%; border: 2px solid #d1d5db; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.task-check.done { background: #7c3aed; border-color: #7c3aed; color: white; font-size: 10px; }
.subject-badge { font-size: 0.6rem; padding: 1px 6px; border-radius: 8px; font-weight: 600; }
.goal-bar { height: 6px; border-radius: 999px; background: #ede9fe; overflow: hidden; }
.goal-fill { height: 100%; border-radius: 999px; background: #7c3aed; transition: width 0.4s; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `// Pomodoro Timer
let timeLeft = 25 * 60, totalTime = 25 * 60, running = false, interval = null, pomodorosCompleted = 3;

function updateDisplay() {
  const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const s = (timeLeft % 60).toString().padStart(2, '0');
  document.getElementById('timerDisplay').textContent = m + ':' + s;
  const pct = ((totalTime - timeLeft) / totalTime) * 100;
  document.querySelector('.timer-circle').style.setProperty('--progress', pct + '%');
}

document.getElementById('startBtn').addEventListener('click', () => {
  if (running) { clearInterval(interval); running = false; document.getElementById('startBtn').textContent = 'Resume'; return; }
  running = true;
  document.getElementById('startBtn').textContent = 'Pause';
  interval = setInterval(() => {
    timeLeft--;
    updateDisplay();
    if (timeLeft <= 0) { clearInterval(interval); running = false; pomodorosCompleted++; renderPomodoros(); document.getElementById('startBtn').textContent = 'Start'; }
  }, 1000);
});

document.getElementById('resetBtn').addEventListener('click', () => {
  clearInterval(interval); running = false;
  timeLeft = totalTime;
  document.getElementById('startBtn').textContent = 'Start';
  updateDisplay();
});

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    clearInterval(interval); running = false;
    totalTime = Number(btn.dataset.min) * 60;
    timeLeft = totalTime;
    document.getElementById('startBtn').textContent = 'Start';
    document.getElementById('timerLabel').textContent = btn.dataset.min === '5' ? 'Break Time' : 'Focus Time';
    updateDisplay();
  });
});

function renderPomodoros() {
  document.getElementById('pomodoroCount').innerHTML = Array.from({length: 8}, (_, i) =>
    \`<div class="w-3 h-3 rounded-full \${i < pomodorosCompleted ? 'bg-violet-500' : 'bg-violet-100'}"></div>\`
  ).join('');
}
renderPomodoros();
updateDisplay();

// Tasks
const subjectColors = { Math: 'bg-blue-100 text-blue-700', Science: 'bg-green-100 text-green-700', English: 'bg-pink-100 text-pink-700', History: 'bg-yellow-100 text-yellow-700', Art: 'bg-purple-100 text-purple-700' };
let tasks = [
  { text: 'Complete calculus problem set', subject: 'Math', done: true },
  { text: 'Read chapter 5 — Thermodynamics', subject: 'Science', done: false },
  { text: 'Essay outline — Shakespeare', subject: 'English', done: false },
  { text: 'Review WWII timeline', subject: 'History', done: false },
  { text: 'Sketch still life drawing', subject: 'Art', done: false },
];

function renderTasks() {
  document.getElementById('taskList').innerHTML = tasks.map((t, i) => \`
    <div class="task-item \${t.done ? 'opacity-50' : ''}">
      <div class="task-check \${t.done ? 'done' : ''}" data-idx="\${i}">\${t.done ? '✓' : ''}</div>
      <div class="flex-1"><p class="\${t.done ? 'line-through text-canvas-muted' : ''}">\${t.text}</p></div>
      <span class="subject-badge \${subjectColors[t.subject] || 'bg-gray-100 text-gray-600'}">\${t.subject}</span>
    </div>
  \`).join('');
}
renderTasks();

document.getElementById('taskList').addEventListener('click', e => {
  const check = e.target.closest('.task-check');
  if (check) { tasks[check.dataset.idx].done = !tasks[check.dataset.idx].done; renderTasks(); updateGoals(); }
});

document.getElementById('addTaskBtn').addEventListener('click', () => document.getElementById('addTaskForm').classList.toggle('hidden'));
document.getElementById('saveTaskBtn').addEventListener('click', () => {
  const text = document.getElementById('taskInput').value.trim();
  if (!text) return;
  tasks.push({ text, subject: document.getElementById('subjectInput').value, done: false });
  document.getElementById('taskInput').value = '';
  document.getElementById('addTaskForm').classList.add('hidden');
  renderTasks();
});

// Goals
const goals = [
  { label: 'Study 4 hours', current: 3.75, target: 4 },
  { label: 'Complete 5 tasks', current: 1, target: 5 },
  { label: '6 Pomodoros', current: 3, target: 6 },
];

function updateGoals() {
  goals[1].current = tasks.filter(t => t.done).length;
  goals[2].current = pomodorosCompleted;
  document.getElementById('goals').innerHTML = goals.map(g => {
    const pct = Math.min(100, Math.round((g.current / g.target) * 100));
    return \`<div><div class="flex justify-between text-xs mb-1"><span>\${g.label}</span><span class="font-bold text-violet-600">\${pct}%</span></div><div class="goal-bar"><div class="goal-fill" style="width:\${pct}%"></div></div></div>\`;
  }).join('');
}
updateGoals();

// Week chart
const weekData = [
  { day: 'Mon', hours: 2.5 }, { day: 'Tue', hours: 3.2 }, { day: 'Wed', hours: 1.8 },
  { day: 'Thu', hours: 4.0 }, { day: 'Fri', hours: 3.5 }, { day: 'Sat', hours: 2.0 }, { day: 'Sun', hours: 3.75 },
];
const maxH = Math.max(...weekData.map(d => d.hours));
document.getElementById('weekChart').innerHTML = weekData.map(d => \`
  <div class="flex flex-col items-center gap-1 flex-1">
    <span class="text-xs font-bold text-violet-600">\${d.hours}h</span>
    <div class="w-full rounded-t-lg bg-violet-200 transition-all" style="height:\${(d.hours / maxH) * 80}px"><div class="w-full h-full rounded-t-lg bg-violet-500" style="opacity:\${d.day === 'Sun' ? 1 : 0.6}"></div></div>
    <span class="text-xs text-canvas-muted">\${d.day}</span>
  </div>
\`).join('');
`,
      },
    ],
  },

  // 31. Fitness Tracker
  {
    name: 'Fitness Tracker',
    icon: '💪',
    category: 'health',
    description: 'Workout tracker with exercise log, calorie counter, progress rings, and weekly activity chart.',
    prompt: 'Build a fitness tracker dashboard with daily activity rings, exercise log, calorie intake tracker, weekly workout chart, and personal records.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FitPulse — Fitness Tracker</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-900 text-white font-sans min-h-screen p-6">
  <div class="max-w-5xl mx-auto">
    <header class="flex items-center justify-between mb-6">
      <div><h1 class="text-xl font-bold">💪 FitPulse</h1><p class="text-xs text-canvas-muted-deep">Tuesday, Dec 10, 2024</p></div>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center text-sm font-bold">JD</div>
      </div>
    </header>

    <!-- Activity Rings -->
    <div class="grid grid-cols-4 gap-4 mb-6">
      <div class="card p-5 text-center">
        <svg viewBox="0 0 120 120" class="w-20 h-20 mx-auto mb-3"><circle cx="60" cy="60" r="50" fill="none" stroke="#1f2937" stroke-width="10"/><circle cx="60" cy="60" r="50" fill="none" stroke="#ef4444" stroke-width="10" stroke-dasharray="314" stroke-dashoffset="63" stroke-linecap="round" transform="rotate(-90 60 60)"/><text x="60" y="65" text-anchor="middle" fill="white" font-size="18" font-weight="bold">80%</text></svg>
        <p class="text-sm font-medium text-primary-400">Calories</p><p class="text-xs text-canvas-muted-deep">1,640 / 2,050</p>
      </div>
      <div class="card p-5 text-center">
        <svg viewBox="0 0 120 120" class="w-20 h-20 mx-auto mb-3"><circle cx="60" cy="60" r="50" fill="none" stroke="#1f2937" stroke-width="10"/><circle cx="60" cy="60" r="50" fill="none" stroke="#22c55e" stroke-width="10" stroke-dasharray="314" stroke-dashoffset="94" stroke-linecap="round" transform="rotate(-90 60 60)"/><text x="60" y="65" text-anchor="middle" fill="white" font-size="18" font-weight="bold">70%</text></svg>
        <p class="text-sm font-medium text-green-400">Exercise</p><p class="text-xs text-canvas-muted-deep">42 / 60 min</p>
      </div>
      <div class="card p-5 text-center">
        <svg viewBox="0 0 120 120" class="w-20 h-20 mx-auto mb-3"><circle cx="60" cy="60" r="50" fill="none" stroke="#1f2937" stroke-width="10"/><circle cx="60" cy="60" r="50" fill="none" stroke="#3b82f6" stroke-width="10" stroke-dasharray="314" stroke-dashoffset="47" stroke-linecap="round" transform="rotate(-90 60 60)"/><text x="60" y="65" text-anchor="middle" fill="white" font-size="18" font-weight="bold">85%</text></svg>
        <p class="text-sm font-medium text-blue-400">Steps</p><p class="text-xs text-canvas-muted-deep">8,520 / 10,000</p>
      </div>
      <div class="card p-5 text-center">
        <svg viewBox="0 0 120 120" class="w-20 h-20 mx-auto mb-3"><circle cx="60" cy="60" r="50" fill="none" stroke="#1f2937" stroke-width="10"/><circle cx="60" cy="60" r="50" fill="none" stroke="#a855f7" stroke-width="10" stroke-dasharray="314" stroke-dashoffset="126" stroke-linecap="round" transform="rotate(-90 60 60)"/><text x="60" y="65" text-anchor="middle" fill="white" font-size="18" font-weight="bold">60%</text></svg>
        <p class="text-sm font-medium text-purple-400">Water</p><p class="text-xs text-canvas-muted-deep">1.5 / 2.5 L</p>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-6 mb-6">
      <!-- Workout Log -->
      <div class="col-span-2 card p-5">
        <h3 class="font-bold text-sm mb-4">Today's Workout</h3>
        <div id="workouts" class="space-y-2"></div>
        <button id="addWorkout" class="mt-3 w-full py-2 border border-gray-700 rounded-lg text-sm text-canvas-muted hover:border-green-500 hover:text-green-400">+ Add Exercise</button>
      </div>

      <!-- Personal Records -->
      <div class="card p-5">
        <h3 class="font-bold text-sm mb-4">🏆 Personal Records</h3>
        <div id="records" class="space-y-3"></div>
      </div>
    </div>

    <!-- Weekly Chart -->
    <div class="card p-5">
      <h3 class="font-bold text-sm mb-4">Weekly Activity</h3>
      <canvas id="weekChart" height="160"></canvas>
    </div>
  </div>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.card { background: #111827; border: 1px solid #1f2937; border-radius: 16px; }
canvas { width: 100% !important; }
.workout-row { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; background: #1f2937; }
.workout-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
.record-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-radius: 10px; background: #1f2937; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const workouts = [
  { name: 'Bench Press', icon: '🏋️', sets: '4 × 10', weight: '135 lbs', cal: 120, bg: 'bg-primary-900' },
  { name: 'Squats', icon: '🦵', sets: '4 × 8', weight: '185 lbs', cal: 150, bg: 'bg-blue-900' },
  { name: 'Running', icon: '🏃', sets: '30 min', weight: '5.2 mi', cal: 340, bg: 'bg-green-900' },
  { name: 'Pull-ups', icon: '💪', sets: '3 × 12', weight: 'Body', cal: 90, bg: 'bg-purple-900' },
  { name: 'Plank', icon: '🧘', sets: '3 × 60s', weight: '—', cal: 45, bg: 'bg-yellow-900' },
];

document.getElementById('workouts').innerHTML = workouts.map(w => \`
  <div class="workout-row">
    <div class="workout-icon \${w.bg}">\${w.icon}</div>
    <div class="flex-1"><p class="text-sm font-medium">\${w.name}</p><p class="text-xs text-canvas-muted-deep">\${w.sets} · \${w.weight}</p></div>
    <span class="text-xs text-orange-400 font-bold">\${w.cal} cal</span>
  </div>
\`).join('');

// Records
const records = [
  { name: 'Bench Press', value: '225 lbs', icon: '🏋️' },
  { name: '5K Run', value: '22:34', icon: '🏃' },
  { name: 'Deadlift', value: '315 lbs', icon: '💪' },
  { name: 'Plank Hold', value: '3:45', icon: '🧘' },
];
document.getElementById('records').innerHTML = records.map(r => \`
  <div class="record-item"><div class="flex items-center gap-2"><span>\${r.icon}</span><span class="text-sm">\${r.name}</span></div><span class="text-sm font-bold text-yellow-400">\${r.value}</span></div>
\`).join('');

// Weekly chart
const canvas = document.getElementById('weekChart');
const ctx = canvas.getContext('2d');
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const calories = [1800, 2200, 1600, 2400, 1900, 2100, 1640];
const steps = [8200, 12400, 6800, 15200, 9100, 11300, 8520];

function drawChart() {
  const w = canvas.width = canvas.parentElement.clientWidth - 40;
  const h = canvas.height = 140;
  ctx.clearRect(0, 0, w, h);
  const barW = 20, gap = w / 7, maxCal = 3000;

  days.forEach((d, i) => {
    const x = 20 + i * gap;
    const calH = (calories[i] / maxCal) * (h - 30);
    const stepH = (steps[i] / 20000) * (h - 30);
    ctx.fillStyle = '#22c55e'; ctx.fillRect(x, h - 20 - calH, barW, calH);
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(x + barW + 4, h - 20 - stepH, barW, stepH);
    ctx.fillStyle = '#6b7280'; ctx.font = '10px sans-serif'; ctx.fillText(d, x + 8, h - 4);
  });

  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#22c55e'; ctx.fillRect(w - 140, 4, 10, 10); ctx.fillStyle = '#9ca3af'; ctx.fillText('Calories', w - 126, 13);
  ctx.fillStyle = '#3b82f6'; ctx.fillRect(w - 60, 4, 10, 10); ctx.fillStyle = '#9ca3af'; ctx.fillText('Steps', w - 46, 13);
}
drawChart();

document.getElementById('addWorkout').addEventListener('click', () => alert('Add workout form would appear here'));
`,
      },
    ],
  },

  // 32. Medical Portal
  {
    name: 'Medical Portal',
    icon: '🏥',
    category: 'health',
    description: 'Healthcare portal with appointment booking, doctor profiles, medical records, and prescription tracker.',
    prompt: 'Build a medical portal with doctor listing, appointment scheduler, patient records view, prescription list, and upcoming appointments.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MedCare — Patient Portal</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-blue-50 font-sans text-gray-800 min-h-screen">
  <nav class="bg-white border-b px-6 py-3 flex items-center justify-between sticky top-0 z-20">
    <h1 class="text-lg font-bold text-blue-600">🏥 MedCare</h1>
    <div class="flex items-center gap-3">
      <span class="text-xs text-canvas-muted">Welcome, Sarah</span>
      <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700">SM</div>
    </div>
  </nav>

  <main class="max-w-6xl mx-auto p-6">
    <!-- Quick Stats -->
    <div class="grid grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-xl p-4 border"><p class="text-xs text-canvas-muted">Next Appointment</p><p class="text-sm font-bold mt-1">Dec 15, 10:00 AM</p><p class="text-xs text-blue-500">Dr. Williams</p></div>
      <div class="bg-white rounded-xl p-4 border"><p class="text-xs text-canvas-muted">Active Prescriptions</p><p class="text-xl font-bold mt-1">3</p><p class="text-xs text-green-500">All up to date</p></div>
      <div class="bg-white rounded-xl p-4 border"><p class="text-xs text-canvas-muted">Lab Results</p><p class="text-xl font-bold mt-1">2 New</p><p class="text-xs text-yellow-500">Pending review</p></div>
      <div class="bg-white rounded-xl p-4 border"><p class="text-xs text-canvas-muted">Messages</p><p class="text-xl font-bold mt-1">1</p><p class="text-xs text-blue-500">From Dr. Patel</p></div>
    </div>

    <div class="grid grid-cols-3 gap-6 mb-6">
      <!-- Doctors -->
      <div class="col-span-2 bg-white rounded-xl p-5 border">
        <h3 class="font-bold text-sm mb-4">🩺 Find a Doctor</h3>
        <div class="flex gap-2 mb-4" id="specFilters"></div>
        <div id="doctorGrid" class="grid grid-cols-2 gap-3"></div>
      </div>

      <!-- Appointments -->
      <div class="bg-white rounded-xl p-5 border">
        <h3 class="font-bold text-sm mb-4">📅 Upcoming Appointments</h3>
        <div id="appointments" class="space-y-3"></div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-6">
      <!-- Prescriptions -->
      <div class="bg-white rounded-xl p-5 border">
        <h3 class="font-bold text-sm mb-4">💊 Active Prescriptions</h3>
        <div id="prescriptions" class="space-y-3"></div>
      </div>

      <!-- Records -->
      <div class="bg-white rounded-xl p-5 border">
        <h3 class="font-bold text-sm mb-4">📋 Recent Records</h3>
        <div id="records" class="space-y-3"></div>
      </div>
    </div>
  </main>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.spec-btn { padding: 5px 12px; font-size: 0.7rem; border-radius: 16px; border: 1px solid #e5e7eb; cursor: pointer; background: white; font-weight: 500; }
.spec-btn.active { background: #2563eb; color: white; border-color: #2563eb; }
.doctor-card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; cursor: pointer; transition: all 0.15s; }
.doctor-card:hover { border-color: #3b82f6; background: #eff6ff; }
.appt-item { padding: 12px; border-radius: 10px; border: 1px solid #e5e7eb; }
.rx-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 10px; border: 1px solid #e5e7eb; }
.record-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 10px; border: 1px solid #e5e7eb; cursor: pointer; }
.record-item:hover { background: #f9fafb; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const doctors = [
  { name: 'Dr. Sarah Williams', spec: 'Cardiology', rating: 4.9, avail: 'Mon, Wed, Fri', avatar: 'SW', bg: 'bg-red-100 text-primary-700' },
  { name: 'Dr. James Patel', spec: 'Dermatology', rating: 4.7, avail: 'Tue, Thu', avatar: 'JP', bg: 'bg-blue-100 text-blue-700' },
  { name: 'Dr. Emily Chen', spec: 'Pediatrics', rating: 4.8, avail: 'Mon-Fri', avatar: 'EC', bg: 'bg-green-100 text-green-700' },
  { name: 'Dr. Michael Brown', spec: 'Orthopedics', rating: 4.6, avail: 'Wed, Fri', avatar: 'MB', bg: 'bg-purple-100 text-purple-700' },
  { name: 'Dr. Lisa Torres', spec: 'Cardiology', rating: 4.8, avail: 'Tue, Thu, Sat', avatar: 'LT', bg: 'bg-pink-100 text-pink-700' },
  { name: 'Dr. David Kim', spec: 'Dermatology', rating: 4.5, avail: 'Mon, Wed', avatar: 'DK', bg: 'bg-yellow-100 text-yellow-700' },
];

const specs = ['All', ...new Set(doctors.map(d => d.spec))];
let activeSpec = 'All';

function renderFilters() {
  document.getElementById('specFilters').innerHTML = specs.map(s =>
    \`<button class="spec-btn \${s === activeSpec ? 'active' : ''}" data-spec="\${s}">\${s}</button>\`
  ).join('');
}
renderFilters();

document.getElementById('specFilters').addEventListener('click', e => {
  if (!e.target.dataset.spec) return;
  activeSpec = e.target.dataset.spec;
  renderFilters(); renderDoctors();
});

function renderDoctors() {
  const filtered = activeSpec === 'All' ? doctors : doctors.filter(d => d.spec === activeSpec);
  document.getElementById('doctorGrid').innerHTML = filtered.map(d => \`
    <div class="doctor-card">
      <div class="flex items-center gap-3 mb-2"><div class="w-10 h-10 \${d.bg} rounded-full flex items-center justify-center text-sm font-bold">\${d.avatar}</div><div><p class="text-sm font-semibold">\${d.name}</p><p class="text-xs text-canvas-muted">\${d.spec}</p></div></div>
      <div class="flex items-center justify-between"><span class="text-xs text-yellow-500">⭐ \${d.rating}</span><span class="text-xs text-canvas-muted">\${d.avail}</span></div>
      <button class="mt-2 w-full py-1.5 bg-blue-600 text-white text-xs rounded-lg font-medium hover:bg-blue-700">Book Appointment</button>
    </div>
  \`).join('');
}
renderDoctors();

// Appointments
const appts = [
  { doctor: 'Dr. Williams', type: 'Cardiology Check-up', date: 'Dec 15', time: '10:00 AM', status: 'Confirmed', color: 'text-green-600 bg-green-50' },
  { doctor: 'Dr. Patel', type: 'Skin Consultation', date: 'Dec 18', time: '2:30 PM', status: 'Pending', color: 'text-yellow-600 bg-yellow-50' },
  { doctor: 'Dr. Chen', type: 'Annual Physical', date: 'Jan 5', time: '9:00 AM', status: 'Scheduled', color: 'text-blue-600 bg-blue-50' },
];
document.getElementById('appointments').innerHTML = appts.map(a => \`
  <div class="appt-item">
    <div class="flex justify-between mb-1"><p class="text-sm font-medium">\${a.type}</p><span class="text-xs px-2 py-0.5 rounded-full font-medium \${a.color}">\${a.status}</span></div>
    <p class="text-xs text-canvas-muted">\${a.doctor} · \${a.date} at \${a.time}</p>
  </div>
\`).join('');

// Prescriptions
const rxs = [
  { name: 'Lisinopril 10mg', dosage: '1 tablet daily', refills: 3, icon: '💊', color: 'bg-blue-50' },
  { name: 'Atorvastatin 20mg', dosage: '1 tablet at bedtime', refills: 2, icon: '💊', color: 'bg-green-50' },
  { name: 'Metformin 500mg', dosage: '2 tablets with meals', refills: 5, icon: '💊', color: 'bg-purple-50' },
];
document.getElementById('prescriptions').innerHTML = rxs.map(r => \`
  <div class="rx-item"><div class="w-10 h-10 \${r.color} rounded-lg flex items-center justify-center text-lg">\${r.icon}</div><div class="flex-1"><p class="text-sm font-medium">\${r.name}</p><p class="text-xs text-canvas-muted">\${r.dosage}</p></div><span class="text-xs text-canvas-muted">\${r.refills} refills</span></div>
\`).join('');

// Records
const recs = [
  { title: 'Blood Test Results', date: 'Dec 8, 2024', type: 'Lab Work', icon: '🔬' },
  { title: 'Chest X-Ray', date: 'Nov 22, 2024', type: 'Imaging', icon: '📷' },
  { title: 'ECG Report', date: 'Nov 15, 2024', type: 'Cardiology', icon: '❤️' },
  { title: 'Annual Physical Summary', date: 'Oct 5, 2024', type: 'General', icon: '📋' },
];
document.getElementById('records').innerHTML = recs.map(r => \`
  <div class="record-item"><span class="text-xl">\${r.icon}</span><div class="flex-1"><p class="text-sm font-medium">\${r.title}</p><p class="text-xs text-canvas-muted">\${r.type} · \${r.date}</p></div><span class="text-xs text-blue-500 font-medium">View →</span></div>
\`).join('');
`,
      },
    ],
  },

  // 33. Wellness App
  {
    name: 'Wellness App',
    icon: '🧘',
    category: 'health',
    description: 'Mindfulness app with meditation timer, mood tracker, breathing exercises, and wellness journal.',
    prompt: 'Build a wellness app with guided meditation timer, mood logging with emoji picker, breathing exercise animation, daily affirmations, and a wellness journal.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ZenFlow — Wellness</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gradient-to-br from-emerald-50 to-teal-50 font-sans text-gray-800 min-h-screen p-6">
  <div class="max-w-4xl mx-auto">
    <header class="text-center mb-8">
      <h1 class="text-2xl font-bold text-teal-700">🧘 ZenFlow</h1>
      <p class="text-sm text-canvas-muted mt-1">Good morning, Sarah. Take a deep breath.</p>
    </header>

    <!-- Daily Affirmation -->
    <div class="bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl p-6 text-white text-center mb-6">
      <p class="text-xs uppercase tracking-wider opacity-80 mb-2">Today's Affirmation</p>
      <p class="text-lg font-medium italic" id="affirmation">"I am calm, centered, and filled with positive energy."</p>
    </div>

    <div class="grid grid-cols-3 gap-6 mb-6">
      <!-- Breathing Exercise -->
      <div class="bg-white rounded-2xl p-6 border text-center">
        <h3 class="font-bold text-sm mb-4">🌬️ Breathing Exercise</h3>
        <div class="breath-circle mx-auto mb-4" id="breathCircle">
          <span class="text-sm font-medium text-teal-600" id="breathText">Tap to Start</span>
        </div>
        <button id="breathBtn" class="px-6 py-2 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-700">Start</button>
        <p class="text-xs text-canvas-muted mt-2">4-7-8 Breathing Technique</p>
      </div>

      <!-- Meditation Timer -->
      <div class="bg-white rounded-2xl p-6 border text-center">
        <h3 class="font-bold text-sm mb-4">🕯️ Meditation</h3>
        <p class="text-4xl font-bold text-teal-700 mb-4" id="medTimer">05:00</p>
        <div class="flex justify-center gap-2 mb-4">
          <button class="med-btn active" data-min="5">5m</button>
          <button class="med-btn" data-min="10">10m</button>
          <button class="med-btn" data-min="15">15m</button>
        </div>
        <button id="medStart" class="px-6 py-2 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-700">Begin</button>
        <p class="text-xs text-canvas-muted mt-2" id="medCount">Sessions today: 1</p>
      </div>

      <!-- Mood Tracker -->
      <div class="bg-white rounded-2xl p-6 border">
        <h3 class="font-bold text-sm mb-4">😊 How are you feeling?</h3>
        <div class="grid grid-cols-5 gap-2 mb-4" id="moods"></div>
        <p class="text-xs text-canvas-muted text-center" id="moodLabel">Select your mood</p>
        <div class="mt-4"><p class="text-xs text-canvas-muted mb-2">This week:</p><div class="flex gap-1" id="moodHistory"></div></div>
      </div>
    </div>

    <!-- Journal -->
    <div class="bg-white rounded-2xl p-6 border">
      <h3 class="font-bold text-sm mb-4">📝 Wellness Journal</h3>
      <textarea id="journal" rows="3" placeholder="What's on your mind today? Write freely..." class="w-full px-4 py-3 border rounded-xl text-sm outline-none resize-none focus:border-teal-400"></textarea>
      <div class="flex items-center justify-between mt-3">
        <span class="text-xs text-canvas-muted" id="charCount">0 characters</span>
        <button id="saveJournal" class="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">Save Entry</button>
      </div>
      <div id="entries" class="mt-4 space-y-2"></div>
    </div>
  </div>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.breath-circle { width: 120px; height: 120px; border-radius: 50%; background: #ccfbf1; display: flex; align-items: center; justify-content: center; transition: transform 4s ease-in-out; }
.breath-circle.inhale { transform: scale(1.4); background: #99f6e4; }
.breath-circle.exhale { transform: scale(0.8); background: #ccfbf1; }
.med-btn { padding: 4px 14px; font-size: 0.75rem; border-radius: 8px; border: 1px solid #e5e7eb; cursor: pointer; background: white; font-weight: 500; }
.med-btn.active { background: #0d9488; color: white; border-color: #0d9488; }
.mood-btn { width: 44px; height: 44px; border-radius: 12px; border: 2px solid transparent; cursor: pointer; font-size: 1.4rem; display: flex; align-items: center; justify-content: center; transition: all 0.2s; background: #f9fafb; }
.mood-btn:hover { transform: scale(1.15); }
.mood-btn.selected { border-color: #0d9488; background: #ccfbf1; transform: scale(1.15); }
.mood-dot { width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; }
.entry-card { padding: 10px 14px; border-radius: 10px; border: 1px solid #e5e7eb; font-size: 0.85rem; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `// Affirmations
const affirmations = [
  'I am calm, centered, and filled with positive energy.',
  'Every breath I take fills me with peace and clarity.',
  'I choose happiness and gratitude in this moment.',
  'I am worthy of love, rest, and inner peace.',
  'My mind is clear, my heart is open, my spirit is free.',
];
document.getElementById('affirmation').textContent = '"' + affirmations[Math.floor(Math.random() * affirmations.length)] + '"';

// Breathing
let breathRunning = false, breathInterval;
const phases = [
  { text: 'Breathe In...', duration: 4000, cls: 'inhale' },
  { text: 'Hold...', duration: 7000, cls: 'inhale' },
  { text: 'Breathe Out...', duration: 8000, cls: 'exhale' },
];

document.getElementById('breathBtn').addEventListener('click', () => {
  if (breathRunning) { clearInterval(breathInterval); breathRunning = false; document.getElementById('breathBtn').textContent = 'Start'; document.getElementById('breathText').textContent = 'Tap to Start'; document.getElementById('breathCircle').className = 'breath-circle mx-auto mb-4'; return; }
  breathRunning = true;
  document.getElementById('breathBtn').textContent = 'Stop';
  let phase = 0;
  function cycle() {
    const p = phases[phase % 3];
    document.getElementById('breathText').textContent = p.text;
    document.getElementById('breathCircle').className = 'breath-circle mx-auto mb-4 ' + p.cls;
    phase++;
    breathInterval = setTimeout(cycle, p.duration);
  }
  cycle();
});

// Meditation
let medTime = 300, medRunning = false, medInterval;
document.querySelectorAll('.med-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (medRunning) return;
    document.querySelectorAll('.med-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    medTime = Number(btn.dataset.min) * 60;
    updateMedDisplay();
  });
});

function updateMedDisplay() {
  const m = Math.floor(medTime / 60).toString().padStart(2, '0');
  const s = (medTime % 60).toString().padStart(2, '0');
  document.getElementById('medTimer').textContent = m + ':' + s;
}
updateMedDisplay();

document.getElementById('medStart').addEventListener('click', () => {
  if (medRunning) { clearInterval(medInterval); medRunning = false; document.getElementById('medStart').textContent = 'Begin'; return; }
  medRunning = true;
  document.getElementById('medStart').textContent = 'Pause';
  medInterval = setInterval(() => {
    medTime--;
    updateMedDisplay();
    if (medTime <= 0) { clearInterval(medInterval); medRunning = false; document.getElementById('medStart').textContent = 'Begin'; alert('🔔 Meditation complete! Great job.'); }
  }, 1000);
});

// Mood Tracker
const moods = [
  { emoji: '😢', label: 'Sad', color: '#93c5fd' },
  { emoji: '😰', label: 'Anxious', color: '#fda4af' },
  { emoji: '😐', label: 'Neutral', color: '#d1d5db' },
  { emoji: '😊', label: 'Happy', color: '#86efac' },
  { emoji: '🤩', label: 'Amazing', color: '#fde047' },
];

document.getElementById('moods').innerHTML = moods.map((m, i) =>
  \`<button class="mood-btn" data-idx="\${i}" title="\${m.label}">\${m.emoji}</button>\`
).join('');

document.getElementById('moods').addEventListener('click', e => {
  const btn = e.target.closest('.mood-btn');
  if (!btn) return;
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  document.getElementById('moodLabel').textContent = moods[btn.dataset.idx].label;
});

// Week mood history
const weekMoods = [4, 3, 2, 4, 3, 4, null];
document.getElementById('moodHistory').innerHTML = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => \`
  <div class="text-center flex-1"><div class="mood-dot mx-auto" style="background:\${weekMoods[i] !== null ? moods[weekMoods[i]].color : '#f3f4f6'}">\${weekMoods[i] !== null ? moods[weekMoods[i]].emoji : '?'}</div><p class="text-xs text-canvas-muted mt-1">\${d}</p></div>
\`).join('');

// Journal
const entries = [];
document.getElementById('journal').addEventListener('input', e => {
  document.getElementById('charCount').textContent = e.target.value.length + ' characters';
});

document.getElementById('saveJournal').addEventListener('click', () => {
  const text = document.getElementById('journal').value.trim();
  if (!text) return;
  entries.unshift({ text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
  document.getElementById('journal').value = '';
  document.getElementById('charCount').textContent = '0 characters';
  document.getElementById('entries').innerHTML = entries.map(e =>
    \`<div class="entry-card"><p>\${e.text}</p><p class="text-xs text-canvas-muted mt-1">\${e.time}</p></div>\`
  ).join('');
});
`,
      },
    ],
  },

  // 34. Nutrition Planner
  {
    name: 'Nutrition Planner',
    icon: '🥗',
    category: 'health',
    description: 'Meal planner with calorie tracking, macro breakdown, meal logging, and weekly nutrition chart.',
    prompt: 'Build a nutrition planner with daily meal log, calorie counter with macro breakdown donut chart, meal suggestions, and a weekly calorie trend line chart.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NutriPlan — Nutrition Planner</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-orange-50 font-sans text-gray-800 min-h-screen p-6">
  <div class="max-w-5xl mx-auto">
    <header class="flex items-center justify-between mb-6">
      <div><h1 class="text-xl font-bold text-orange-600">🥗 NutriPlan</h1><p class="text-xs text-canvas-muted">Tuesday, Dec 10, 2024</p></div>
      <div class="flex items-center gap-3 text-sm">
        <span class="bg-white px-3 py-1.5 rounded-lg border font-bold text-orange-600">1,840 / 2,200 cal</span>
      </div>
    </header>

    <div class="grid grid-cols-3 gap-6 mb-6">
      <!-- Macro Donut -->
      <div class="bg-white rounded-2xl p-5 border text-center">
        <h3 class="font-bold text-sm mb-3">Macro Breakdown</h3>
        <canvas id="macroChart" width="170" height="170"></canvas>
        <div class="grid grid-cols-3 gap-2 mt-4 text-xs">
          <div><span class="inline-block w-2 h-2 rounded-full bg-blue-500"></span> Protein<br><b>120g</b></div>
          <div><span class="inline-block w-2 h-2 rounded-full bg-yellow-400"></span> Carbs<br><b>210g</b></div>
          <div><span class="inline-block w-2 h-2 rounded-full bg-primary-400"></span> Fat<br><b>65g</b></div>
        </div>
      </div>

      <!-- Meal Log -->
      <div class="col-span-2 bg-white rounded-2xl p-5 border">
        <h3 class="font-bold text-sm mb-4">Today's Meals</h3>
        <div id="mealLog" class="space-y-3"></div>
        <button id="addMealBtn" class="mt-3 w-full py-2 border border-dashed border-gray-300 rounded-xl text-sm text-canvas-muted hover:border-orange-400 hover:text-orange-500">+ Log a Meal</button>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-6 mb-6">
      <!-- Weekly Trend -->
      <div class="bg-white rounded-2xl p-5 border">
        <h3 class="font-bold text-sm mb-4">Weekly Calorie Trend</h3>
        <canvas id="weekChart" height="150"></canvas>
      </div>

      <!-- Meal Ideas -->
      <div class="bg-white rounded-2xl p-5 border">
        <h3 class="font-bold text-sm mb-4">💡 Meal Suggestions</h3>
        <div id="suggestions" class="space-y-3"></div>
      </div>
    </div>

    <!-- Water Tracker -->
    <div class="bg-white rounded-2xl p-5 border">
      <h3 class="font-bold text-sm mb-3">💧 Water Intake</h3>
      <div class="flex items-center gap-4">
        <div class="flex gap-2" id="waterGlasses"></div>
        <span class="text-sm text-canvas-muted" id="waterCount">0 / 8 glasses</span>
      </div>
    </div>
  </div>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `canvas { width: 100% !important; }
.meal-card { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 12px; border: 1px solid #f3f4f6; }
.meal-card:hover { background: #fff7ed; }
.meal-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
.suggestion-card { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 10px; border: 1px solid #f3f4f6; cursor: pointer; }
.suggestion-card:hover { background: #fff7ed; border-color: #fb923c; }
.water-glass { width: 32px; height: 40px; border-radius: 4px 4px 8px 8px; border: 2px solid #d1d5db; cursor: pointer; transition: all 0.2s; display: flex; align-items: flex-end; overflow: hidden; }
.water-glass.filled { border-color: #3b82f6; }
.water-glass .fill { width: 100%; background: #93c5fd; transition: height 0.3s; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `// Macro donut chart
const mc = document.getElementById('macroChart');
const mctx = mc.getContext('2d');
const macros = [
  { label: 'Protein', value: 120, cal: 480, color: '#3b82f6' },
  { label: 'Carbs', value: 210, cal: 840, color: '#facc15' },
  { label: 'Fat', value: 65, cal: 585, color: '#f87171' },
];
const totalCal = macros.reduce((s, m) => s + m.cal, 0);
let angle = -Math.PI / 2;
macros.forEach(m => {
  const slice = (m.cal / totalCal) * Math.PI * 2;
  mctx.beginPath(); mctx.moveTo(85, 85);
  mctx.arc(85, 85, 70, angle, angle + slice);
  mctx.fillStyle = m.color; mctx.fill();
  angle += slice;
});
mctx.beginPath(); mctx.arc(85, 85, 45, 0, Math.PI * 2);
mctx.fillStyle = '#fff'; mctx.fill();
mctx.fillStyle = '#1f2937'; mctx.font = 'bold 18px sans-serif'; mctx.textAlign = 'center';
mctx.fillText('1,840', 85, 85); mctx.font = '10px sans-serif'; mctx.fillStyle = '#9ca3af'; mctx.fillText('calories', 85, 100);

// Meal log
const meals = [
  { name: 'Oatmeal with Berries', time: 'Breakfast · 7:30 AM', cal: 350, icon: '🥣', bg: 'bg-yellow-100' },
  { name: 'Grilled Chicken Salad', time: 'Lunch · 12:00 PM', cal: 520, icon: '🥗', bg: 'bg-green-100' },
  { name: 'Protein Shake', time: 'Snack · 3:00 PM', cal: 280, icon: '🥤', bg: 'bg-purple-100' },
  { name: 'Salmon with Quinoa', time: 'Dinner · 7:00 PM', cal: 690, icon: '🍣', bg: 'bg-orange-100' },
];
document.getElementById('mealLog').innerHTML = meals.map(m => \`
  <div class="meal-card"><div class="meal-icon \${m.bg}">\${m.icon}</div><div class="flex-1"><p class="text-sm font-medium">\${m.name}</p><p class="text-xs text-canvas-muted">\${m.time}</p></div><span class="text-sm font-bold text-orange-600">\${m.cal} cal</span></div>
\`).join('');

// Weekly chart
const wc = document.getElementById('weekChart');
const wctx = wc.getContext('2d');
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const cals = [2100, 1950, 2300, 1800, 2050, 2200, 1840];
const target = 2200;

function drawWeekChart() {
  const w = wc.width = wc.parentElement.clientWidth - 40;
  const h = wc.height = 130;
  wctx.clearRect(0, 0, w, h);
  const max = 2800, pts = [];

  // Target line
  const tY = h - 20 - (target / max) * (h - 40);
  wctx.setLineDash([4, 4]); wctx.strokeStyle = '#fbbf24'; wctx.beginPath();
  wctx.moveTo(0, tY); wctx.lineTo(w, tY); wctx.stroke(); wctx.setLineDash([]);
  wctx.fillStyle = '#fbbf24'; wctx.font = '9px sans-serif'; wctx.fillText('Target', w - 36, tY - 4);

  cals.forEach((c, i) => {
    const x = 20 + (i / (days.length - 1)) * (w - 40);
    const y = h - 20 - (c / max) * (h - 40);
    pts.push({ x, y });
    wctx.fillStyle = '#9ca3af'; wctx.font = '10px sans-serif'; wctx.fillText(days[i], x - 10, h - 4);
  });

  // Line
  wctx.strokeStyle = '#f97316'; wctx.lineWidth = 2.5; wctx.beginPath();
  pts.forEach((p, i) => i === 0 ? wctx.moveTo(p.x, p.y) : wctx.lineTo(p.x, p.y));
  wctx.stroke();
  // Dots
  pts.forEach(p => { wctx.beginPath(); wctx.arc(p.x, p.y, 4, 0, Math.PI * 2); wctx.fillStyle = '#f97316'; wctx.fill(); wctx.strokeStyle = '#fff'; wctx.lineWidth = 2; wctx.stroke(); });
}
drawWeekChart();

// Suggestions
const suggestions = [
  { name: 'Greek Yogurt Bowl', cal: 240, icon: '🥣', tags: 'High Protein' },
  { name: 'Avocado Toast', cal: 310, icon: '🥑', tags: 'Healthy Fats' },
  { name: 'Chicken Stir-fry', cal: 450, icon: '🍜', tags: 'Balanced' },
  { name: 'Smoothie Bowl', cal: 280, icon: '🫐', tags: 'Antioxidants' },
];
document.getElementById('suggestions').innerHTML = suggestions.map(s => \`
  <div class="suggestion-card"><span class="text-xl">\${s.icon}</span><div class="flex-1"><p class="text-sm font-medium">\${s.name}</p><p class="text-xs text-canvas-muted">\${s.cal} cal · \${s.tags}</p></div><span class="text-xs text-orange-500 font-medium">+ Add</span></div>
\`).join('');

// Water tracker
let waterFilled = 3;
function renderWater() {
  document.getElementById('waterGlasses').innerHTML = Array.from({length: 8}, (_, i) =>
    \`<div class="water-glass \${i < waterFilled ? 'filled' : ''}" data-idx="\${i}"><div class="fill" style="height:\${i < waterFilled ? '100' : '0'}%"></div></div>\`
  ).join('');
  document.getElementById('waterCount').textContent = waterFilled + ' / 8 glasses';
}
renderWater();
document.getElementById('waterGlasses').addEventListener('click', e => {
  const glass = e.target.closest('.water-glass');
  if (!glass) return;
  waterFilled = Number(glass.dataset.idx) + 1;
  renderWater();
});
`,
      },
    ],
  },

  // 35. Mental Health App
  {
    name: 'Mental Health App',
    icon: '🧠',
    category: 'health',
    description: 'Mental wellness app with mood journal, CBT thought reframing, self-care checklist, and crisis resources.',
    prompt: 'Build a mental health wellness app with mood journal entries, CBT thought reframing exercise, daily self-care checklist, gratitude log, and crisis resource links.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MindWell — Mental Health</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-indigo-50 font-sans text-gray-800 min-h-screen p-6">
  <div class="max-w-5xl mx-auto">
    <header class="flex items-center justify-between mb-6">
      <div><h1 class="text-xl font-bold text-indigo-600">🧠 MindWell</h1><p class="text-xs text-canvas-muted">Your daily mental wellness companion</p></div>
      <div class="flex gap-2">
        <button class="tab-btn active" data-tab="journal">Journal</button>
        <button class="tab-btn" data-tab="reframe">Reframe</button>
        <button class="tab-btn" data-tab="selfcare">Self-Care</button>
        <button class="tab-btn" data-tab="gratitude">Gratitude</button>
      </div>
    </header>

    <!-- Journal -->
    <div id="tab-journal" class="tab-content active">
      <div class="grid grid-cols-3 gap-6">
        <div class="col-span-2 bg-white rounded-2xl p-5 border">
          <h3 class="font-bold text-sm mb-4">📝 Mood Journal</h3>
          <div class="flex gap-3 mb-4">
            <span class="mood-emoji selected" data-mood="great">😊</span>
            <span class="mood-emoji" data-mood="good">🙂</span>
            <span class="mood-emoji" data-mood="okay">😐</span>
            <span class="mood-emoji" data-mood="low">😔</span>
            <span class="mood-emoji" data-mood="bad">😢</span>
          </div>
          <textarea id="journalInput" rows="4" class="w-full border rounded-xl p-3 text-sm resize-none focus:ring-2 focus:ring-indigo-300 focus:outline-none" placeholder="How are you feeling today? What's on your mind..."></textarea>
          <div class="flex justify-between items-center mt-3">
            <div class="flex gap-2" id="tagBtns">
              <button class="tag-btn" data-tag="work">💼 Work</button>
              <button class="tag-btn" data-tag="relationships">❤️ Relationships</button>
              <button class="tag-btn" data-tag="health">🏃 Health</button>
              <button class="tag-btn" data-tag="sleep">😴 Sleep</button>
            </div>
            <button id="saveEntry" class="bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-600">Save Entry</button>
          </div>
        </div>
        <div class="bg-white rounded-2xl p-5 border">
          <h3 class="font-bold text-sm mb-4">📊 Mood History</h3>
          <div id="moodHistory" class="space-y-2"></div>
        </div>
      </div>
    </div>

    <!-- CBT Reframe -->
    <div id="tab-reframe" class="tab-content">
      <div class="bg-white rounded-2xl p-6 border max-w-2xl mx-auto">
        <h3 class="font-bold text-sm mb-2">🔄 Thought Reframing (CBT)</h3>
        <p class="text-xs text-canvas-muted mb-5">Challenge negative thoughts and find balanced perspectives.</p>
        <div class="space-y-4">
          <div><label class="text-xs font-medium text-canvas-muted-deep">Situation</label><textarea id="cbtSituation" rows="2" class="w-full border rounded-xl p-3 text-sm resize-none mt-1" placeholder="What happened?"></textarea></div>
          <div><label class="text-xs font-medium text-canvas-muted-deep">Automatic Thought</label><textarea id="cbtThought" rows="2" class="w-full border rounded-xl p-3 text-sm resize-none mt-1" placeholder="What went through your mind?"></textarea></div>
          <div><label class="text-xs font-medium text-canvas-muted-deep">Evidence For</label><textarea id="cbtFor" rows="2" class="w-full border rounded-xl p-3 text-sm resize-none mt-1" placeholder="What supports this thought?"></textarea></div>
          <div><label class="text-xs font-medium text-canvas-muted-deep">Evidence Against</label><textarea id="cbtAgainst" rows="2" class="w-full border rounded-xl p-3 text-sm resize-none mt-1" placeholder="What contradicts this thought?"></textarea></div>
          <div><label class="text-xs font-medium text-canvas-muted-deep">💡 Balanced Thought</label><textarea id="cbtBalanced" rows="2" class="w-full border rounded-xl p-3 text-sm resize-none mt-1 border-indigo-300 bg-indigo-50" placeholder="A more balanced and realistic perspective..."></textarea></div>
          <button id="saveReframe" class="w-full bg-indigo-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-600">Save Reframe ✓</button>
        </div>
      </div>
    </div>

    <!-- Self-Care Checklist -->
    <div id="tab-selfcare" class="tab-content">
      <div class="bg-white rounded-2xl p-6 border max-w-2xl mx-auto">
        <h3 class="font-bold text-sm mb-4">✨ Daily Self-Care Checklist</h3>
        <div id="checklist" class="space-y-3"></div>
        <div class="mt-5 bg-indigo-50 rounded-xl p-4 text-center">
          <p class="text-sm font-medium text-indigo-700" id="checkProgress">0 of 8 completed</p>
          <div class="w-full bg-indigo-100 rounded-full h-2 mt-2"><div class="bg-indigo-500 h-2 rounded-full transition-all" id="checkBar" style="width:0%"></div></div>
        </div>
      </div>
    </div>

    <!-- Gratitude -->
    <div id="tab-gratitude" class="tab-content">
      <div class="bg-white rounded-2xl p-6 border max-w-2xl mx-auto">
        <h3 class="font-bold text-sm mb-4">🙏 Gratitude Log</h3>
        <div class="space-y-3" id="gratInputs">
          <input type="text" class="grat-input w-full border rounded-xl p-3 text-sm" placeholder="1. I'm grateful for..." />
          <input type="text" class="grat-input w-full border rounded-xl p-3 text-sm" placeholder="2. I'm grateful for..." />
          <input type="text" class="grat-input w-full border rounded-xl p-3 text-sm" placeholder="3. I'm grateful for..." />
        </div>
        <button id="saveGrat" class="mt-4 w-full bg-indigo-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-600">Save Today's Gratitude</button>
        <div id="pastGrat" class="mt-5 space-y-3"></div>
      </div>
    </div>

    <!-- Crisis Box -->
    <div class="mt-6 bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
      <p class="text-sm font-medium text-primary-600 mb-1">🆘 Need immediate help?</p>
      <p class="text-xs text-primary-400">988 Suicide & Crisis Lifeline: <b>988</b> · Crisis Text Line: Text <b>HOME</b> to <b>741741</b></p>
    </div>
  </div>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.tab-btn { padding: 6px 14px; border-radius: 10px; font-size: 0.75rem; font-weight: 600; color: #6b7280; background: white; border: 1px solid #e5e7eb; cursor: pointer; transition: all 0.2s; }
.tab-btn.active { background: #6366f1; color: white; border-color: #6366f1; }
.tab-content { display: none; } .tab-content.active { display: block; }
.mood-emoji { font-size: 1.8rem; cursor: pointer; padding: 6px; border-radius: 12px; border: 2px solid transparent; transition: all .2s; }
.mood-emoji:hover { transform: scale(1.15); }
.mood-emoji.selected { border-color: #6366f1; background: #eef2ff; }
.tag-btn { padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; border: 1px solid #e5e7eb; background: white; cursor: pointer; transition: all 0.2s; }
.tag-btn.active { background: #eef2ff; border-color: #a5b4fc; color: #4f46e5; }
.check-item { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 12px; border: 1px solid #f3f4f6; cursor: pointer; transition: all 0.2s; }
.check-item:hover { background: #eef2ff; }
.check-item.done { background: #f0fdf4; border-color: #bbf7d0; }
.check-item.done .check-box { background: #22c55e; border-color: #22c55e; color: white; }
.check-box { width: 22px; height: 22px; border-radius: 6px; border: 2px solid #d1d5db; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; flex-shrink: 0; }
.check-item.done .item-text { text-decoration: line-through; color: #9ca3af; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// Mood selection
let selectedMood = 'great';
let selectedTags = [];
document.querySelectorAll('.mood-emoji').forEach(em => {
  em.addEventListener('click', () => {
    document.querySelectorAll('.mood-emoji').forEach(e => e.classList.remove('selected'));
    em.classList.add('selected'); selectedMood = em.dataset.mood;
  });
});
document.querySelectorAll('.tag-btn').forEach(tb => {
  tb.addEventListener('click', () => { tb.classList.toggle('active'); });
});

// Journal entries
const entries = [
  { mood: '😊', text: 'Had a great team meeting today. Feeling productive and valued.', tags: ['work'], time: '2 hours ago' },
  { mood: '😐', text: 'Slept poorly but managed to get through the day.', tags: ['sleep', 'health'], time: 'Yesterday' },
  { mood: '🙂', text: 'Enjoyed a nice walk in the park with a friend.', tags: ['relationships', 'health'], time: '2 days ago' },
];
function renderHistory() {
  const moods = { great: '😊', good: '🙂', okay: '😐', low: '😔', bad: '😢' };
  document.getElementById('moodHistory').innerHTML = entries.map(e =>
    '<div class="flex items-start gap-2 p-2 border rounded-xl"><span class="text-lg">' + e.mood + '</span><div class="flex-1"><p class="text-xs text-gray-600 line-clamp-2">' + e.text + '</p><p class="text-xs text-canvas-text mt-1">' + e.time + '</p></div></div>'
  ).join('');
}
renderHistory();

document.getElementById('saveEntry').addEventListener('click', () => {
  const moods = { great: '😊', good: '🙂', okay: '😐', low: '😔', bad: '😢' };
  const text = document.getElementById('journalInput').value.trim();
  if (!text) return;
  entries.unshift({ mood: moods[selectedMood], text, tags: [], time: 'Just now' });
  document.getElementById('journalInput').value = ''; renderHistory();
});

// Self-care checklist
const checks = [
  { icon: '💤', text: 'Got 7+ hours of sleep', done: true },
  { icon: '💧', text: 'Drank 8 glasses of water', done: true },
  { icon: '🏃', text: 'Exercised for 30 minutes', done: false },
  { icon: '🧘', text: 'Practiced mindfulness / meditation', done: false },
  { icon: '🥗', text: 'Ate a nutritious meal', done: true },
  { icon: '📱', text: 'Limited screen time before bed', done: false },
  { icon: '🤝', text: 'Connected with a friend / loved one', done: false },
  { icon: '📖', text: 'Read or learned something new', done: false },
];
function renderChecklist() {
  document.getElementById('checklist').innerHTML = checks.map((c, i) =>
    '<div class="check-item ' + (c.done ? 'done' : '') + '" data-idx="' + i + '"><div class="check-box">' + (c.done ? '✓' : '') + '</div><span class="text-lg">' + c.icon + '</span><span class="item-text text-sm">' + c.text + '</span></div>'
  ).join('');
  const done = checks.filter(c => c.done).length;
  document.getElementById('checkProgress').textContent = done + ' of ' + checks.length + ' completed';
  document.getElementById('checkBar').style.width = (done / checks.length * 100) + '%';
}
renderChecklist();
document.getElementById('checklist').addEventListener('click', e => {
  const item = e.target.closest('.check-item');
  if (!item) return;
  checks[Number(item.dataset.idx)].done = !checks[Number(item.dataset.idx)].done;
  renderChecklist();
});

// CBT Reframe save
document.getElementById('saveReframe').addEventListener('click', () => {
  const fields = ['cbtSituation', 'cbtThought', 'cbtFor', 'cbtAgainst', 'cbtBalanced'];
  const vals = fields.map(f => document.getElementById(f).value.trim());
  if (vals.some(v => !v)) { alert('Please fill out all fields.'); return; }
  fields.forEach(f => document.getElementById(f).value = '');
  alert('Reframe saved! Great job challenging that thought. 💪');
});

// Gratitude
document.getElementById('saveGrat').addEventListener('click', () => {
  const inputs = document.querySelectorAll('.grat-input');
  const vals = Array.from(inputs).map(i => i.value.trim()).filter(Boolean);
  if (vals.length === 0) return;
  const html = '<div class="bg-yellow-50 border border-yellow-200 rounded-xl p-3"><p class="text-xs text-yellow-600 font-medium mb-1">Today</p>' + vals.map(v => '<p class="text-sm">🌟 ' + v + '</p>').join('') + '</div>';
  document.getElementById('pastGrat').insertAdjacentHTML('afterbegin', html);
  inputs.forEach(i => i.value = '');
});
`,
      },
    ],
  },

  // 36. Social Feed
  {
    name: 'Social Feed',
    icon: '📱',
    category: 'social',
    description: 'Social media feed with posts, likes, comments, stories bar, and create-post composer.',
    prompt: 'Build a social media feed with story bubbles at top, post cards with images and like/comment/share buttons, comment sections, and a create-post composer with emoji support.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SocialHub — Feed</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-100 font-sans text-gray-800 min-h-screen">
  <div class="max-w-xl mx-auto py-6 px-4">
    <!-- Stories -->
    <div class="stories-bar flex gap-4 overflow-x-auto pb-4 mb-5 scrollbar-hide">
      <div class="story-item"><div class="story-ring add">+</div><span>Your Story</span></div>
      <div class="story-item"><div class="story-ring"><span>🧑‍💻</span></div><span>alex_dev</span></div>
      <div class="story-item"><div class="story-ring"><span>🎨</span></div><span>sara_art</span></div>
      <div class="story-item"><div class="story-ring"><span>📸</span></div><span>photo_max</span></div>
      <div class="story-item"><div class="story-ring"><span>🎵</span></div><span>dj_beats</span></div>
      <div class="story-item"><div class="story-ring"><span>🏋️</span></div><span>fit_jane</span></div>
      <div class="story-item"><div class="story-ring"><span>✈️</span></div><span>traveler</span></div>
    </div>

    <!-- Composer -->
    <div class="bg-white rounded-2xl p-4 border mb-5">
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-lg">👤</div>
        <textarea id="postInput" rows="2" class="flex-1 border-0 resize-none text-sm focus:outline-none" placeholder="What's on your mind?"></textarea>
      </div>
      <div class="flex items-center justify-between mt-3 pt-3 border-t">
        <div class="flex gap-3">
          <button class="comp-btn">📷 Photo</button>
          <button class="comp-btn">🎥 Video</button>
          <button class="comp-btn" id="emojiBtn">😊 Emoji</button>
        </div>
        <button id="postBtn" class="bg-indigo-500 text-white text-sm px-5 py-1.5 rounded-full font-medium hover:bg-indigo-600">Post</button>
      </div>
      <div id="emojiPicker" class="hidden mt-2 flex flex-wrap gap-1"></div>
    </div>

    <!-- Posts -->
    <div id="feed" class="space-y-5"></div>
  </div>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.scrollbar-hide::-webkit-scrollbar { display: none; }
.story-item { display: flex; flex-direction: column; align-items: center; gap: 4px; flex-shrink: 0; }
.story-item span:last-child { font-size: 0.65rem; color: #6b7280; }
.story-ring { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #f472b6, #a855f7, #6366f1); padding: 2px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.story-ring span, .story-ring.add { width: 50px; height: 50px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; }
.story-ring.add { background: #eef2ff; color: #6366f1; font-size: 1.5rem; font-weight: 700; }
.comp-btn { font-size: 0.75rem; color: #6b7280; background: #f9fafb; padding: 4px 10px; border-radius: 20px; cursor: pointer; border: none; }
.comp-btn:hover { background: #eef2ff; color: #6366f1; }
.post-card { background: white; border-radius: 16px; border: 1px solid #f3f4f6; overflow: hidden; }
.post-header { display: flex; align-items: center; gap: 10px; padding: 14px 16px; }
.post-avatar { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
.post-img { width: 100%; aspect-ratio: 4/3; background: linear-gradient(135deg, var(--c1, #e0e7ff), var(--c2, #fce7f3)); display: flex; align-items: center; justify-content: center; font-size: 3rem; }
.post-actions { display: flex; gap: 16px; padding: 12px 16px; }
.action-btn { display: flex; align-items: center; gap: 4px; font-size: 0.8rem; color: #6b7280; cursor: pointer; background: none; border: none; }
.action-btn:hover { color: #6366f1; }
.action-btn.liked { color: #ef4444; }
.post-body { padding: 0 16px 12px; font-size: 0.85rem; line-height: 1.5; }
.comment-section { padding: 0 16px 14px; }
.comment { display: flex; gap: 8px; margin-bottom: 8px; }
.comment-avatar { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; flex-shrink: 0; }
.comment-input { display: flex; gap: 8px; padding-top: 8px; border-top: 1px solid #f3f4f6; }
.comment-input input { flex: 1; border: 1px solid #e5e7eb; border-radius: 20px; padding: 6px 14px; font-size: 0.8rem; outline: none; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const posts = [
  { user: 'Alex Chen', handle: '@alex_dev', avatar: '🧑‍💻', bg: 'bg-blue-100', imgC1: '#bfdbfe', imgC2: '#c7d2fe', imgEmoji: '🏔️', text: 'Just finished a 10-mile hike with an incredible view! Nature is the best reset. 🌄', likes: 142, comments: [{ user: 'Sara', avatar: '🎨', bg: 'bg-pink-100', text: 'So beautiful! Where is this?' }, { user: 'Max', avatar: '📸', bg: 'bg-green-100', text: 'Amazing shot!' }], liked: false, time: '2h' },
  { user: 'Sara Kim', handle: '@sara_art', avatar: '🎨', bg: 'bg-pink-100', imgC1: '#fbcfe8', imgC2: '#fde68a', imgEmoji: '🎨', text: 'New digital art piece I\'ve been working on for the past week. Let me know what you think! ✨', likes: 89, comments: [{ user: 'DJ Beats', avatar: '🎵', bg: 'bg-purple-100', text: 'This is fire 🔥' }], liked: true, time: '4h' },
  { user: 'Photo Max', handle: '@photo_max', avatar: '📸', bg: 'bg-green-100', imgC1: '#bbf7d0', imgC2: '#bfdbfe', imgEmoji: '🌊', text: 'Caught the perfect golden hour at the beach today. Sometimes you just need to stop and appreciate the moment. 🌅', likes: 256, comments: [], liked: false, time: '6h' },
];

function renderFeed() {
  document.getElementById('feed').innerHTML = posts.map((p, idx) => {
    const commentsHtml = p.comments.map(c =>
      '<div class="comment"><div class="comment-avatar ' + c.bg + '">' + c.avatar + '</div><div><span class="text-xs font-bold">' + c.user + '</span> <span class="text-xs text-gray-600">' + c.text + '</span></div></div>'
    ).join('');
    return '<div class="post-card">' +
      '<div class="post-header"><div class="post-avatar ' + p.bg + '">' + p.avatar + '</div><div class="flex-1"><p class="text-sm font-bold">' + p.user + '</p><p class="text-xs text-canvas-muted">' + p.handle + ' · ' + p.time + '</p></div><button class="text-canvas-text">···</button></div>' +
      '<div class="post-img" style="--c1:' + p.imgC1 + ';--c2:' + p.imgC2 + '">' + p.imgEmoji + '</div>' +
      '<div class="post-actions"><button class="action-btn ' + (p.liked ? 'liked' : '') + '" data-action="like" data-idx="' + idx + '">' + (p.liked ? '❤️' : '🤍') + ' ' + p.likes + '</button><button class="action-btn" data-action="comment" data-idx="' + idx + '">💬 ' + p.comments.length + '</button><button class="action-btn">↗️ Share</button><button class="action-btn" style="margin-left:auto">🔖</button></div>' +
      '<div class="post-body">' + p.text + '</div>' +
      '<div class="comment-section">' + commentsHtml +
      '<div class="comment-input"><input type="text" placeholder="Add a comment..." data-idx="' + idx + '" /><button class="text-sm text-indigo-500 font-bold" data-send="' + idx + '">Post</button></div></div>' +
    '</div>';
  }).join('');
}
renderFeed();

// Interactions
document.getElementById('feed').addEventListener('click', e => {
  const btn = e.target.closest('[data-action="like"]');
  if (btn) {
    const idx = Number(btn.dataset.idx);
    posts[idx].liked = !posts[idx].liked;
    posts[idx].likes += posts[idx].liked ? 1 : -1;
    renderFeed(); return;
  }
  const send = e.target.closest('[data-send]');
  if (send) {
    const idx = Number(send.dataset.send);
    const input = document.querySelector('input[data-idx="' + idx + '"]');
    const text = input.value.trim();
    if (!text) return;
    posts[idx].comments.push({ user: 'You', avatar: '👤', bg: 'bg-gray-100', text });
    renderFeed();
  }
});

// Create post
document.getElementById('postBtn').addEventListener('click', () => {
  const text = document.getElementById('postInput').value.trim();
  if (!text) return;
  posts.unshift({ user: 'You', handle: '@you', avatar: '👤', bg: 'bg-gray-100', imgC1: '#e0e7ff', imgC2: '#dbeafe', imgEmoji: '✨', text, likes: 0, comments: [], liked: false, time: 'Just now' });
  document.getElementById('postInput').value = '';
  renderFeed();
});

// Emoji picker
const emojis = ['😊','😂','❤️','🔥','👏','🎉','💪','🙌','😍','🤔','👍','✨','🌟','💯','🎯','🚀'];
document.getElementById('emojiPicker').innerHTML = emojis.map(e => '<span class="cursor-pointer text-xl hover:scale-125 transition-transform">' + e + '</span>').join('');
document.getElementById('emojiBtn').addEventListener('click', () => document.getElementById('emojiPicker').classList.toggle('hidden'));
document.getElementById('emojiPicker').addEventListener('click', e => {
  if (e.target.tagName === 'SPAN') document.getElementById('postInput').value += e.target.textContent;
});
`,
      },
    ],
  },

  // 37. Messaging App
  {
    name: 'Messaging App',
    icon: '💬',
    category: 'social',
    description: 'Real-time messaging UI with conversation list, chat window, typing indicator, and message composer.',
    prompt: 'Build a messaging app with a sidebar conversation list, main chat window with message bubbles, typing indicator animation, online status, and message input with emoji and attachment buttons.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ChatApp — Messages</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-100 font-sans text-gray-800 h-screen flex">
  <!-- Sidebar -->
  <div class="w-80 bg-white border-r flex flex-col">
    <div class="p-4 border-b">
      <h1 class="text-lg font-bold text-indigo-600">💬 ChatApp</h1>
      <input type="text" class="w-full mt-3 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" placeholder="Search conversations..." id="searchConvo" />
    </div>
    <div id="convoList" class="flex-1 overflow-y-auto"></div>
  </div>

  <!-- Chat Area -->
  <div class="flex-1 flex flex-col">
    <div class="chat-header p-4 bg-white border-b flex items-center gap-3">
      <div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-lg" id="chatAvatar">🧑‍💻</div>
      <div class="flex-1">
        <p class="text-sm font-bold" id="chatName">Alex Chen</p>
        <p class="text-xs text-green-500" id="chatStatus">Online</p>
      </div>
      <button class="text-canvas-muted">📞</button>
      <button class="text-canvas-muted">📹</button>
      <button class="text-canvas-muted">⋮</button>
    </div>

    <div class="flex-1 overflow-y-auto p-6 space-y-4" id="messages"></div>

    <!-- Typing Indicator -->
    <div class="px-6 pb-1 hidden" id="typingIndicator">
      <div class="typing-dots"><span></span><span></span><span></span></div>
      <span class="text-xs text-canvas-muted ml-2">Alex is typing...</span>
    </div>

    <!-- Composer -->
    <div class="p-4 bg-white border-t flex items-center gap-3">
      <button class="text-xl text-canvas-muted">📎</button>
      <input type="text" id="msgInput" class="flex-1 border rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" placeholder="Type a message..." />
      <button class="text-xl text-canvas-muted" id="emojiToggle">😊</button>
      <button id="sendBtn" class="bg-indigo-500 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-indigo-600">➤</button>
    </div>
  </div>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.convo-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; cursor: pointer; transition: background 0.15s; border-left: 3px solid transparent; }
.convo-item:hover { background: #f9fafb; }
.convo-item.active { background: #eef2ff; border-left-color: #6366f1; }
.convo-avatar { width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0; position: relative; }
.online-dot { position: absolute; bottom: 1px; right: 1px; width: 10px; height: 10px; border-radius: 50%; background: #22c55e; border: 2px solid white; }
.unread-badge { background: #6366f1; color: white; font-size: 0.6rem; font-weight: 700; padding: 2px 6px; border-radius: 10px; }
.msg-bubble { max-width: 70%; padding: 10px 14px; border-radius: 16px; font-size: 0.85rem; line-height: 1.5; }
.msg-sent { background: #6366f1; color: white; border-bottom-right-radius: 4px; margin-left: auto; }
.msg-received { background: white; border: 1px solid #f3f4f6; border-bottom-left-radius: 4px; }
.msg-time { font-size: 0.6rem; color: #9ca3af; margin-top: 2px; }
.typing-dots { display: inline-flex; gap: 3px; align-items: center; }
.typing-dots span { width: 6px; height: 6px; border-radius: 50%; background: #9ca3af; animation: bounce 1.4s infinite; }
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const convos = [
  { name: 'Alex Chen', avatar: '🧑‍💻', bg: 'bg-blue-100', online: true, lastMsg: 'Hey, check out this new feature!', time: '2m', unread: 2 },
  { name: 'Sara Kim', avatar: '🎨', bg: 'bg-pink-100', online: true, lastMsg: 'The designs look great 👍', time: '15m', unread: 0 },
  { name: 'Max Photo', avatar: '📸', bg: 'bg-green-100', online: false, lastMsg: 'I sent the photos you needed', time: '1h', unread: 0 },
  { name: 'DJ Beats', avatar: '🎵', bg: 'bg-purple-100', online: true, lastMsg: 'New track dropping soon 🔥', time: '3h', unread: 1 },
  { name: 'Fitness Jane', avatar: '🏋️', bg: 'bg-yellow-100', online: false, lastMsg: 'See you at the gym tomorrow!', time: '5h', unread: 0 },
  { name: 'Team Chat', avatar: '👥', bg: 'bg-indigo-100', online: true, lastMsg: 'Meeting at 3pm', time: '1d', unread: 5 },
];

const chatMessages = {
  'Alex Chen': [
    { sender: 'them', text: 'Hey! Have you seen the new project specs?', time: '10:30 AM' },
    { sender: 'me', text: 'Yes! I was just looking at them. The timeline seems tight.', time: '10:32 AM' },
    { sender: 'them', text: 'I agree. Let me set up a call with the team to discuss.', time: '10:33 AM' },
    { sender: 'me', text: 'Sounds good. How about tomorrow morning?', time: '10:35 AM' },
    { sender: 'them', text: 'Perfect. I will send out the invite. Also, check out this new feature I just deployed!', time: '10:36 AM' },
    { sender: 'them', text: 'Hey, check out this new feature!', time: '10:38 AM' },
  ],
  'Sara Kim': [
    { sender: 'them', text: 'Here are the mockups for the landing page', time: '9:00 AM' },
    { sender: 'me', text: 'These look amazing Sara! Love the color scheme.', time: '9:15 AM' },
    { sender: 'them', text: 'The designs look great 👍', time: '9:20 AM' },
  ],
};

let activeConvo = 'Alex Chen';

function renderConvos() {
  const search = document.getElementById('searchConvo').value.toLowerCase();
  document.getElementById('convoList').innerHTML = convos
    .filter(c => c.name.toLowerCase().includes(search))
    .map(c => {
      const isActive = c.name === activeConvo ? 'active' : '';
      return '<div class="convo-item ' + isActive + '" data-name="' + c.name + '">' +
        '<div class="convo-avatar ' + c.bg + '">' + c.avatar + (c.online ? '<div class="online-dot"></div>' : '') + '</div>' +
        '<div class="flex-1 min-w-0"><p class="text-sm font-bold truncate">' + c.name + '</p><p class="text-xs text-canvas-muted truncate">' + c.lastMsg + '</p></div>' +
        '<div class="text-right"><p class="text-xs text-canvas-text">' + c.time + '</p>' + (c.unread ? '<span class="unread-badge">' + c.unread + '</span>' : '') + '</div></div>';
    }).join('');
}

function renderMessages() {
  const msgs = chatMessages[activeConvo] || [];
  const convo = convos.find(c => c.name === activeConvo);
  document.getElementById('chatAvatar').textContent = convo ? convo.avatar : '👤';
  document.getElementById('chatName').textContent = activeConvo;
  document.getElementById('chatStatus').textContent = convo && convo.online ? 'Online' : 'Last seen recently';
  document.getElementById('chatStatus').className = 'text-xs ' + (convo && convo.online ? 'text-green-500' : 'text-canvas-muted');

  document.getElementById('messages').innerHTML = msgs.map(m =>
    '<div class="flex flex-col ' + (m.sender === 'me' ? 'items-end' : 'items-start') + '">' +
    '<div class="msg-bubble ' + (m.sender === 'me' ? 'msg-sent' : 'msg-received') + '">' + m.text + '</div>' +
    '<span class="msg-time">' + m.time + '</span></div>'
  ).join('');

  const msgBox = document.getElementById('messages');
  msgBox.scrollTop = msgBox.scrollHeight;
}

renderConvos(); renderMessages();

document.getElementById('convoList').addEventListener('click', e => {
  const item = e.target.closest('.convo-item');
  if (!item) return;
  activeConvo = item.dataset.name;
  const c = convos.find(c => c.name === activeConvo);
  if (c) c.unread = 0;
  renderConvos(); renderMessages();
});

document.getElementById('searchConvo').addEventListener('input', renderConvos);

// Send message
function sendMessage() {
  const text = document.getElementById('msgInput').value.trim();
  if (!text) return;
  if (!chatMessages[activeConvo]) chatMessages[activeConvo] = [];
  const now = new Date();
  const time = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0') + (now.getHours() >= 12 ? ' PM' : ' AM');
  chatMessages[activeConvo].push({ sender: 'me', text, time });
  document.getElementById('msgInput').value = '';
  renderMessages();

  // Simulate typing & reply
  document.getElementById('typingIndicator').classList.remove('hidden');
  setTimeout(() => {
    document.getElementById('typingIndicator').classList.add('hidden');
    const replies = ['Got it! 👍', 'Interesting...', 'Let me check on that.', 'Sounds great!', 'Makes sense 😊'];
    chatMessages[activeConvo].push({ sender: 'them', text: replies[Math.floor(Math.random() * replies.length)], time });
    renderMessages();
  }, 1500);
}

document.getElementById('sendBtn').addEventListener('click', sendMessage);
document.getElementById('msgInput').addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });
`,
      },
    ],
  },

  // 38. Profile Page
  {
    name: 'Profile Page',
    icon: '👤',
    category: 'social',
    description: 'User profile with cover photo, bio, stats, post grid, followers list, and edit profile modal.',
    prompt: 'Build a social media profile page with cover photo, avatar, bio section, follower/following stats, post grid with tabs (posts/media/likes), and an edit profile modal.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Profile — Alex Chen</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-100 font-sans text-gray-800 min-h-screen">
  <div class="max-w-2xl mx-auto">
    <!-- Cover -->
    <div class="cover-photo" style="background: linear-gradient(135deg, #6366f1, #a855f7, #ec4899);"></div>

    <!-- Profile Header -->
    <div class="bg-white border-b px-6 pb-5 relative">
      <div class="absolute -top-12 left-6">
        <div class="w-24 h-24 bg-white rounded-full border-4 border-white flex items-center justify-center text-4xl shadow">🧑‍💻</div>
      </div>
      <div class="pt-14 flex items-start justify-between">
        <div>
          <h1 class="text-xl font-bold">Alex Chen</h1>
          <p class="text-sm text-canvas-muted">@alex_dev · Software Engineer</p>
          <p class="text-sm mt-2 max-w-md">Building beautiful things with code. Open source enthusiast. Coffee addict ☕ | San Francisco, CA 🌉</p>
          <div class="flex gap-4 mt-3 text-sm">
            <span><b>1,247</b> <span class="text-canvas-muted">Following</span></span>
            <span><b>15.2K</b> <span class="text-canvas-muted">Followers</span></span>
            <span class="text-canvas-muted">📍 San Francisco</span>
            <span class="text-canvas-muted">🔗 alexchen.dev</span>
          </div>
        </div>
        <button id="editBtn" class="border border-gray-300 rounded-full px-4 py-1.5 text-sm font-medium hover:bg-gray-50">Edit Profile</button>
      </div>

      <!-- Tabs -->
      <div class="flex gap-6 mt-5 border-t pt-3">
        <button class="profile-tab active" data-tab="posts">Posts <span class="text-xs text-canvas-muted">(128)</span></button>
        <button class="profile-tab" data-tab="media">Media <span class="text-xs text-canvas-muted">(45)</span></button>
        <button class="profile-tab" data-tab="likes">Likes <span class="text-xs text-canvas-muted">(892)</span></button>
      </div>
    </div>

    <!-- Content -->
    <div id="tabContent" class="py-4 px-2"></div>
  </div>

  <!-- Edit Modal -->
  <div id="editModal" class="modal-overlay hidden">
    <div class="modal-card">
      <div class="flex items-center justify-between mb-5">
        <h3 class="font-bold text-lg">Edit Profile</h3>
        <button id="closeModal" class="text-xl text-canvas-muted">&times;</button>
      </div>
      <div class="space-y-4">
        <div><label class="text-xs font-medium text-canvas-muted-deep">Name</label><input type="text" class="w-full border rounded-xl px-3 py-2 text-sm mt-1" value="Alex Chen" /></div>
        <div><label class="text-xs font-medium text-canvas-muted-deep">Bio</label><textarea rows="3" class="w-full border rounded-xl px-3 py-2 text-sm mt-1 resize-none">Building beautiful things with code. Open source enthusiast. Coffee addict ☕ | San Francisco, CA 🌉</textarea></div>
        <div><label class="text-xs font-medium text-canvas-muted-deep">Location</label><input type="text" class="w-full border rounded-xl px-3 py-2 text-sm mt-1" value="San Francisco, CA" /></div>
        <div><label class="text-xs font-medium text-canvas-muted-deep">Website</label><input type="text" class="w-full border rounded-xl px-3 py-2 text-sm mt-1" value="alexchen.dev" /></div>
        <button class="w-full bg-indigo-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-600" onclick="document.getElementById('editModal').classList.add('hidden')">Save Changes</button>
      </div>
    </div>
  </div>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.cover-photo { height: 180px; width: 100%; }
.profile-tab { font-size: 0.85rem; font-weight: 600; color: #6b7280; padding-bottom: 8px; border-bottom: 2px solid transparent; cursor: pointer; background: none; border-top: none; border-left: none; border-right: none; }
.profile-tab.active { color: #6366f1; border-bottom-color: #6366f1; }
.post-card { background: white; border-radius: 16px; border: 1px solid #f3f4f6; padding: 16px; margin-bottom: 12px; }
.media-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
.media-item { aspect-ratio: 1; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 2rem; cursor: pointer; }
.media-item:hover { opacity: 0.8; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 50; }
.modal-overlay.hidden { display: none; }
.modal-card { background: white; border-radius: 20px; padding: 24px; width: 100%; max-width: 440px; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const postsData = [
  { text: 'Just shipped a major update to our design system. 200+ components, fully accessible, dark mode support. Months of work paying off! 🚀', likes: 342, comments: 28, time: '2h' },
  { text: 'Hot take: TypeScript is not just "JavaScript with types." It fundamentally changes how you think about architecture. And that is a good thing.', likes: 891, comments: 156, time: '1d' },
  { text: 'Weekend project: built a CLI tool that generates beautiful README files from your package.json. Open sourcing it tomorrow! ⭐', likes: 567, comments: 43, time: '2d' },
  { text: 'The best code is the code you do not write. Spent today deleting 3000 lines of legacy code. Feels incredible.', likes: 1204, comments: 89, time: '3d' },
  { text: 'Coffee, code, ship, repeat. ☕💻🚢🔁', likes: 234, comments: 12, time: '4d' },
];

const mediaData = [
  { emoji: '🏔️', bg: '#bfdbfe' }, { emoji: '🌅', bg: '#fde68a' }, { emoji: '🎨', bg: '#fbcfe8' },
  { emoji: '🖥️', bg: '#c7d2fe' }, { emoji: '☕', bg: '#fde68a' }, { emoji: '🌊', bg: '#a5f3fc' },
  { emoji: '🎯', bg: '#bbf7d0' }, { emoji: '🚀', bg: '#e0e7ff' }, { emoji: '📸', bg: '#fecaca' },
];

const likesData = [
  { user: 'Sara Kim', avatar: '🎨', text: 'Just finished this abstract piece after 3 weeks of work!', time: '5h' },
  { user: 'Photo Max', avatar: '📸', text: 'Golden hour at its finest. Shot on iPhone.', time: '8h' },
  { user: 'DJ Beats', avatar: '🎵', text: 'New album dropping this Friday! 🎧', time: '1d' },
  { user: 'Tech Daily', avatar: '📱', text: 'The future of AI in software development — a thread 🧵', time: '2d' },
];

let activeTab = 'posts';

function renderTab() {
  const container = document.getElementById('tabContent');
  if (activeTab === 'posts') {
    container.innerHTML = postsData.map(p =>
      '<div class="post-card"><p class="text-sm mb-3">' + p.text + '</p>' +
      '<div class="flex gap-4 text-xs text-canvas-muted"><span>❤️ ' + p.likes + '</span><span>💬 ' + p.comments + '</span><span>↗️ Share</span><span class="ml-auto">' + p.time + '</span></div></div>'
    ).join('');
  } else if (activeTab === 'media') {
    container.innerHTML = '<div class="media-grid">' +
      mediaData.map(m => '<div class="media-item" style="background:' + m.bg + '">' + m.emoji + '</div>').join('') +
    '</div>';
  } else {
    container.innerHTML = likesData.map(l =>
      '<div class="post-card flex items-start gap-3"><div class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg flex-shrink-0">' + l.avatar + '</div>' +
      '<div><p class="text-sm font-bold">' + l.user + ' <span class="text-xs text-canvas-muted font-normal">· ' + l.time + '</span></p><p class="text-sm mt-1">' + l.text + '</p></div></div>'
    ).join('');
  }
}
renderTab();

document.querySelectorAll('.profile-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeTab = tab.dataset.tab;
    renderTab();
  });
});

document.getElementById('editBtn').addEventListener('click', () => document.getElementById('editModal').classList.remove('hidden'));
document.getElementById('closeModal').addEventListener('click', () => document.getElementById('editModal').classList.add('hidden'));
`,
      },
    ],
  },

  // 39. Community Forum
  {
    name: 'Community Forum',
    icon: '🏛️',
    category: 'social',
    description: 'Discussion forum with categories, threads, voting, reply system, and user badges.',
    prompt: 'Build a community forum with category sidebar, thread list with vote buttons, thread detail view with replies, user badges, and a new thread composer.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DevForum — Community</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-50 font-sans text-gray-800 min-h-screen">
  <div class="max-w-5xl mx-auto py-6 px-4">
    <header class="flex items-center justify-between mb-6">
      <div><h1 class="text-xl font-bold text-indigo-600">🏛️ DevForum</h1><p class="text-xs text-canvas-muted">Community Discussion Board</p></div>
      <button id="newThreadBtn" class="bg-indigo-500 text-white text-sm px-4 py-2 rounded-xl font-medium hover:bg-indigo-600">+ New Thread</button>
    </header>

    <div class="flex gap-6">
      <!-- Categories Sidebar -->
      <div class="w-48 flex-shrink-0">
        <div class="bg-white rounded-xl border p-4">
          <h3 class="text-xs font-bold text-canvas-muted uppercase mb-3">Categories</h3>
          <div id="categories" class="space-y-1"></div>
        </div>
        <div class="bg-white rounded-xl border p-4 mt-4">
          <h3 class="text-xs font-bold text-canvas-muted uppercase mb-3">Top Contributors</h3>
          <div class="space-y-2" id="topUsers"></div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-1">
        <div id="threadList"></div>
        <div id="threadDetail" class="hidden"></div>
      </div>
    </div>
  </div>

  <!-- New Thread Modal -->
  <div id="newThreadModal" class="modal-overlay hidden">
    <div class="modal-card">
      <div class="flex items-center justify-between mb-4"><h3 class="font-bold">New Thread</h3><button id="closeNewThread" class="text-xl text-canvas-muted">&times;</button></div>
      <input type="text" id="threadTitle" class="w-full border rounded-xl px-3 py-2 text-sm mb-3" placeholder="Thread title" />
      <select id="threadCat" class="w-full border rounded-xl px-3 py-2 text-sm mb-3"><option>General</option><option>Help</option><option>Show & Tell</option><option>Discussion</option><option>Tutorial</option></select>
      <textarea id="threadBody" rows="4" class="w-full border rounded-xl px-3 py-2 text-sm resize-none mb-3" placeholder="Write your post..."></textarea>
      <button id="submitThread" class="w-full bg-indigo-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-600">Post Thread</button>
    </div>
  </div>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.cat-item { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 8px; font-size: 0.8rem; cursor: pointer; transition: all 0.15s; }
.cat-item:hover { background: #eef2ff; }
.cat-item.active { background: #eef2ff; color: #6366f1; font-weight: 600; }
.thread-card { background: white; border: 1px solid #f3f4f6; border-radius: 14px; padding: 16px; display: flex; gap: 14px; margin-bottom: 10px; cursor: pointer; transition: all 0.15s; }
.thread-card:hover { border-color: #c7d2fe; }
.vote-box { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 36px; }
.vote-btn { background: none; border: none; cursor: pointer; font-size: 0.9rem; color: #9ca3af; padding: 2px; line-height: 1; }
.vote-btn:hover { color: #6366f1; }
.vote-count { font-size: 0.85rem; font-weight: 700; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 0.65rem; font-weight: 600; }
.badge-general { background: #e0e7ff; color: #6366f1; } .badge-help { background: #fef3c7; color: #d97706; }
.badge-show { background: #d1fae5; color: #059669; } .badge-discussion { background: #fce7f3; color: #db2777; }
.badge-tutorial { background: #dbeafe; color: #2563eb; }
.user-badge { display: inline-block; padding: 1px 6px; border-radius: 8px; font-size: 0.55rem; font-weight: 700; }
.reply-card { background: #f9fafb; border-radius: 12px; padding: 14px; margin-bottom: 10px; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 50; }
.modal-overlay.hidden { display: none; }
.modal-card { background: white; border-radius: 20px; padding: 24px; width: 100%; max-width: 500px; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const categories = [
  { name: 'All', icon: '📋', count: 24 },
  { name: 'General', icon: '💬', count: 8 },
  { name: 'Help', icon: '🆘', count: 6 },
  { name: 'Show & Tell', icon: '🎪', count: 4 },
  { name: 'Discussion', icon: '🗣️', count: 3 },
  { name: 'Tutorial', icon: '📚', count: 3 },
];
let activeCat = 'All';

const threads = [
  { id: 1, title: 'Best practices for React performance optimization?', cat: 'Discussion', author: 'Alex Chen', authorBadge: '🛡️ Moderator', badge: 'bg-indigo-100 text-indigo-600', votes: 42, replies: 18, time: '2h ago', body: 'I have been noticing some performance issues in my React app, especially with large lists. What are your go-to optimization strategies?' },
  { id: 2, title: 'Show: Built a real-time collaboration tool with WebSockets', cat: 'Show & Tell', author: 'Sara Kim', authorBadge: '⭐ Top Contributor', badge: 'bg-pink-100 text-pink-600', votes: 78, replies: 24, time: '4h ago', body: 'Excited to share my latest project — a real-time collaborative coding tool built with WebSockets and CRDTs.' },
  { id: 3, title: 'Help: Prisma migration failing on PostgreSQL 15', cat: 'Help', author: 'Max Photo', authorBadge: '', badge: 'bg-green-100 text-green-600', votes: 15, replies: 7, time: '6h ago', body: 'Getting a strange error when running prisma migrate dev on PostgreSQL 15. Error: relation does not exist.' },
  { id: 4, title: 'Tutorial: Building type-safe APIs with tRPC', cat: 'Tutorial', author: 'DJ Beats', authorBadge: '✍️ Author', badge: 'bg-purple-100 text-purple-600', votes: 56, replies: 12, time: '1d ago', body: 'In this tutorial, I will walk you through setting up tRPC with Next.js for fully type-safe APIs.' },
  { id: 5, title: 'What is your favorite VS Code extension in 2024?', cat: 'General', author: 'Jane Dev', authorBadge: '', badge: 'bg-gray-100 text-gray-600', votes: 89, replies: 45, time: '1d ago', body: 'Curious what extensions everyone is using. I recently discovered some gems I can not live without.' },
];

const replies = [
  { author: 'DevMaster', badge: '🛡️ Moderator', text: 'Great question! React.memo, useMemo, and useCallback are essential. Also look into virtualization with react-window for large lists.', votes: 12, time: '1h ago' },
  { author: 'CodeNinja', badge: '', text: 'Do not forget about code splitting with React.lazy! It made a huge difference in our app.', votes: 8, time: '2h ago' },
  { author: 'PerformanceGuru', badge: '⭐ Top Contributor', text: 'Profile first! Use the React DevTools Profiler to identify actual bottlenecks before optimizing.', votes: 15, time: '30m ago' },
];

const topUsers = [
  { name: 'Alex Chen', badge: '🛡️', points: '2.4K' },
  { name: 'Sara Kim', badge: '⭐', points: '1.8K' },
  { name: 'DJ Beats', badge: '✍️', points: '1.2K' },
  { name: 'Jane Dev', badge: '', points: '890' },
];

const badgeClass = { General: 'badge-general', Help: 'badge-help', 'Show & Tell': 'badge-show', Discussion: 'badge-discussion', Tutorial: 'badge-tutorial' };

function renderCategories() {
  document.getElementById('categories').innerHTML = categories.map(c =>
    '<div class="cat-item ' + (c.name === activeCat ? 'active' : '') + '" data-cat="' + c.name + '">' + c.icon + ' ' + c.name + ' <span class="ml-auto text-xs text-canvas-text">' + c.count + '</span></div>'
  ).join('');
}

function renderTopUsers() {
  document.getElementById('topUsers').innerHTML = topUsers.map(u =>
    '<div class="flex items-center gap-2 text-xs"><span>' + u.badge + '</span><span class="font-medium">' + u.name + '</span><span class="ml-auto text-canvas-muted">' + u.points + '</span></div>'
  ).join('');
}

function renderThreads() {
  const filtered = activeCat === 'All' ? threads : threads.filter(t => t.cat === activeCat);
  document.getElementById('threadList').classList.remove('hidden');
  document.getElementById('threadDetail').classList.add('hidden');
  document.getElementById('threadList').innerHTML = filtered.map(t =>
    '<div class="thread-card" data-id="' + t.id + '">' +
    '<div class="vote-box"><button class="vote-btn" data-vote="up" data-id="' + t.id + '">▲</button><span class="vote-count">' + t.votes + '</span><button class="vote-btn" data-vote="down" data-id="' + t.id + '">▼</button></div>' +
    '<div class="flex-1"><div class="flex items-center gap-2 mb-1"><span class="badge ' + (badgeClass[t.cat] || 'badge-general') + '">' + t.cat + '</span><span class="text-xs text-canvas-muted">' + t.time + '</span></div>' +
    '<h3 class="text-sm font-bold mb-1">' + t.title + '</h3>' +
    '<div class="flex items-center gap-3 text-xs text-canvas-muted"><span>' + t.author + '</span><span>💬 ' + t.replies + ' replies</span></div></div></div>'
  ).join('');
}

function showThread(id) {
  const t = threads.find(th => th.id === id);
  if (!t) return;
  document.getElementById('threadList').classList.add('hidden');
  document.getElementById('threadDetail').classList.remove('hidden');
  document.getElementById('threadDetail').innerHTML =
    '<button class="text-sm text-indigo-500 mb-4" id="backToList">← Back to threads</button>' +
    '<div class="bg-white rounded-xl border p-5 mb-4"><div class="flex items-center gap-2 mb-2"><span class="badge ' + (badgeClass[t.cat] || 'badge-general') + '">' + t.cat + '</span><span class="text-xs text-canvas-muted">' + t.time + '</span></div>' +
    '<h2 class="text-lg font-bold mb-2">' + t.title + '</h2><p class="text-sm text-gray-600 mb-3">' + t.body + '</p>' +
    '<div class="flex items-center gap-3 text-xs text-canvas-muted pt-3 border-t"><span>👤 ' + t.author + '</span>' + (t.authorBadge ? '<span class="user-badge bg-indigo-100 text-indigo-600">' + t.authorBadge + '</span>' : '') + '<span class="ml-auto">❤️ ' + t.votes + '  💬 ' + t.replies + '</span></div></div>' +
    '<h3 class="font-bold text-sm mb-3">' + replies.length + ' Replies</h3>' +
    replies.map(r => '<div class="reply-card"><div class="flex items-center gap-2 mb-2"><span class="text-sm font-bold">' + r.author + '</span>' + (r.badge ? '<span class="user-badge bg-indigo-100 text-indigo-600">' + r.badge + '</span>' : '') + '<span class="text-xs text-canvas-muted ml-auto">' + r.time + '</span></div><p class="text-sm text-gray-600">' + r.text + '</p><div class="flex gap-3 mt-2 text-xs text-canvas-muted"><button>▲ ' + r.votes + '</button><button>Reply</button></div></div>').join('') +
    '<div class="bg-white rounded-xl border p-4 mt-4"><textarea rows="3" class="w-full border rounded-xl p-3 text-sm resize-none" placeholder="Write a reply..."></textarea><button class="mt-2 bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-600">Post Reply</button></div>';

  document.getElementById('backToList').addEventListener('click', renderThreads);
}

renderCategories(); renderTopUsers(); renderThreads();

document.getElementById('categories').addEventListener('click', e => {
  const cat = e.target.closest('.cat-item');
  if (!cat) return;
  activeCat = cat.dataset.cat;
  renderCategories(); renderThreads();
});

document.getElementById('threadList').addEventListener('click', e => {
  const voteBtn = e.target.closest('.vote-btn');
  if (voteBtn) { const t = threads.find(th => th.id === Number(voteBtn.dataset.id)); if (t) { t.votes += voteBtn.dataset.vote === 'up' ? 1 : -1; renderThreads(); } return; }
  const card = e.target.closest('.thread-card');
  if (card) showThread(Number(card.dataset.id));
});

document.getElementById('newThreadBtn').addEventListener('click', () => document.getElementById('newThreadModal').classList.remove('hidden'));
document.getElementById('closeNewThread').addEventListener('click', () => document.getElementById('newThreadModal').classList.add('hidden'));
document.getElementById('submitThread').addEventListener('click', () => {
  const title = document.getElementById('threadTitle').value.trim();
  const body = document.getElementById('threadBody').value.trim();
  const cat = document.getElementById('threadCat').value;
  if (!title || !body) return;
  threads.unshift({ id: Date.now(), title, cat, author: 'You', authorBadge: '', badge: '', votes: 0, replies: 0, time: 'Just now', body });
  document.getElementById('threadTitle').value = ''; document.getElementById('threadBody').value = '';
  document.getElementById('newThreadModal').classList.add('hidden');
  renderThreads();
});
`,
      },
    ],
  },

  // 40. Event Platform
  {
    name: 'Event Platform',
    icon: '🎉',
    category: 'social',
    description: 'Event discovery platform with event listings, calendar view, RSVP system, and event detail pages.',
    prompt: 'Build an event platform with featured event hero, event grid with category filters, calendar view toggle, RSVP buttons with attendee count, and event detail modal.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EventHub — Discover Events</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-50 font-sans text-gray-800 min-h-screen">
  <div class="max-w-5xl mx-auto py-6 px-4">
    <header class="flex items-center justify-between mb-6">
      <div><h1 class="text-xl font-bold text-purple-600">🎉 EventHub</h1><p class="text-xs text-canvas-muted">Discover amazing events near you</p></div>
      <div class="flex gap-2">
        <button class="view-btn active" data-view="grid">▦ Grid</button>
        <button class="view-btn" data-view="calendar">📅 Calendar</button>
      </div>
    </header>

    <!-- Featured Event -->
    <div class="featured-event mb-6">
      <div class="featured-content">
        <span class="inline-block bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded mb-2">⭐ FEATURED</span>
        <h2 class="text-2xl font-bold text-white mb-2">Tech Summit 2024</h2>
        <p class="text-sm text-purple-100 mb-3">The biggest tech conference of the year. 50+ speakers, workshops, and networking.</p>
        <div class="flex items-center gap-4 text-xs text-purple-200">
          <span>📅 Dec 15, 2024</span><span>📍 Convention Center</span><span>👥 1,240 attending</span>
        </div>
        <button class="mt-4 bg-white text-purple-600 px-5 py-2 rounded-full text-sm font-bold hover:bg-purple-50">RSVP Now →</button>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-3 mb-5 overflow-x-auto pb-2">
      <button class="filter-btn active" data-filter="all">All</button>
      <button class="filter-btn" data-filter="tech">💻 Tech</button>
      <button class="filter-btn" data-filter="music">🎵 Music</button>
      <button class="filter-btn" data-filter="art">🎨 Art</button>
      <button class="filter-btn" data-filter="food">🍕 Food</button>
      <button class="filter-btn" data-filter="sports">⚽ Sports</button>
      <button class="filter-btn" data-filter="networking">🤝 Networking</button>
    </div>

    <!-- Grid View -->
    <div id="gridView" class="grid grid-cols-3 gap-4"></div>

    <!-- Calendar View -->
    <div id="calendarView" class="hidden">
      <div class="bg-white rounded-2xl border p-5">
        <div class="flex items-center justify-between mb-4">
          <button id="prevMonth" class="text-canvas-muted hover:text-gray-600">←</button>
          <h3 class="font-bold" id="calMonth">December 2024</h3>
          <button id="nextMonth" class="text-canvas-muted hover:text-gray-600">→</button>
        </div>
        <div class="grid grid-cols-7 gap-1 text-center text-xs font-bold text-canvas-muted mb-2">
          <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
        </div>
        <div id="calGrid" class="grid grid-cols-7 gap-1"></div>
      </div>
    </div>
  </div>

  <!-- Event Detail Modal -->
  <div id="eventModal" class="modal-overlay hidden">
    <div class="modal-card" id="modalContent"></div>
  </div>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.featured-event { background: linear-gradient(135deg, #7c3aed, #a855f7, #ec4899); border-radius: 20px; padding: 40px; position: relative; overflow: hidden; }
.featured-content { position: relative; z-index: 1; }
.view-btn { padding: 6px 14px; border-radius: 10px; font-size: 0.75rem; font-weight: 600; color: #6b7280; background: white; border: 1px solid #e5e7eb; cursor: pointer; }
.view-btn.active { background: #7c3aed; color: white; border-color: #7c3aed; }
.filter-btn { padding: 6px 14px; border-radius: 20px; font-size: 0.75rem; border: 1px solid #e5e7eb; background: white; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
.filter-btn.active { background: #7c3aed; color: white; border-color: #7c3aed; }
.event-card { background: white; border: 1px solid #f3f4f6; border-radius: 16px; overflow: hidden; cursor: pointer; transition: all 0.2s; }
.event-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
.event-img { height: 100px; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; }
.event-body { padding: 14px; }
.rsvp-btn { width: 100%; padding: 8px; border-radius: 10px; font-size: 0.75rem; font-weight: 600; border: none; cursor: pointer; transition: all 0.2s; }
.rsvp-btn.going { background: #7c3aed; color: white; }
.rsvp-btn.not-going { background: #f3f4f6; color: #6b7280; }
.rsvp-btn.not-going:hover { background: #ede9fe; color: #7c3aed; }
.cal-day { aspect-ratio: 1; border-radius: 8px; font-size: 0.75rem; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; cursor: pointer; }
.cal-day:hover { background: #f5f3ff; }
.cal-day.has-event { background: #ede9fe; font-weight: 600; }
.cal-dot { width: 4px; height: 4px; border-radius: 50%; background: #7c3aed; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 50; }
.modal-overlay.hidden { display: none; }
.modal-card { background: white; border-radius: 20px; padding: 0; width: 100%; max-width: 480px; overflow: hidden; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const events = [
  { id: 1, name: 'AI Workshop', cat: 'tech', date: 'Dec 12', day: 12, time: '10:00 AM', location: 'Innovation Hub', emoji: '🤖', bg: '#dbeafe', attendees: 85, going: false, desc: 'Hands-on workshop exploring the latest developments in artificial intelligence and machine learning.' },
  { id: 2, name: 'Jazz Night Live', cat: 'music', date: 'Dec 13', day: 13, time: '8:00 PM', location: 'Blue Note Lounge', emoji: '🎷', bg: '#fce7f3', attendees: 120, going: true, desc: 'An evening of smooth jazz with featured artists from around the world.' },
  { id: 3, name: 'Street Art Festival', cat: 'art', date: 'Dec 14', day: 14, time: '11:00 AM', location: 'Downtown District', emoji: '🎨', bg: '#fef3c7', attendees: 340, going: false, desc: 'Annual street art festival with live murals, workshops, and gallery exhibitions.' },
  { id: 4, name: 'Startup Pitch Night', cat: 'networking', date: 'Dec 15', day: 15, time: '6:00 PM', location: 'Startup Campus', emoji: '🚀', bg: '#e0e7ff', attendees: 200, going: false, desc: 'Watch 10 startups pitch their ideas to a panel of investors and industry experts.' },
  { id: 5, name: 'Food Truck Rally', cat: 'food', date: 'Dec 16', day: 16, time: '12:00 PM', location: 'City Park', emoji: '🌮', bg: '#d1fae5', attendees: 500, going: true, desc: 'Over 30 food trucks serving cuisines from around the world. Live music and entertainment.' },
  { id: 6, name: 'Basketball Tournament', cat: 'sports', date: 'Dec 17', day: 17, time: '9:00 AM', location: 'Sports Arena', emoji: '🏀', bg: '#fee2e2', attendees: 180, going: false, desc: 'Community 3v3 basketball tournament. All skill levels welcome!' },
  { id: 7, name: 'React Conference', cat: 'tech', date: 'Dec 18', day: 18, time: '9:00 AM', location: 'Tech Center', emoji: '⚛️', bg: '#cffafe', attendees: 450, going: true, desc: 'Full-day conference on React, Next.js, and the modern web development ecosystem.' },
  { id: 8, name: 'Wine & Paint Night', cat: 'art', date: 'Dec 19', day: 19, time: '7:00 PM', location: 'Creative Studio', emoji: '🍷', bg: '#fae8ff', attendees: 40, going: false, desc: 'Relax and create a masterpiece while enjoying a glass of wine. No experience needed.' },
  { id: 9, name: 'Coding Bootcamp Demo', cat: 'tech', date: 'Dec 20', day: 20, time: '2:00 PM', location: 'Learning Hub', emoji: '💻', bg: '#e0e7ff', attendees: 95, going: false, desc: 'Final project demos from our latest coding bootcamp cohort. Come be inspired!' },
];

let activeFilter = 'all';
let activeView = 'grid';

function renderGrid() {
  const filtered = activeFilter === 'all' ? events : events.filter(e => e.cat === activeFilter);
  document.getElementById('gridView').innerHTML = filtered.map(e =>
    '<div class="event-card" data-id="' + e.id + '">' +
    '<div class="event-img" style="background:' + e.bg + '">' + e.emoji + '</div>' +
    '<div class="event-body"><p class="text-xs text-purple-500 font-medium mb-1">' + e.date + ' · ' + e.time + '</p>' +
    '<h4 class="text-sm font-bold mb-1">' + e.name + '</h4>' +
    '<p class="text-xs text-canvas-muted mb-2">📍 ' + e.location + '</p>' +
    '<div class="flex items-center justify-between mb-3"><span class="text-xs text-canvas-muted">👥 ' + e.attendees + ' going</span></div>' +
    '<button class="rsvp-btn ' + (e.going ? 'going' : 'not-going') + '" data-rsvp="' + e.id + '">' + (e.going ? '✓ Going' : 'RSVP') + '</button></div></div>'
  ).join('');
}

function renderCalendar() {
  const daysInMonth = 31, startDay = 0; // Dec 2024 starts on Sunday
  let html = '';
  for (let i = 0; i < startDay; i++) html += '<div class="cal-day"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const ev = events.find(e => e.day === d);
    html += '<div class="cal-day ' + (ev ? 'has-event' : '') + '" data-day="' + d + '">' + d + (ev ? '<div class="cal-dot"></div>' : '') + '</div>';
  }
  document.getElementById('calGrid').innerHTML = html;
}

function showEventModal(id) {
  const e = events.find(ev => ev.id === id);
  if (!e) return;
  document.getElementById('modalContent').innerHTML =
    '<div style="background:' + e.bg + ';height:120px;display:flex;align-items:center;justify-content:center;font-size:3.5rem">' + e.emoji + '</div>' +
    '<div style="padding:20px"><div class="flex items-center justify-between mb-3"><h2 class="text-lg font-bold">' + e.name + '</h2><button onclick="document.getElementById(\'eventModal\').classList.add(\'hidden\')" class="text-xl text-canvas-muted">&times;</button></div>' +
    '<div class="flex flex-wrap gap-3 text-xs text-canvas-muted-deep mb-3"><span>📅 ' + e.date + '</span><span>🕐 ' + e.time + '</span><span>📍 ' + e.location + '</span><span>👥 ' + e.attendees + ' attending</span></div>' +
    '<p class="text-sm text-gray-600 mb-4">' + e.desc + '</p>' +
    '<button class="rsvp-btn ' + (e.going ? 'going' : 'not-going') + ' w-full" data-rsvp="' + e.id + '">' + (e.going ? '✓ Going' : 'RSVP — I\'m In!') + '</button></div>';
  document.getElementById('eventModal').classList.remove('hidden');
}

renderGrid(); renderCalendar();

// Filters
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderGrid();
  });
});

// View toggle
document.querySelectorAll('.view-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeView = btn.dataset.view;
    document.getElementById('gridView').classList.toggle('hidden', activeView !== 'grid');
    document.getElementById('calendarView').classList.toggle('hidden', activeView !== 'calendar');
  });
});

// RSVP & card click
document.addEventListener('click', e => {
  const rsvp = e.target.closest('[data-rsvp]');
  if (rsvp) {
    e.stopPropagation();
    const ev = events.find(ev => ev.id === Number(rsvp.dataset.rsvp));
    if (ev) { ev.going = !ev.going; ev.attendees += ev.going ? 1 : -1; renderGrid(); }
    return;
  }
  const card = e.target.closest('.event-card');
  if (card) showEventModal(Number(card.dataset.id));
});

document.getElementById('eventModal').addEventListener('click', e => {
  if (e.target === document.getElementById('eventModal')) document.getElementById('eventModal').classList.add('hidden');
});
`,
      },
    ],
  },

  // 41. Music Player
  {
    name: 'Music Player',
    icon: '🎵',
    category: 'entertainment',
    description: 'Music streaming interface with playlist, now-playing bar, album art, and playback controls.',
    prompt: 'Build a music player UI with sidebar playlists, song list with album art, now-playing bar with progress slider, play/pause/skip controls, volume control, and shuffle/repeat toggles.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>VibePlay — Music</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-900 text-white font-sans h-screen flex flex-col">
  <div class="flex flex-1 overflow-hidden">
    <!-- Sidebar -->
    <div class="w-56 bg-black flex flex-col p-4">
      <h1 class="text-lg font-bold text-green-400 mb-6">🎵 VibePlay</h1>
      <nav class="space-y-1 mb-6">
        <a class="nav-item active">🏠 Home</a><a class="nav-item">🔍 Search</a><a class="nav-item">📚 Library</a>
      </nav>
      <h3 class="text-xs font-bold text-canvas-muted-deep uppercase mb-3">Playlists</h3>
      <div id="playlists" class="space-y-1 flex-1 overflow-y-auto"></div>
    </div>

    <!-- Main -->
    <div class="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-800 to-gray-900">
      <div class="flex items-end gap-6 mb-8">
        <div class="w-48 h-48 rounded-xl flex items-center justify-center text-6xl" id="playlistArt" style="background:linear-gradient(135deg,#6366f1,#a855f7)">🎧</div>
        <div>
          <p class="text-xs text-canvas-muted uppercase">Playlist</p>
          <h2 class="text-3xl font-bold mb-2" id="playlistTitle">Chill Vibes</h2>
          <p class="text-sm text-canvas-muted">12 songs · 45 min</p>
        </div>
      </div>

      <table class="w-full">
        <thead><tr class="text-xs text-canvas-muted-deep border-b border-gray-800"><th class="text-left pb-2 w-8">#</th><th class="text-left pb-2">TITLE</th><th class="text-left pb-2">ARTIST</th><th class="text-right pb-2">⏱</th></tr></thead>
        <tbody id="songList"></tbody>
      </table>
    </div>
  </div>

  <!-- Now Playing Bar -->
  <div class="now-playing-bar">
    <div class="flex items-center gap-3 w-64">
      <div class="w-12 h-12 rounded-lg flex items-center justify-center text-xl" id="npArt" style="background:linear-gradient(135deg,#6366f1,#a855f7)">🎵</div>
      <div><p class="text-sm font-medium" id="npTitle">Select a song</p><p class="text-xs text-canvas-muted" id="npArtist">—</p></div>
      <button class="text-canvas-muted hover:text-white ml-2" id="likeBtn">♡</button>
    </div>
    <div class="flex flex-col items-center flex-1 max-w-xl">
      <div class="flex items-center gap-4 mb-1">
        <button class="ctrl-btn" id="shuffleBtn">🔀</button>
        <button class="ctrl-btn" id="prevBtn">⏮</button>
        <button class="play-btn" id="playBtn">▶</button>
        <button class="ctrl-btn" id="nextBtn">⏭</button>
        <button class="ctrl-btn" id="repeatBtn">🔁</button>
      </div>
      <div class="flex items-center gap-2 w-full">
        <span class="text-xs text-canvas-muted" id="currentTime">0:00</span>
        <input type="range" class="progress-bar flex-1" id="progressBar" min="0" max="100" value="0" />
        <span class="text-xs text-canvas-muted" id="totalTime">0:00</span>
      </div>
    </div>
    <div class="flex items-center gap-2 w-40">
      <span class="text-xs">🔊</span>
      <input type="range" class="volume-bar flex-1" id="volumeBar" min="0" max="100" value="75" />
    </div>
  </div>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.nav-item { display: block; padding: 8px 12px; border-radius: 8px; font-size: 0.85rem; color: #9ca3af; cursor: pointer; transition: all 0.15s; }
.nav-item:hover { color: white; }
.nav-item.active { color: white; font-weight: 600; }
.playlist-item { padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; color: #9ca3af; cursor: pointer; }
.playlist-item:hover { color: white; }
.playlist-item.active { color: #22c55e; }
.song-row { cursor: pointer; transition: background 0.15s; }
.song-row:hover { background: rgba(255,255,255,0.05); }
.song-row.playing { background: rgba(34,197,94,0.1); }
.song-row td { padding: 10px 0; font-size: 0.85rem; }
.song-row .song-num { color: #6b7280; width: 30px; }
.song-row.playing .song-num { color: #22c55e; }
.now-playing-bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; background: #111; border-top: 1px solid #1f2937; }
.play-btn { width: 36px; height: 36px; border-radius: 50%; background: white; color: #111; border: none; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.play-btn:hover { transform: scale(1.05); }
.ctrl-btn { background: none; border: none; color: #9ca3af; font-size: 0.9rem; cursor: pointer; }
.ctrl-btn:hover { color: white; }
.ctrl-btn.active { color: #22c55e; }
.progress-bar, .volume-bar { -webkit-appearance: none; height: 4px; border-radius: 4px; background: #374151; outline: none; }
.progress-bar::-webkit-slider-thumb, .volume-bar::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%; background: white; cursor: pointer; }
.progress-bar:hover::-webkit-slider-thumb { background: #22c55e; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const playlists = ['Chill Vibes', 'Workout Mix', 'Focus Flow', 'Late Night', 'Road Trip', 'Party Hits'];

const songs = [
  { title: 'Midnight Dreams', artist: 'Luna Eclipse', duration: '3:42', emoji: '🌙', bg: '#312e81' },
  { title: 'Ocean Waves', artist: 'Calm Collective', duration: '4:15', emoji: '🌊', bg: '#164e63' },
  { title: 'Electric Pulse', artist: 'Neon Flux', duration: '3:28', emoji: '⚡', bg: '#4c1d95' },
  { title: 'Summer Breeze', artist: 'Sunset Trio', duration: '3:55', emoji: '🌅', bg: '#92400e' },
  { title: 'Digital Rain', artist: 'CyberSynth', duration: '4:01', emoji: '💜', bg: '#831843' },
  { title: 'Mountain High', artist: 'Alpine Echo', duration: '3:18', emoji: '🏔️', bg: '#065f46' },
  { title: 'Neon City', artist: 'Metro Beats', duration: '3:52', emoji: '🌃', bg: '#1e1b4b' },
  { title: 'Starlight', artist: 'Cosmic Duo', duration: '4:33', emoji: '✨', bg: '#581c87' },
  { title: 'Rainy Day', artist: 'Acoustic Soul', duration: '3:45', emoji: '🌧️', bg: '#1e3a5f' },
  { title: 'Golden Hour', artist: 'Warm Tones', duration: '3:10', emoji: '☀️', bg: '#78350f' },
  { title: 'Deep Space', artist: 'Void', duration: '5:02', emoji: '🚀', bg: '#0c0a1e' },
  { title: 'Jazz Cafe', artist: 'Smooth Keys', duration: '4:20', emoji: '☕', bg: '#44403c' },
];

let currentSong = -1;
let isPlaying = false;
let shuffle = false;
let repeat = false;
let progress = 0;
let progressInterval = null;

document.getElementById('playlists').innerHTML = playlists.map((p, i) =>
  '<div class="playlist-item ' + (i === 0 ? 'active' : '') + '">' + p + '</div>'
).join('');

function renderSongs() {
  document.getElementById('songList').innerHTML = songs.map((s, i) =>
    '<tr class="song-row ' + (i === currentSong ? 'playing' : '') + '" data-idx="' + i + '">' +
    '<td class="song-num">' + (i === currentSong && isPlaying ? '♫' : (i + 1)) + '</td>' +
    '<td><div class="flex items-center gap-3"><div class="w-9 h-9 rounded flex items-center justify-center text-sm" style="background:' + s.bg + '">' + s.emoji + '</div><span class="font-medium">' + s.title + '</span></div></td>' +
    '<td class="text-canvas-muted">' + s.artist + '</td>' +
    '<td class="text-right text-canvas-muted-deep">' + s.duration + '</td></tr>'
  ).join('');
}
renderSongs();

function playSong(idx) {
  currentSong = idx;
  isPlaying = true;
  const s = songs[idx];
  document.getElementById('npTitle').textContent = s.title;
  document.getElementById('npArtist').textContent = s.artist;
  document.getElementById('npArt').textContent = s.emoji;
  document.getElementById('npArt').style.background = s.bg;
  document.getElementById('totalTime').textContent = s.duration;
  document.getElementById('playBtn').textContent = '⏸';
  progress = 0;
  document.getElementById('progressBar').value = 0;
  clearInterval(progressInterval);
  progressInterval = setInterval(() => {
    if (progress < 100) {
      progress += 0.5;
      document.getElementById('progressBar').value = progress;
      const parts = s.duration.split(':');
      const totalSec = parseInt(parts[0]) * 60 + parseInt(parts[1]);
      const curSec = Math.floor((progress / 100) * totalSec);
      document.getElementById('currentTime').textContent = Math.floor(curSec / 60) + ':' + String(curSec % 60).padStart(2, '0');
    } else {
      nextSong();
    }
  }, 200);
  renderSongs();
}

function nextSong() {
  if (shuffle) { playSong(Math.floor(Math.random() * songs.length)); }
  else if (repeat) { playSong(currentSong); }
  else { playSong((currentSong + 1) % songs.length); }
}

document.getElementById('songList').addEventListener('click', e => {
  const row = e.target.closest('.song-row');
  if (row) playSong(Number(row.dataset.idx));
});

document.getElementById('playBtn').addEventListener('click', () => {
  if (currentSong === -1) { playSong(0); return; }
  isPlaying = !isPlaying;
  document.getElementById('playBtn').textContent = isPlaying ? '⏸' : '▶';
  if (!isPlaying) clearInterval(progressInterval);
  else playSong(currentSong);
});

document.getElementById('nextBtn').addEventListener('click', () => nextSong());
document.getElementById('prevBtn').addEventListener('click', () => { playSong(currentSong > 0 ? currentSong - 1 : songs.length - 1); });
document.getElementById('shuffleBtn').addEventListener('click', function() { shuffle = !shuffle; this.classList.toggle('active'); });
document.getElementById('repeatBtn').addEventListener('click', function() { repeat = !repeat; this.classList.toggle('active'); });
document.getElementById('progressBar').addEventListener('input', e => { progress = Number(e.target.value); });

document.getElementById('likeBtn').addEventListener('click', function() {
  this.textContent = this.textContent === '♡' ? '💚' : '♡';
});
`,
      },
    ],
  },

  // 42. Movie Database
  {
    name: 'Movie Database',
    icon: '🎬',
    category: 'entertainment',
    description: 'Movie browsing app with poster grid, genre filters, ratings, detail modal, and watchlist.',
    prompt: 'Build a movie database with featured movie hero, genre filter tabs, movie poster grid with ratings, movie detail modal with cast and reviews, and a watchlist system.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CinemaDB — Movies</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-900 text-white font-sans min-h-screen">
  <div class="max-w-5xl mx-auto py-6 px-4">
    <header class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-bold">🎬 CinemaDB</h1>
      <div class="flex items-center gap-3">
        <input type="text" id="searchInput" class="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Search movies..." />
        <button id="watchlistBtn" class="text-sm bg-gray-800 border border-gray-700 px-3 py-2 rounded-xl">🔖 Watchlist (<span id="wlCount">0</span>)</button>
      </div>
    </header>

    <!-- Featured -->
    <div class="featured-movie mb-6" id="featured"></div>

    <!-- Genres -->
    <div class="flex gap-2 mb-5 overflow-x-auto pb-2" id="genreTabs"></div>

    <!-- Grid -->
    <div id="movieGrid" class="grid grid-cols-4 gap-4"></div>
  </div>

  <!-- Movie Modal -->
  <div id="movieModal" class="modal-overlay hidden">
    <div class="modal-card" id="modalContent"></div>
  </div>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.featured-movie { border-radius: 20px; padding: 40px; position: relative; overflow: hidden; min-height: 200px; display: flex; align-items: flex-end; }
.genre-tab { padding: 6px 14px; border-radius: 20px; font-size: 0.75rem; border: 1px solid #374151; background: transparent; color: #9ca3af; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
.genre-tab.active { background: #dc2626; color: white; border-color: #dc2626; }
.movie-card { border-radius: 14px; overflow: hidden; cursor: pointer; transition: all 0.2s; position: relative; }
.movie-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.4); }
.movie-poster { aspect-ratio: 2/3; display: flex; align-items: center; justify-content: center; font-size: 3rem; position: relative; }
.movie-overlay { position: absolute; inset: 0; background: linear-gradient(transparent 40%, rgba(0,0,0,0.9)); display: flex; flex-direction: column; justify-content: flex-end; padding: 12px; }
.rating-badge { background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 6px; font-size: 0.65rem; font-weight: 700; position: absolute; top: 8px; right: 8px; }
.wl-btn { position: absolute; top: 8px; left: 8px; background: rgba(0,0,0,0.6); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 0.8rem; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 50; }
.modal-overlay.hidden { display: none; }
.modal-card { background: #1f2937; border-radius: 20px; width: 100%; max-width: 550px; overflow: hidden; max-height: 90vh; overflow-y: auto; }
.star { color: #fbbf24; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const movies = [
  { id: 1, title: 'The Last Algorithm', genre: 'Sci-Fi', year: 2024, rating: 8.7, emoji: '🤖', bg: '#1e1b4b', desc: 'In a world where AI controls everything, one programmer discovers a hidden algorithm that could change humanity forever.', cast: ['Tom H.', 'Zendaya', 'Oscar Isaac'], reviews: [{ user: 'MovieFan', score: 9, text: 'Mind-blowing visuals and storyline!' }] },
  { id: 2, title: 'Whispers in the Dark', genre: 'Thriller', year: 2024, rating: 7.9, emoji: '🕵️', bg: '#1c1917', desc: 'A detective must solve a series of cryptic murders before the killer strikes again.', cast: ['Ana de Armas', 'Jake G.'], reviews: [{ user: 'CineBuff', score: 8, text: 'Edge of your seat thriller!' }] },
  { id: 3, title: 'Love in Tokyo', genre: 'Romance', year: 2024, rating: 7.4, emoji: '🗼', bg: '#831843', desc: 'Two strangers meet in Tokyo during cherry blossom season and discover an unexpected connection.', cast: ['Florence P.', 'Timothée C.'], reviews: [{ user: 'RomComLover', score: 8, text: 'Beautiful and heartwarming.' }] },
  { id: 4, title: 'Thunder Force', genre: 'Action', year: 2024, rating: 8.2, emoji: '⚡', bg: '#14532d', desc: 'A team of enhanced soldiers must save the world from an ancient force awakened by a rogue scientist.', cast: ['Chris H.', 'Gal Gadot'], reviews: [{ user: 'ActionHero', score: 9, text: 'Non-stop action!' }] },
  { id: 5, title: 'The Haunting of Elm Street', genre: 'Horror', year: 2024, rating: 7.1, emoji: '👻', bg: '#0c0a09', desc: 'A family moves into a historic house only to discover it holds terrifying secrets from the past.', cast: ['Lupita N.', 'Dev Patel'], reviews: [{ user: 'HorrorNerd', score: 7, text: 'Genuinely scary.' }] },
  { id: 6, title: 'Laugh Track', genre: 'Comedy', year: 2024, rating: 7.8, emoji: '😂', bg: '#713f12', desc: 'A struggling comedian accidentally goes viral and must navigate sudden fame while keeping what matters.', cast: ['Ke Huy Quan', 'Awkwafina'], reviews: [{ user: 'FunnyGuy', score: 8, text: 'Hilarious and touching!' }] },
  { id: 7, title: 'Deep Blue', genre: 'Sci-Fi', year: 2024, rating: 8.0, emoji: '🌊', bg: '#164e63', desc: 'An underwater expedition discovers a civilization at the bottom of the Mariana Trench.', cast: ['Idris Elba', 'Margot R.'], reviews: [] },
  { id: 8, title: 'The Great Escape 2', genre: 'Action', year: 2024, rating: 7.6, emoji: '🏃', bg: '#1e3a5f', desc: 'A group of prisoners devise an elaborate escape plan from a maximum-security facility.', cast: ['Pedro Pascal', 'John B.'], reviews: [] },
];

const genres = ['All', 'Sci-Fi', 'Thriller', 'Romance', 'Action', 'Horror', 'Comedy'];
let activeGenre = 'All';
let watchlist = new Set();

function renderGenres() {
  document.getElementById('genreTabs').innerHTML = genres.map(g =>
    '<button class="genre-tab ' + (g === activeGenre ? 'active' : '') + '" data-genre="' + g + '">' + g + '</button>'
  ).join('');
}

function renderFeatured() {
  const m = movies[0];
  document.getElementById('featured').style.background = 'linear-gradient(135deg, ' + m.bg + ', #111)';
  document.getElementById('featured').innerHTML =
    '<div><span class="text-xs bg-primary-600 px-2 py-0.5 rounded font-bold">★ ' + m.rating + '</span>' +
    '<h2 class="text-2xl font-bold mt-2 mb-1">' + m.title + '</h2>' +
    '<p class="text-sm text-canvas-text mb-2 max-w-md">' + m.desc + '</p>' +
    '<div class="flex gap-3"><button class="bg-primary-600 px-4 py-2 rounded-full text-sm font-bold hover:bg-primary-700">▶ Watch Trailer</button><button class="bg-gray-800 px-4 py-2 rounded-full text-sm hover:bg-gray-700">+ Watchlist</button></div></div>';
}

function renderGrid() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const filtered = movies.filter(m => (activeGenre === 'All' || m.genre === activeGenre) && m.title.toLowerCase().includes(search));
  document.getElementById('movieGrid').innerHTML = filtered.map(m =>
    '<div class="movie-card" data-id="' + m.id + '">' +
    '<div class="movie-poster" style="background:' + m.bg + '"><span class="rating-badge">★ ' + m.rating + '</span>' +
    '<button class="wl-btn" data-wl="' + m.id + '">' + (watchlist.has(m.id) ? '🔖' : '🏷️') + '</button>' +
    m.emoji + '<div class="movie-overlay"><h4 class="text-sm font-bold">' + m.title + '</h4><p class="text-xs text-canvas-muted">' + m.year + ' · ' + m.genre + '</p></div></div></div>'
  ).join('');
  document.getElementById('wlCount').textContent = watchlist.size;
}

function showModal(id) {
  const m = movies.find(mv => mv.id === id);
  if (!m) return;
  document.getElementById('modalContent').innerHTML =
    '<div style="background:' + m.bg + ';height:150px;display:flex;align-items:center;justify-content:center;font-size:4rem">' + m.emoji + '</div>' +
    '<div style="padding:20px"><div class="flex items-center justify-between mb-2"><h2 class="text-xl font-bold">' + m.title + '</h2><button onclick="document.getElementById(\'movieModal\').classList.add(\'hidden\')" class="text-2xl text-canvas-muted-deep">&times;</button></div>' +
    '<div class="flex gap-3 text-xs text-canvas-muted mb-3"><span>★ ' + m.rating + '/10</span><span>' + m.year + '</span><span>' + m.genre + '</span></div>' +
    '<p class="text-sm text-canvas-text mb-4">' + m.desc + '</p>' +
    '<h4 class="text-xs font-bold text-canvas-muted-deep uppercase mb-2">Cast</h4><div class="flex gap-2 mb-4">' + m.cast.map(c => '<span class="bg-gray-800 px-3 py-1 rounded-full text-xs">' + c + '</span>').join('') + '</div>' +
    (m.reviews.length ? '<h4 class="text-xs font-bold text-canvas-muted-deep uppercase mb-2">Reviews</h4>' + m.reviews.map(r => '<div class="bg-gray-800 rounded-xl p-3 mb-2"><div class="flex justify-between mb-1"><span class="text-xs font-bold">' + r.user + '</span><span class="text-xs star">' + '★'.repeat(Math.round(r.score / 2)) + '</span></div><p class="text-xs text-canvas-muted">' + r.text + '</p></div>').join('') : '') +
    '<button class="w-full bg-primary-600 py-2.5 rounded-xl text-sm font-bold mt-3 hover:bg-primary-700" data-wl="' + m.id + '">' + (watchlist.has(m.id) ? '✓ In Watchlist' : '+ Add to Watchlist') + '</button></div>';
  document.getElementById('movieModal').classList.remove('hidden');
}

renderGenres(); renderFeatured(); renderGrid();

document.getElementById('genreTabs').addEventListener('click', e => {
  const btn = e.target.closest('.genre-tab');
  if (!btn) return;
  activeGenre = btn.dataset.genre;
  renderGenres(); renderGrid();
});

document.getElementById('searchInput').addEventListener('input', renderGrid);

document.addEventListener('click', e => {
  const wl = e.target.closest('[data-wl]');
  if (wl) { e.stopPropagation(); const id = Number(wl.dataset.wl); watchlist.has(id) ? watchlist.delete(id) : watchlist.add(id); renderGrid(); return; }
  const card = e.target.closest('.movie-card');
  if (card) showModal(Number(card.dataset.id));
});

document.getElementById('movieModal').addEventListener('click', e => {
  if (e.target === document.getElementById('movieModal')) document.getElementById('movieModal').classList.add('hidden');
});
`,
      },
    ],
  },

  // 43. Gaming Landing
  {
    name: 'Gaming Landing',
    icon: '🎮',
    category: 'entertainment',
    description: 'Gaming landing page with hero banner, game showcase carousel, leaderboard, and system requirements.',
    prompt: 'Build a gaming landing page with animated hero banner, game carousel with screenshots, leaderboard table, system requirements section, and pre-order CTA.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NexusForge — The Game</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-950 text-white font-sans min-h-screen">
  <!-- Hero -->
  <div class="hero-section">
    <div class="hero-content text-center">
      <span class="text-xs bg-primary-600 px-3 py-1 rounded-full font-bold uppercase tracking-wider">🔥 Coming Dec 20, 2024</span>
      <h1 class="text-5xl font-black mt-4 mb-3 hero-title">NEXUS<span class="text-primary-500">FORGE</span></h1>
      <p class="text-canvas-muted max-w-md mx-auto mb-6">Enter a world where reality merges with the digital frontier. Build, fight, and forge your destiny.</p>
      <div class="flex gap-3 justify-center">
        <button class="bg-primary-600 hover:bg-primary-700 px-6 py-3 rounded-xl font-bold text-sm">🎮 Pre-Order Now — $59.99</button>
        <button class="border border-gray-700 hover:border-gray-500 px-6 py-3 rounded-xl font-bold text-sm">▶ Watch Trailer</button>
      </div>
    </div>
  </div>

  <div class="max-w-5xl mx-auto px-4 py-12">
    <!-- Features -->
    <div class="grid grid-cols-4 gap-4 mb-16">
      <div class="feature-card"><span class="text-3xl">🌍</span><h4 class="font-bold text-sm mt-2">Open World</h4><p class="text-xs text-canvas-muted-deep mt-1">100+ hours of exploration</p></div>
      <div class="feature-card"><span class="text-3xl">⚔️</span><h4 class="font-bold text-sm mt-2">Epic Combat</h4><p class="text-xs text-canvas-muted-deep mt-1">Dynamic combat system</p></div>
      <div class="feature-card"><span class="text-3xl">👥</span><h4 class="font-bold text-sm mt-2">Multiplayer</h4><p class="text-xs text-canvas-muted-deep mt-1">Up to 64 players co-op</p></div>
      <div class="feature-card"><span class="text-3xl">🏗️</span><h4 class="font-bold text-sm mt-2">Base Building</h4><p class="text-xs text-canvas-muted-deep mt-1">Create your fortress</p></div>
    </div>

    <!-- Screenshot Carousel -->
    <h2 class="text-2xl font-bold mb-6 text-center">🖼️ Screenshots</h2>
    <div class="carousel-container mb-16">
      <div id="carousel" class="carousel"></div>
      <div class="flex justify-center gap-2 mt-4" id="carouselDots"></div>
    </div>

    <!-- Leaderboard -->
    <h2 class="text-2xl font-bold mb-6 text-center">🏆 Global Leaderboard</h2>
    <div class="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden mb-16">
      <table class="w-full text-sm"><thead><tr class="text-xs text-canvas-muted-deep border-b border-gray-800"><th class="text-left p-4">RANK</th><th class="text-left p-4">PLAYER</th><th class="text-left p-4">LEVEL</th><th class="text-right p-4">SCORE</th></tr></thead>
      <tbody id="leaderboard"></tbody></table>
    </div>

    <!-- System Requirements -->
    <h2 class="text-2xl font-bold mb-6 text-center">💻 System Requirements</h2>
    <div class="grid grid-cols-2 gap-6 mb-16">
      <div class="spec-card">
        <h3 class="text-sm font-bold text-yellow-400 mb-4">Minimum</h3>
        <div class="space-y-2 text-sm text-canvas-muted">
          <p><b class="text-gray-200">OS:</b> Windows 10 64-bit</p>
          <p><b class="text-gray-200">CPU:</b> Intel i5-8400 / AMD Ryzen 5 2600</p>
          <p><b class="text-gray-200">RAM:</b> 16 GB</p>
          <p><b class="text-gray-200">GPU:</b> NVIDIA GTX 1060 / AMD RX 580</p>
          <p><b class="text-gray-200">Storage:</b> 80 GB SSD</p>
        </div>
      </div>
      <div class="spec-card recommended">
        <h3 class="text-sm font-bold text-green-400 mb-4">⭐ Recommended</h3>
        <div class="space-y-2 text-sm text-canvas-muted">
          <p><b class="text-gray-200">OS:</b> Windows 11 64-bit</p>
          <p><b class="text-gray-200">CPU:</b> Intel i7-12700K / AMD Ryzen 7 5800X</p>
          <p><b class="text-gray-200">RAM:</b> 32 GB</p>
          <p><b class="text-gray-200">GPU:</b> NVIDIA RTX 4070 / AMD RX 7800 XT</p>
          <p><b class="text-gray-200">Storage:</b> 80 GB NVMe SSD</p>
        </div>
      </div>
    </div>

    <!-- CTA -->
    <div class="text-center py-12 border-t border-gray-800">
      <h2 class="text-3xl font-black mb-3">Ready to <span class="text-primary-500">Forge</span> Your Destiny?</h2>
      <p class="text-canvas-muted mb-6">Pre-order now and get exclusive in-game items.</p>
      <button class="bg-primary-600 hover:bg-primary-700 px-8 py-4 rounded-xl font-bold text-lg">🎮 Pre-Order — $59.99</button>
    </div>
  </div>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.hero-section { min-height: 420px; display: flex; align-items: center; justify-content: center; background: radial-gradient(ellipse at center, var(--glow-primary) 0%, transparent 70%), linear-gradient(180deg, #0f0f0f, #030712); position: relative; overflow: hidden; }
.hero-title { text-shadow: 0 0 40px var(--glow-primary); letter-spacing: 4px; }
.feature-card { background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 20px; text-align: center; transition: all 0.2s; }
.feature-card:hover { border-color: #dc2626; transform: translateY(-2px); }
.carousel-container { position: relative; overflow: hidden; }
.carousel { display: flex; gap: 12px; overflow-x: auto; scroll-behavior: smooth; padding-bottom: 8px; scrollbar-width: none; }
.carousel::-webkit-scrollbar { display: none; }
.carousel-item { flex-shrink: 0; width: 280px; height: 160px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 3rem; cursor: pointer; transition: all 0.2s; }
.carousel-item:hover { transform: scale(1.03); }
.dot { width: 8px; height: 8px; border-radius: 50%; background: #374151; cursor: pointer; }
.dot.active { background: #dc2626; width: 24px; border-radius: 4px; }
.spec-card { background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 24px; }
.spec-card.recommended { border-color: #22c55e30; }
.rank-1 { color: #fbbf24; } .rank-2 { color: #d1d5db; } .rank-3 { color: #b45309; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `// Leaderboard
const players = [
  { rank: 1, name: 'ShadowBlade99', level: 87, score: 2847650, badge: '👑' },
  { rank: 2, name: 'NexusHunter', level: 82, score: 2634200, badge: '🥈' },
  { rank: 3, name: 'CyberPhoenix', level: 79, score: 2458100, badge: '🥉' },
  { rank: 4, name: 'VoidWalker', level: 76, score: 2201300, badge: '' },
  { rank: 5, name: 'PixelStorm', level: 74, score: 2089700, badge: '' },
  { rank: 6, name: 'IronForge42', level: 72, score: 1956400, badge: '' },
  { rank: 7, name: 'DarkMatter_X', level: 70, score: 1834200, badge: '' },
  { rank: 8, name: 'QuantumLeap', level: 68, score: 1712900, badge: '' },
];
document.getElementById('leaderboard').innerHTML = players.map(p => {
  const rc = p.rank <= 3 ? 'rank-' + p.rank : '';
  return '<tr class="border-b border-gray-800 hover:bg-gray-800"><td class="p-4 font-bold ' + rc + '">' + p.badge + ' #' + p.rank + '</td>' +
    '<td class="p-4 font-medium">' + p.name + '</td><td class="p-4 text-canvas-muted">Lv. ' + p.level + '</td>' +
    '<td class="p-4 text-right font-bold text-primary-400">' + p.score.toLocaleString() + '</td></tr>';
}).join('');

// Carousel
const screenshots = [
  { emoji: '🏔️', bg: 'linear-gradient(135deg, #1e3a5f, #312e81)', label: 'Open World' },
  { emoji: '⚔️', bg: 'linear-gradient(135deg, #7f1d1d, #450a0a)', label: 'Combat Arena' },
  { emoji: '🏗️', bg: 'linear-gradient(135deg, #065f46, #14532d)', label: 'Base Building' },
  { emoji: '🌊', bg: 'linear-gradient(135deg, #164e63, #0c4a6e)', label: 'Ocean Depths' },
  { emoji: '🌋', bg: 'linear-gradient(135deg, #78350f, #7f1d1d)', label: 'Volcanic Lands' },
  { emoji: '❄️', bg: 'linear-gradient(135deg, #1e3a5f, #312e81)', label: 'Frozen Wastes' },
];
let currentSlide = 0;
const carousel = document.getElementById('carousel');
carousel.innerHTML = screenshots.map((s, i) =>
  '<div class="carousel-item" style="background:' + s.bg + '" data-idx="' + i + '">' + s.emoji + '</div>'
).join('');

document.getElementById('carouselDots').innerHTML = screenshots.map((_, i) =>
  '<div class="dot ' + (i === 0 ? 'active' : '') + '" data-idx="' + i + '"></div>'
).join('');

function scrollTo(idx) {
  currentSlide = idx;
  carousel.children[idx].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === idx));
}

document.getElementById('carouselDots').addEventListener('click', e => {
  const dot = e.target.closest('.dot');
  if (dot) scrollTo(Number(dot.dataset.idx));
});

// Auto-scroll
setInterval(() => { scrollTo((currentSlide + 1) % screenshots.length); }, 4000);
`,
      },
    ],
  },

  // 44. Podcast App
  {
    name: 'Podcast App',
    icon: '🎙️',
    category: 'entertainment',
    description: 'Podcast listening app with show listings, episode player, playlist queue, and categories.',
    prompt: 'Build a podcast app with featured show hero, category browsing, episode list with play buttons, audio player bar with progress, and a listening queue sidebar.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PodWave — Podcasts</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-50 font-sans text-gray-800 min-h-screen pb-24">
  <div class="max-w-5xl mx-auto py-6 px-4">
    <header class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-bold text-purple-600">🎙️ PodWave</h1>
      <input type="text" id="searchPods" class="border rounded-xl px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-purple-300" placeholder="Search podcasts..." />
    </header>

    <!-- Categories -->
    <div class="flex gap-2 mb-6 overflow-x-auto pb-2" id="catTabs"></div>

    <!-- Featured -->
    <div class="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 mb-6 flex items-center gap-6">
      <div class="w-28 h-28 bg-white bg-opacity-20 rounded-xl flex items-center justify-center text-5xl">🎧</div>
      <div class="text-white">
        <span class="text-xs bg-white bg-opacity-20 px-2 py-0.5 rounded font-bold">🔥 TRENDING</span>
        <h2 class="text-2xl font-bold mt-2">The Dev Hour</h2>
        <p class="text-sm text-purple-100 mt-1">Weekly discussions on tech, coding, and the future of software.</p>
        <div class="flex gap-3 mt-3 text-xs text-purple-200"><span>📻 Technology</span><span>⏱ 45 min avg</span><span>⭐ 4.9</span></div>
      </div>
    </div>

    <div class="flex gap-6">
      <!-- Episodes -->
      <div class="flex-1">
        <h2 class="font-bold text-sm mb-4">📻 Latest Episodes</h2>
        <div id="episodes" class="space-y-3"></div>
      </div>

      <!-- Queue -->
      <div class="w-64 flex-shrink-0">
        <div class="bg-white rounded-xl border p-4 sticky top-6">
          <h3 class="font-bold text-sm mb-3">🎯 Up Next</h3>
          <div id="queue" class="space-y-2"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Player Bar -->
  <div class="player-bar" id="playerBar">
    <div class="flex items-center gap-3 w-64">
      <div class="w-12 h-12 rounded-lg flex items-center justify-center text-xl" id="pArt" style="background:#e0e7ff">🎙️</div>
      <div><p class="text-sm font-medium truncate" id="pTitle">Select an episode</p><p class="text-xs text-canvas-muted truncate" id="pShow">—</p></div>
    </div>
    <div class="flex flex-col items-center flex-1 max-w-xl">
      <div class="flex items-center gap-4 mb-1">
        <button class="text-canvas-muted hover:text-gray-600" id="pPrev">⏮</button>
        <button class="w-9 h-9 bg-purple-600 text-white rounded-full flex items-center justify-center hover:bg-purple-700" id="pPlay">▶</button>
        <button class="text-canvas-muted hover:text-gray-600" id="pNext">⏭</button>
        <select class="text-xs bg-gray-100 border-0 rounded px-1 py-0.5" id="speedCtrl"><option value="1">1x</option><option value="1.5">1.5x</option><option value="2">2x</option></select>
      </div>
      <div class="flex items-center gap-2 w-full"><span class="text-xs text-canvas-muted" id="pCur">0:00</span><input type="range" class="flex-1 progress" id="pBar" min="0" max="100" value="0" /><span class="text-xs text-canvas-muted" id="pDur">0:00</span></div>
    </div>
    <div class="flex items-center gap-2 w-32"><span class="text-sm">🔊</span><input type="range" class="flex-1 progress" min="0" max="100" value="75" /></div>
  </div>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.cat-tab { padding: 6px 14px; border-radius: 20px; font-size: 0.75rem; border: 1px solid #e5e7eb; background: white; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
.cat-tab.active { background: #7c3aed; color: white; border-color: #7c3aed; }
.episode-card { background: white; border: 1px solid #f3f4f6; border-radius: 14px; padding: 16px; display: flex; gap: 14px; cursor: pointer; transition: all 0.15s; }
.episode-card:hover { border-color: #c4b5fd; }
.episode-card.playing { border-color: #7c3aed; background: #faf5ff; }
.ep-art { width: 56px; height: 56px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0; }
.ep-play { width: 32px; height: 32px; border-radius: 50%; background: #7c3aed; color: white; border: none; font-size: 0.7rem; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ep-play:hover { background: #6d28d9; }
.queue-item { display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: 8px; font-size: 0.75rem; cursor: pointer; }
.queue-item:hover { background: #f5f3ff; }
.player-bar { position: fixed; bottom: 0; left: 0; right: 0; background: white; border-top: 1px solid #e5e7eb; padding: 10px 20px; display: flex; align-items: center; justify-content: space-between; z-index: 50; }
.progress { -webkit-appearance: none; height: 4px; border-radius: 4px; background: #e5e7eb; outline: none; }
.progress::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%; background: #7c3aed; cursor: pointer; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const categories = ['All', '💻 Technology', '💼 Business', '🎨 Creativity', '🧠 Self-Help', '😂 Comedy', '📚 Education'];
let activeCat = 'All';

const episodes = [
  { id: 1, title: 'The Future of AI in 2025', show: 'The Dev Hour', cat: '💻 Technology', duration: '48:32', emoji: '🤖', bg: '#e0e7ff', date: 'Dec 8' },
  { id: 2, title: 'Building a Startup from Zero', show: 'Hustle Cast', cat: '💼 Business', duration: '35:10', emoji: '🚀', bg: '#fef3c7', date: 'Dec 7' },
  { id: 3, title: 'Creative Block Breakers', show: 'Art & Soul', cat: '🎨 Creativity', duration: '27:45', emoji: '🎨', bg: '#fce7f3', date: 'Dec 7' },
  { id: 4, title: 'Habits That Stick', show: 'MindShift', cat: '🧠 Self-Help', duration: '42:18', emoji: '🧘', bg: '#d1fae5', date: 'Dec 6' },
  { id: 5, title: 'React vs Vue in 2025', show: 'The Dev Hour', cat: '💻 Technology', duration: '52:05', emoji: '⚛️', bg: '#e0e7ff', date: 'Dec 5' },
  { id: 6, title: 'Comedy Writing 101', show: 'Laughing Matters', cat: '😂 Comedy', duration: '30:00', emoji: '😂', bg: '#fef9c3', date: 'Dec 5' },
  { id: 7, title: 'Teaching in the Digital Age', show: 'EduTalk', cat: '📚 Education', duration: '38:22', emoji: '📖', bg: '#dbeafe', date: 'Dec 4' },
  { id: 8, title: 'Scaling Your SaaS', show: 'Hustle Cast', cat: '💼 Business', duration: '44:15', emoji: '📈', bg: '#fef3c7', date: 'Dec 3' },
];

let currentEp = -1;
let isPlaying = false;
let queue = [1, 2, 3];
let progress = 0;
let interval = null;

function renderCats() {
  document.getElementById('catTabs').innerHTML = categories.map(c =>
    '<button class="cat-tab ' + (c === activeCat ? 'active' : '') + '" data-cat="' + c + '">' + c + '</button>'
  ).join('');
}

function renderEpisodes() {
  const search = document.getElementById('searchPods').value.toLowerCase();
  const filtered = episodes.filter(e => (activeCat === 'All' || e.cat === activeCat) && (e.title.toLowerCase().includes(search) || e.show.toLowerCase().includes(search)));
  document.getElementById('episodes').innerHTML = filtered.map(e =>
    '<div class="episode-card ' + (e.id === currentEp ? 'playing' : '') + '" data-id="' + e.id + '">' +
    '<div class="ep-art" style="background:' + e.bg + '">' + e.emoji + '</div>' +
    '<div class="flex-1 min-w-0"><p class="text-sm font-bold">' + e.title + '</p><p class="text-xs text-canvas-muted">' + e.show + ' · ' + e.date + '</p></div>' +
    '<div class="flex items-center gap-3"><span class="text-xs text-canvas-muted">' + e.duration + '</span><button class="ep-play" data-play="' + e.id + '">' + (e.id === currentEp && isPlaying ? '⏸' : '▶') + '</button></div></div>'
  ).join('');
}

function renderQueue() {
  document.getElementById('queue').innerHTML = queue.map((id, i) => {
    const e = episodes.find(ep => ep.id === id);
    if (!e) return '';
    return '<div class="queue-item" data-id="' + e.id + '"><span class="text-canvas-text">' + (i + 1) + '.</span><div class="w-8 h-8 rounded flex items-center justify-center text-sm" style="background:' + e.bg + '">' + e.emoji + '</div><div class="flex-1 truncate"><p class="font-medium truncate">' + e.title + '</p><p class="text-canvas-muted">' + e.duration + '</p></div></div>';
  }).join('') || '<p class="text-xs text-canvas-muted">Queue is empty</p>';
}

function playEp(id) {
  const e = episodes.find(ep => ep.id === id);
  if (!e) return;
  currentEp = id; isPlaying = true; progress = 0;
  document.getElementById('pTitle').textContent = e.title;
  document.getElementById('pShow').textContent = e.show;
  document.getElementById('pArt').textContent = e.emoji;
  document.getElementById('pArt').style.background = e.bg;
  document.getElementById('pDur').textContent = e.duration;
  document.getElementById('pPlay').textContent = '⏸';
  document.getElementById('pBar').value = 0;
  clearInterval(interval);
  interval = setInterval(() => {
    if (progress < 100) { progress += 0.3; document.getElementById('pBar').value = progress;
      const parts = e.duration.split(':'); const secs = parseInt(parts[0]) * 60 + parseInt(parts[1]);
      const cur = Math.floor((progress / 100) * secs);
      document.getElementById('pCur').textContent = Math.floor(cur / 60) + ':' + String(cur % 60).padStart(2, '0');
    }
  }, 200);
  renderEpisodes(); renderQueue();
}

renderCats(); renderEpisodes(); renderQueue();

document.getElementById('catTabs').addEventListener('click', e => {
  const btn = e.target.closest('.cat-tab');
  if (!btn) return;
  activeCat = btn.dataset.cat; renderCats(); renderEpisodes();
});
document.getElementById('searchPods').addEventListener('input', renderEpisodes);

document.getElementById('episodes').addEventListener('click', e => {
  const playBtn = e.target.closest('[data-play]');
  if (playBtn) { playEp(Number(playBtn.dataset.play)); return; }
  const card = e.target.closest('.episode-card');
  if (card) { const id = Number(card.dataset.id); if (!queue.includes(id)) { queue.push(id); renderQueue(); } }
});

document.getElementById('pPlay').addEventListener('click', () => {
  if (currentEp === -1) return;
  isPlaying = !isPlaying;
  document.getElementById('pPlay').textContent = isPlaying ? '⏸' : '▶';
  if (!isPlaying) clearInterval(interval); else playEp(currentEp);
});
document.getElementById('pNext').addEventListener('click', () => {
  const idx = queue.indexOf(currentEp);
  if (idx >= 0 && idx < queue.length - 1) playEp(queue[idx + 1]);
});
document.getElementById('pPrev').addEventListener('click', () => {
  const idx = queue.indexOf(currentEp);
  if (idx > 0) playEp(queue[idx - 1]);
});
`,
      },
    ],
  },

  // 45. Streaming Platform
  {
    name: 'Streaming Platform',
    icon: '📺',
    category: 'entertainment',
    description: 'Video streaming homepage with hero banner, content rows, genre navigation, and watch modal.',
    prompt: 'Build a streaming platform homepage with featured content hero banner, horizontal scrollable content rows by genre, continue watching section, and a watch/detail modal.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>StreamVault</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-black text-white font-sans min-h-screen">
  <!-- Nav -->
  <nav class="fixed top-0 left-0 right-0 bg-gradient-to-b from-black to-transparent z-40 px-8 py-4 flex items-center justify-between">
    <div class="flex items-center gap-6">
      <h1 class="text-xl font-black text-primary-600">📺 StreamVault</h1>
      <div class="flex gap-4 text-sm text-canvas-text">
        <a class="hover:text-white font-medium">Home</a><a class="hover:text-white">Movies</a><a class="hover:text-white">Series</a><a class="hover:text-white">My List</a>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <input type="text" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm w-40 focus:outline-none" placeholder="Search..." />
      <div class="w-8 h-8 bg-primary-600 rounded flex items-center justify-center text-sm font-bold">A</div>
    </div>
  </nav>

  <!-- Hero -->
  <div class="hero-banner" id="heroBanner"></div>

  <div class="px-8 pb-12 -mt-20 relative z-10">
    <!-- Continue Watching -->
    <div class="content-row mb-8">
      <h2 class="row-title">▶ Continue Watching</h2>
      <div class="scroll-row" id="continueRow"></div>
    </div>

    <!-- Trending -->
    <div class="content-row mb-8">
      <h2 class="row-title">🔥 Trending Now</h2>
      <div class="scroll-row" id="trendingRow"></div>
    </div>

    <!-- Action -->
    <div class="content-row mb-8">
      <h2 class="row-title">⚔️ Action & Adventure</h2>
      <div class="scroll-row" id="actionRow"></div>
    </div>

    <!-- Comedy -->
    <div class="content-row mb-8">
      <h2 class="row-title">😂 Comedy</h2>
      <div class="scroll-row" id="comedyRow"></div>
    </div>

    <!-- Sci-Fi -->
    <div class="content-row mb-8">
      <h2 class="row-title">🚀 Sci-Fi & Fantasy</h2>
      <div class="scroll-row" id="scifiRow"></div>
    </div>
  </div>

  <!-- Detail Modal -->
  <div id="detailModal" class="modal-overlay hidden">
    <div class="modal-card" id="modalBody"></div>
  </div>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.hero-banner { height: 520px; position: relative; display: flex; align-items: flex-end; padding: 60px; }
.hero-banner::after { content: ''; position: absolute; inset: 0; background: linear-gradient(transparent 30%, rgba(0,0,0,0.95)); }
.hero-content { position: relative; z-index: 1; max-width: 500px; }
.row-title { font-size: 1rem; font-weight: 700; margin-bottom: 12px; }
.scroll-row { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 8px; scrollbar-width: none; }
.scroll-row::-webkit-scrollbar { display: none; }
.content-card { flex-shrink: 0; width: 180px; border-radius: 10px; overflow: hidden; cursor: pointer; position: relative; transition: transform 0.2s; }
.content-card:hover { transform: scale(1.05); z-index: 5; }
.card-poster { height: 105px; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; }
.card-info { padding: 8px; background: #1f2937; }
.progress-bar-sm { height: 3px; background: #374151; border-radius: 2px; margin-top: 4px; }
.progress-bar-sm .fill { height: 100%; background: #dc2626; border-radius: 2px; }
.match-badge { color: #22c55e; font-size: 0.65rem; font-weight: 700; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 50; }
.modal-overlay.hidden { display: none; }
.modal-card { background: #181818; border-radius: 16px; width: 100%; max-width: 600px; overflow: hidden; max-height: 90vh; overflow-y: auto; }
.modal-hero { height: 200px; display: flex; align-items: flex-end; padding: 20px; position: relative; }
.modal-hero::after { content: ''; position: absolute; inset: 0; background: linear-gradient(transparent, #181818); }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const allContent = [
  { id: 1, title: 'Cyber Nexus', genre: 'scifi', year: 2024, rating: '97%', emoji: '🤖', bg: '#312e81', match: 98, desc: 'In 2085, a rogue AI threatens to merge human consciousness with the digital realm.', episodes: 8, season: 'S1' },
  { id: 2, title: 'Shadow Ops', genre: 'action', year: 2024, rating: '92%', emoji: '🔫', bg: '#1c1917', match: 95, desc: 'An elite team of operatives take on impossible missions across the globe.', episodes: 10, season: 'S3' },
  { id: 3, title: 'Laugh Out Loud', genre: 'comedy', year: 2024, rating: '88%', emoji: '😂', bg: '#713f12', match: 89, desc: 'Four friends navigate life in the big city with disastrous and hilarious results.', episodes: 12, season: 'S2' },
  { id: 4, title: 'The Last Frontier', genre: 'scifi', year: 2024, rating: '95%', emoji: '🚀', bg: '#164e63', match: 96, desc: 'Humanity is journey to colonize a distant star system, facing unknown dangers.', episodes: 6, season: 'S1' },
  { id: 5, title: 'Iron Will', genre: 'action', year: 2023, rating: '90%', emoji: '⚔️', bg: '#7f1d1d', match: 91, desc: 'A medieval warrior rises from nothing to challenge a corrupt kingdom.', episodes: 8, season: 'S2' },
  { id: 6, title: 'Sitcom Central', genre: 'comedy', year: 2024, rating: '85%', emoji: '📺', bg: '#92400e', match: 84, desc: 'A behind-the-scenes look at a struggling TV show that becomes a surprise hit.', episodes: 10, season: 'S1' },
  { id: 7, title: 'Void Runners', genre: 'scifi', year: 2024, rating: '93%', emoji: '🌌', bg: '#1e1b4b', match: 93, desc: 'Space outlaws race across the galaxy to find a legendary lost planet.', episodes: 8, season: 'S1' },
  { id: 8, title: 'Street Kings', genre: 'action', year: 2024, rating: '87%', emoji: '🏙️', bg: '#1e3a5f', match: 86, desc: 'An undercover cop infiltrates a powerful crime syndicate in downtown LA.', episodes: 10, season: 'S4' },
  { id: 9, title: 'Date Night Disasters', genre: 'comedy', year: 2023, rating: '82%', emoji: '💑', bg: '#831843', match: 80, desc: 'A dating app that seems to perfectly match the worst possible couples.', episodes: 8, season: 'S1' },
  { id: 10, title: 'Quantum Break', genre: 'scifi', year: 2024, rating: '91%', emoji: '⏳', bg: '#581c87', match: 90, desc: 'A physicist accidentally fractures time, creating parallel realities that collide.', episodes: 6, season: 'S1' },
];

const continueWatching = [
  { ...allContent[0], progress: 65 },
  { ...allContent[1], progress: 30 },
  { ...allContent[3], progress: 80 },
  { ...allContent[7], progress: 15 },
];

function renderCard(item, showProgress) {
  let html = '<div class="content-card" data-id="' + item.id + '">' +
    '<div class="card-poster" style="background:' + item.bg + '">' + item.emoji + '</div>' +
    '<div class="card-info"><p class="text-xs font-medium truncate">' + item.title + '</p>' +
    '<div class="flex items-center gap-2"><span class="match-badge">' + item.match + '% Match</span><span class="text-xs text-canvas-muted-deep">' + item.season + '</span></div>';
  if (showProgress) { html += '<div class="progress-bar-sm"><div class="fill" style="width:' + item.progress + '%"></div></div>'; }
  html += '</div></div>';
  return html;
}

function renderRow(containerId, items, showProgress) {
  document.getElementById(containerId).innerHTML = items.map(i => renderCard(i, showProgress || false)).join('');
}

// Hero
const hero = allContent[0];
document.getElementById('heroBanner').style.background = 'linear-gradient(135deg, ' + hero.bg + ', #000)';
document.getElementById('heroBanner').innerHTML = '<div class="hero-content"><span class="text-xs bg-primary-600 px-2 py-0.5 rounded font-bold">TOP 10</span><h2 class="text-4xl font-black mt-2">' + hero.title + '</h2><p class="text-sm text-canvas-text mt-2">' + hero.desc + '</p><div class="flex gap-3 mt-4"><button class="bg-white text-black px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-200">▶ Play</button><button class="bg-gray-600 bg-opacity-70 px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-opacity-90">ℹ More Info</button></div></div>';

renderRow('continueRow', continueWatching, true);
renderRow('trendingRow', allContent.slice(0, 6));
renderRow('actionRow', allContent.filter(c => c.genre === 'action'));
renderRow('comedyRow', allContent.filter(c => c.genre === 'comedy'));
renderRow('scifiRow', allContent.filter(c => c.genre === 'scifi'));

// Modal
document.addEventListener('click', e => {
  const card = e.target.closest('.content-card');
  if (card) {
    const item = allContent.find(c => c.id === Number(card.dataset.id));
    if (!item) return;
    document.getElementById('modalBody').innerHTML =
      '<div class="modal-hero" style="background:linear-gradient(135deg,' + item.bg + ',#000)"><div style="position:relative;z-index:1;display:flex;align-items:flex-end;gap:16px;width:100%"><div style="font-size:4rem">' + item.emoji + '</div><div><h2 class="text-2xl font-bold">' + item.title + '</h2><div class="flex gap-3 mt-1 text-xs"><span class="match-badge text-sm">' + item.match + '% Match</span><span class="text-canvas-muted">' + item.year + '</span><span class="text-canvas-muted">' + item.episodes + ' Episodes</span></div></div><button onclick="document.getElementById(\'detailModal\').classList.add(\'hidden\')" class="ml-auto text-2xl text-canvas-muted" style="position:relative;z-index:2">&times;</button></div></div>' +
      '<div style="padding:20px"><div class="flex gap-3 mb-4"><button class="bg-white text-black px-6 py-2.5 rounded-lg font-bold text-sm">▶ Play</button><button class="bg-gray-700 px-4 py-2.5 rounded-lg text-sm">+ My List</button></div>' +
      '<p class="text-sm text-canvas-text mb-4">' + item.desc + '</p>' +
      '<div class="text-xs text-canvas-muted-deep"><p><b class="text-canvas-muted">Genre:</b> ' + item.genre.charAt(0).toUpperCase() + item.genre.slice(1) + '</p><p><b class="text-canvas-muted">Rating:</b> ' + item.rating + '</p><p><b class="text-canvas-muted">Season:</b> ' + item.season + ' · ' + item.episodes + ' episodes</p></div></div>';
    document.getElementById('detailModal').classList.remove('hidden');
  }
});
document.getElementById('detailModal').addEventListener('click', e => {
  if (e.target === document.getElementById('detailModal')) document.getElementById('detailModal').classList.add('hidden');
});
`,
      },
    ],
  },

  // 46. API Documentation
  {
    name: 'API Documentation',
    icon: '📡',
    category: 'tech',
    description: 'Interactive API reference with endpoint sidebar, method badges, request/response code blocks, and try-it-out panel.',
    prompt: 'Build an interactive API documentation page with an endpoint sidebar, method badges (GET/POST/PUT/DELETE), request and response code blocks, and a try-it-out panel.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>API Docs</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-950 text-gray-200 font-sans min-h-screen flex">
  <!-- Sidebar -->
  <aside class="w-64 bg-gray-900 border-r border-gray-800 overflow-y-auto fixed top-0 left-0 bottom-0">
    <div class="p-4 border-b border-gray-800">
      <h1 class="font-bold text-lg">📡 API Reference</h1>
      <p class="text-xs text-canvas-muted-deep mt-1">v2.4.0</p>
      <input type="text" id="searchInput" placeholder="Search endpoints..." class="w-full mt-3 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs focus:outline-none" />
    </div>
    <nav id="endpointNav" class="p-2"></nav>
  </aside>

  <!-- Main -->
  <main class="ml-64 flex-1">
    <!-- Header -->
    <div class="sticky top-0 bg-gray-950 border-b border-gray-800 px-8 py-4 z-10">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="font-bold text-lg" id="sectionTitle">Getting Started</h2>
          <p class="text-xs text-canvas-muted-deep" id="sectionDesc">Base URL: https://api.example.com/v2</p>
        </div>
        <div class="flex gap-2 text-xs">
          <span class="px-2 py-1 bg-green-900 text-green-300 rounded">Production</span>
          <span class="px-2 py-1 bg-gray-800 rounded">Bearer Auth</span>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div id="endpointDetail" class="p-8"></div>
  </main>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.method-badge { padding: 2px 8px; border-radius: 4px; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; }
.method-get { background: #065f46; color: #6ee7b7; }
.method-post { background: #1e3a5f; color: #93c5fd; }
.method-put { background: #713f12; color: #fde68a; }
.method-delete { background: #7f1d1d; color: #fca5a5; }
.code-block { background: #0d1117; border: 1px solid #21262d; border-radius: 8px; padding: 16px; font-family: 'Menlo', 'Courier New', monospace; font-size: 0.75rem; line-height: 1.6; overflow-x: auto; white-space: pre; }
.param-table { width: 100%; border-collapse: collapse; font-size: 0.75rem; }
.param-table th { text-align: left; padding: 8px 12px; background: #1f2937; font-weight: 600; border-bottom: 1px solid #374151; }
.param-table td { padding: 8px 12px; border-bottom: 1px solid #1f2937; }
.param-required { color: #f87171; font-size: 0.6rem; font-weight: 600; }
.param-optional { color: #6b7280; font-size: 0.6rem; }
.nav-item { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; margin-bottom: 2px; }
.nav-item:hover { background: #1f2937; }
.nav-item.active { background: #1e3a5f; color: #93c5fd; }
.nav-group-title { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; color: #6b7280; padding: 12px 10px 4px; letter-spacing: 0.05em; }
.try-panel { background: #111827; border: 1px solid #1f2937; border-radius: 10px; padding: 16px; }
.tab-btn { padding: 6px 14px; font-size: 0.75rem; border-radius: 6px; cursor: pointer; }
.tab-btn.active { background: #1e3a5f; color: #93c5fd; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const endpoints = [
  { group: 'Authentication', items: [
    { method: 'POST', path: '/auth/login', title: 'Login', desc: 'Authenticate user and get JWT token.',
      params: [{ name: 'email', type: 'string', required: true, desc: 'User email address' }, { name: 'password', type: 'string', required: true, desc: 'User password' }],
      reqBody: JSON.stringify({ email: 'user@example.com', password: 'securepass' }, null, 2),
      resBody: JSON.stringify({ token: 'eyJhbGciOiJIUzI1...', user: { id: 1, name: 'John', email: 'user@example.com' } }, null, 2), status: 200 },
    { method: 'POST', path: '/auth/register', title: 'Register', desc: 'Create a new user account.',
      params: [{ name: 'name', type: 'string', required: true, desc: 'Full name' }, { name: 'email', type: 'string', required: true, desc: 'Email address' }, { name: 'password', type: 'string', required: true, desc: 'Min 8 characters' }],
      reqBody: JSON.stringify({ name: 'Jane', email: 'jane@example.com', password: 'strongpass123' }, null, 2),
      resBody: JSON.stringify({ id: 2, name: 'Jane', email: 'jane@example.com', createdAt: '2024-01-15T10:00:00Z' }, null, 2), status: 201 },
  ]},
  { group: 'Users', items: [
    { method: 'GET', path: '/users', title: 'List Users', desc: 'Retrieve a paginated list of all users.',
      params: [{ name: 'page', type: 'integer', required: false, desc: 'Page number (default: 1)' }, { name: 'limit', type: 'integer', required: false, desc: 'Items per page (default: 20)' }],
      reqBody: null,
      resBody: JSON.stringify({ data: [{ id: 1, name: 'John', role: 'admin' }, { id: 2, name: 'Jane', role: 'user' }], total: 42, page: 1 }, null, 2), status: 200 },
    { method: 'GET', path: '/users/:id', title: 'Get User', desc: 'Retrieve a single user by their ID.',
      params: [{ name: 'id', type: 'string', required: true, desc: 'User ID (path param)' }],
      reqBody: null,
      resBody: JSON.stringify({ id: 1, name: 'John', email: 'john@example.com', role: 'admin', createdAt: '2024-01-01T00:00:00Z' }, null, 2), status: 200 },
    { method: 'PUT', path: '/users/:id', title: 'Update User', desc: 'Update user profile information.',
      params: [{ name: 'id', type: 'string', required: true, desc: 'User ID (path param)' }, { name: 'name', type: 'string', required: false, desc: 'Updated name' }],
      reqBody: JSON.stringify({ name: 'John Updated' }, null, 2),
      resBody: JSON.stringify({ id: 1, name: 'John Updated', email: 'john@example.com', updatedAt: '2024-01-20T12:00:00Z' }, null, 2), status: 200 },
    { method: 'DELETE', path: '/users/:id', title: 'Delete User', desc: 'Permanently delete a user account.',
      params: [{ name: 'id', type: 'string', required: true, desc: 'User ID (path param)' }],
      reqBody: null,
      resBody: JSON.stringify({ success: true, message: 'User deleted' }, null, 2), status: 200 },
  ]},
  { group: 'Projects', items: [
    { method: 'GET', path: '/projects', title: 'List Projects', desc: 'Retrieve all projects for the authenticated user.',
      params: [{ name: 'status', type: 'string', required: false, desc: 'Filter by status: active, archived' }],
      reqBody: null,
      resBody: JSON.stringify({ data: [{ id: 'p1', name: 'Website Redesign', status: 'active', tasks: 12 }], total: 5 }, null, 2), status: 200 },
    { method: 'POST', path: '/projects', title: 'Create Project', desc: 'Create a new project workspace.',
      params: [{ name: 'name', type: 'string', required: true, desc: 'Project name' }, { name: 'description', type: 'string', required: false, desc: 'Project description' }],
      reqBody: JSON.stringify({ name: 'New App', description: 'Building a new mobile app' }, null, 2),
      resBody: JSON.stringify({ id: 'p6', name: 'New App', status: 'active', createdAt: '2024-01-20T10:00:00Z' }, null, 2), status: 201 },
  ]},
];

let activeIdx = '0-0';

function renderNav() {
  const nav = document.getElementById('endpointNav');
  let html = '';
  endpoints.forEach((g, gi) => {
    html += '<div class="nav-group-title">' + g.group + '</div>';
    g.items.forEach((ep, ei) => {
      const id = gi + '-' + ei;
      html += '<div class="nav-item' + (id === activeIdx ? ' active' : '') + '" data-idx="' + id + '"><span class="method-badge method-' + ep.method.toLowerCase() + '">' + ep.method + '</span><span class="truncate">' + ep.title + '</span></div>';
    });
  });
  nav.innerHTML = html;
}

function renderDetail(ep) {
  document.getElementById('sectionTitle').textContent = ep.title;
  document.getElementById('sectionDesc').textContent = ep.method + ' ' + ep.path;
  const paramRows = ep.params.map(p =>
    '<tr><td class="font-mono text-blue-300">' + p.name + '</td><td class="text-canvas-muted">' + p.type + '</td><td>' + (p.required ? '<span class="param-required">required</span>' : '<span class="param-optional">optional</span>') + '</td><td class="text-canvas-muted">' + p.desc + '</td></tr>'
  ).join('');

  let html = '<div class="mb-8"><div class="flex items-center gap-3 mb-2"><span class="method-badge method-' + ep.method.toLowerCase() + '">' + ep.method + '</span><code class="text-sm font-mono text-canvas-text">' + ep.path + '</code></div><p class="text-sm text-canvas-muted">' + ep.desc + '</p></div>';

  html += '<div class="mb-6"><h3 class="text-sm font-bold mb-3">Parameters</h3><table class="param-table"><thead><tr><th>Name</th><th>Type</th><th>Required</th><th>Description</th></tr></thead><tbody>' + paramRows + '</tbody></table></div>';

  // Tabs
  html += '<div class="flex gap-2 mb-4"><button class="tab-btn active" data-tab="example">Example</button><button class="tab-btn" data-tab="tryit">Try It</button></div>';

  html += '<div id="tabExample"><div class="grid grid-cols-2 gap-4">';
  if (ep.reqBody) { html += '<div><h4 class="text-xs font-bold mb-2 text-canvas-muted">REQUEST BODY</h4><div class="code-block text-green-300">' + ep.reqBody + '</div></div>'; }
  html += '<div><h4 class="text-xs font-bold mb-2 text-canvas-muted">RESPONSE <span class="text-green-400">' + ep.status + '</span></h4><div class="code-block text-blue-300">' + ep.resBody + '</div></div>';
  if (!ep.reqBody) { html += '<div></div>'; }
  html += '</div></div>';

  html += '<div id="tabTryit" class="hidden"><div class="try-panel"><h4 class="text-xs font-bold mb-3 text-canvas-muted">TRY IT OUT</h4>';
  ep.params.forEach(p => {
    html += '<div class="mb-3"><label class="text-xs text-canvas-muted block mb-1">' + p.name + (p.required ? ' *' : '') + '</label><input type="text" class="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-xs focus:outline-none" placeholder="' + p.type + '" /></div>';
  });
  html += '<button id="sendBtn" class="bg-blue-600 px-4 py-2 rounded text-sm font-bold mt-2 hover:bg-blue-500">Send Request</button><div id="tryResult" class="mt-4"></div></div></div>';

  document.getElementById('endpointDetail').innerHTML = html;

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tabExample').classList.toggle('hidden', btn.dataset.tab !== 'example');
      document.getElementById('tabTryit').classList.toggle('hidden', btn.dataset.tab !== 'tryit');
    });
  });

  const sendBtn = document.getElementById('sendBtn');
  if (sendBtn) {
    sendBtn.addEventListener('click', () => {
      document.getElementById('tryResult').innerHTML = '<div class="code-block text-green-300 mt-2"><span class="text-canvas-muted-deep">// Response ' + ep.status + '</span>\\n' + ep.resBody + '</div>';
    });
  }
}

renderNav();
const first = endpoints[0].items[0];
renderDetail(first);

document.getElementById('endpointNav').addEventListener('click', e => {
  const item = e.target.closest('.nav-item');
  if (!item) return;
  activeIdx = item.dataset.idx;
  const [gi, ei] = activeIdx.split('-').map(Number);
  renderDetail(endpoints[gi].items[ei]);
  renderNav();
});

document.getElementById('searchInput').addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('.nav-item').forEach(el => {
    el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
});
`,
      },
    ],
  },

  // 47. CLI Dashboard
  {
    name: 'CLI Dashboard',
    icon: '💻',
    category: 'tech',
    description: 'Terminal-styled dashboard with system stats, process list, live logs, and command input.',
    prompt: 'Build a terminal-styled CLI dashboard showing system stats, a process list, scrolling log output, and a command input with simulated responses.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CLI Dashboard</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-950 text-green-400 font-mono min-h-screen p-4">
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
      <div>
        <span class="text-green-500 font-bold">💻 sys-monitor</span>
        <span class="text-gray-600 text-sm ml-2">v3.1.0</span>
      </div>
      <div class="flex gap-4 text-xs text-canvas-muted-deep">
        <span id="uptime">Uptime: 0d 0h 0m</span>
        <span id="clock"></span>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="grid grid-cols-4 gap-3 mb-4">
      <div class="stat-card"><div class="text-xs text-canvas-muted-deep">CPU</div><div class="text-xl font-bold" id="cpuVal">0%</div><div class="bar"><div class="bar-fill bg-green-500" id="cpuBar"></div></div></div>
      <div class="stat-card"><div class="text-xs text-canvas-muted-deep">MEMORY</div><div class="text-xl font-bold" id="memVal">0%</div><div class="bar"><div class="bar-fill bg-blue-500" id="memBar"></div></div></div>
      <div class="stat-card"><div class="text-xs text-canvas-muted-deep">DISK</div><div class="text-xl font-bold" id="diskVal">0%</div><div class="bar"><div class="bar-fill bg-yellow-500" id="diskBar"></div></div></div>
      <div class="stat-card"><div class="text-xs text-canvas-muted-deep">NETWORK</div><div class="text-xl font-bold" id="netVal">0 KB/s</div><div class="bar"><div class="bar-fill bg-purple-500" id="netBar"></div></div></div>
    </div>

    <div class="grid grid-cols-2 gap-3 mb-4">
      <!-- Processes -->
      <div class="panel">
        <div class="panel-header">PROCESSES <span class="text-gray-600" id="procCount">(0)</span></div>
        <table class="w-full text-xs"><thead><tr class="text-gray-600"><th class="text-left p-1">PID</th><th class="text-left p-1">NAME</th><th class="text-right p-1">CPU%</th><th class="text-right p-1">MEM</th><th class="text-right p-1">STATUS</th></tr></thead><tbody id="procTable"></tbody></table>
      </div>

      <!-- Logs -->
      <div class="panel">
        <div class="panel-header">LIVE LOGS</div>
        <div id="logOutput" class="log-area"></div>
      </div>
    </div>

    <!-- Command Input -->
    <div class="panel">
      <div class="flex items-center gap-2">
        <span class="text-green-600">$</span>
        <input type="text" id="cmdInput" class="flex-1 bg-transparent border-none text-green-400 focus:outline-none text-sm" placeholder="Type a command (help, status, clear, ps, neofetch)..." autofocus />
      </div>
      <div id="cmdOutput" class="mt-2 text-xs text-canvas-muted"></div>
    </div>
  </div>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.stat-card { background: #0d1117; border: 1px solid #1f2937; border-radius: 8px; padding: 12px; }
.bar { height: 4px; background: #1f2937; border-radius: 2px; margin-top: 6px; }
.bar-fill { height: 100%; border-radius: 2px; transition: width 0.5s; }
.panel { background: #0d1117; border: 1px solid #1f2937; border-radius: 8px; padding: 12px; }
.panel-header { font-size: 0.7rem; font-weight: 700; color: #6b7280; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #1f2937; }
.log-area { height: 200px; overflow-y: auto; font-size: 0.7rem; line-height: 1.6; scrollbar-width: thin; scrollbar-color: #374151 transparent; }
.log-info { color: #93c5fd; }
.log-warn { color: #fbbf24; }
.log-error { color: #f87171; }
.log-success { color: #4ade80; }
#procTable tr { border-bottom: 1px solid #111827; }
#procTable td { padding: 4px; }
.status-running { color: #4ade80; }
.status-sleeping { color: #6b7280; }
.status-stopped { color: #f87171; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const processes = [
  { pid: 1, name: 'systemd', cpu: 0.1, mem: '12M', status: 'running' },
  { pid: 342, name: 'nginx', cpu: 2.4, mem: '48M', status: 'running' },
  { pid: 567, name: 'node', cpu: 15.3, mem: '256M', status: 'running' },
  { pid: 891, name: 'postgres', cpu: 5.7, mem: '128M', status: 'running' },
  { pid: 1023, name: 'redis-server', cpu: 1.2, mem: '32M', status: 'running' },
  { pid: 1456, name: 'cron', cpu: 0.0, mem: '4M', status: 'sleeping' },
  { pid: 1789, name: 'sshd', cpu: 0.3, mem: '8M', status: 'running' },
  { pid: 2001, name: 'pm2', cpu: 3.8, mem: '64M', status: 'running' },
];

const logMsgs = [
  { level: 'info', msg: 'Request GET /api/users completed in 42ms' },
  { level: 'info', msg: 'Cache hit for key: session_abc123' },
  { level: 'warn', msg: 'Memory usage exceeding 80% threshold' },
  { level: 'info', msg: 'New WebSocket connection from 192.168.1.42' },
  { level: 'error', msg: 'Failed to connect to replica db-secondary:5432' },
  { level: 'success', msg: 'Database backup completed successfully' },
  { level: 'info', msg: 'Request POST /api/auth/login completed in 118ms' },
  { level: 'warn', msg: 'Rate limit approaching for IP 10.0.0.55' },
  { level: 'info', msg: 'Scheduled job "cleanup_sessions" started' },
  { level: 'success', msg: 'SSL certificate renewed, expires 2025-03-15' },
  { level: 'error', msg: 'Unhandled rejection in worker thread #3' },
  { level: 'info', msg: 'CDN cache purged for /assets/*' },
];

function updateStats() {
  const cpu = Math.floor(Math.random() * 40 + 20);
  const mem = Math.floor(Math.random() * 30 + 50);
  const disk = 67;
  const net = Math.floor(Math.random() * 500 + 100);
  document.getElementById('cpuVal').textContent = cpu + '%';
  document.getElementById('cpuBar').style.width = cpu + '%';
  document.getElementById('memVal').textContent = mem + '%';
  document.getElementById('memBar').style.width = mem + '%';
  document.getElementById('diskVal').textContent = disk + '%';
  document.getElementById('diskBar').style.width = disk + '%';
  document.getElementById('netVal').textContent = net + ' KB/s';
  document.getElementById('netBar').style.width = Math.min(net / 6, 100) + '%';
}

function renderProcs() {
  const tbody = document.getElementById('procTable');
  tbody.innerHTML = processes.map(p => {
    p.cpu = Math.max(0, +(p.cpu + (Math.random() - 0.5) * 2).toFixed(1));
    return '<tr><td class="text-canvas-muted-deep">' + p.pid + '</td><td>' + p.name + '</td><td class="text-right">' + p.cpu + '</td><td class="text-right text-canvas-muted-deep">' + p.mem + '</td><td class="text-right status-' + p.status + '">' + p.status + '</td></tr>';
  }).join('');
  document.getElementById('procCount').textContent = '(' + processes.length + ')';
}

function addLog() {
  const log = logMsgs[Math.floor(Math.random() * logMsgs.length)];
  const time = new Date().toLocaleTimeString();
  const area = document.getElementById('logOutput');
  area.innerHTML += '<div class="log-' + log.level + '">[' + time + '] ' + log.level.toUpperCase() + ': ' + log.msg + '</div>';
  area.scrollTop = area.scrollHeight;
  if (area.children.length > 100) area.removeChild(area.firstChild);
}

function updateClock() {
  document.getElementById('clock').textContent = new Date().toLocaleString();
}

let uptimeSec = 86400 + 3600 * 7 + 42 * 60;
function updateUptime() {
  uptimeSec++;
  const d = Math.floor(uptimeSec / 86400);
  const h = Math.floor((uptimeSec % 86400) / 3600);
  const m = Math.floor((uptimeSec % 3600) / 60);
  document.getElementById('uptime').textContent = 'Uptime: ' + d + 'd ' + h + 'h ' + m + 'm';
}

const commands = {
  help: 'Available commands: help, status, clear, ps, neofetch, uptime, whoami',
  status: 'All systems operational ✅  |  8 processes running  |  0 critical alerts',
  clear: '__CLEAR__',
  ps: processes.map(p => p.pid + '  ' + p.name.padEnd(16) + p.status).join('\\n'),
  neofetch: '       .--.\\n      |o_o |      OS: Linux 6.1\\n      |:_/ |      Host: cloud-vm-01\\n     //   \\\\ \\\\     Kernel: 6.1.0-amd64\\n    (|     | )    Shell: bash 5.2\\n   /\\'\\\\   /\\'\\\\     CPU: 8 vCPU @ 2.4GHz\\n   \\\\___)=(___/    RAM: 16GB DDR4',
  uptime: 'up ' + Math.floor(uptimeSec / 86400) + ' days, ' + Math.floor((uptimeSec % 86400) / 3600) + ' hours',
  whoami: 'root@cloud-vm-01',
};

document.getElementById('cmdInput').addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    const val = e.target.value.trim().toLowerCase();
    e.target.value = '';
    if (!val) return;
    const output = document.getElementById('cmdOutput');
    if (val === 'clear') { output.innerHTML = ''; return; }
    const result = commands[val] || 'Command not found: ' + val + '. Type "help" for available commands.';
    output.innerHTML += '<div class="text-green-600 mt-1">$ ' + val + '</div><pre class="text-canvas-muted whitespace-pre">' + result + '</pre>';
    output.scrollTop = output.scrollHeight;
  }
});

updateStats(); renderProcs(); updateClock(); updateUptime();
setInterval(updateStats, 2000);
setInterval(renderProcs, 3000);
setInterval(addLog, 1500);
setInterval(updateClock, 1000);
setInterval(updateUptime, 1000);
`,
      },
    ],
  },

  // 48. Status Page
  {
    name: 'Status Page',
    icon: '🟢',
    category: 'tech',
    description: 'Service status monitoring page with uptime bars, incident history, and real-time status indicators.',
    prompt: 'Build a service status page showing current operational status for multiple services, 90-day uptime bars, incident history timeline, and scheduled maintenance.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Status Page</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-950 text-gray-200 font-sans min-h-screen">
  <div class="max-w-3xl mx-auto px-6 py-12">
    <!-- Header -->
    <div class="text-center mb-10">
      <h1 class="text-2xl font-bold">🟢 System Status</h1>
      <p class="text-canvas-muted-deep text-sm mt-1">Real-time monitoring for all services</p>
    </div>

    <!-- Overall Status -->
    <div id="overallBanner" class="overall-banner mb-8"></div>

    <!-- Services -->
    <div class="mb-10">
      <h2 class="text-sm font-bold text-canvas-muted mb-4">CURRENT STATUS</h2>
      <div id="serviceList" class="space-y-3"></div>
    </div>

    <!-- Uptime -->
    <div class="mb-10">
      <h2 class="text-sm font-bold text-canvas-muted mb-4">90-DAY UPTIME</h2>
      <div id="uptimeBars" class="space-y-4"></div>
    </div>

    <!-- Incidents -->
    <div class="mb-10">
      <h2 class="text-sm font-bold text-canvas-muted mb-4">RECENT INCIDENTS</h2>
      <div id="incidentList" class="space-y-4"></div>
    </div>

    <!-- Scheduled -->
    <div>
      <h2 class="text-sm font-bold text-canvas-muted mb-4">SCHEDULED MAINTENANCE</h2>
      <div id="maintenanceList" class="space-y-3"></div>
    </div>

    <div class="text-center mt-12 text-xs text-gray-600">Last updated: <span id="lastUpdate"></span></div>
  </div>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.overall-banner { padding: 16px 20px; border-radius: 10px; font-weight: 700; font-size: 0.9rem; }
.banner-ok { background: #052e16; color: #4ade80; border: 1px solid #166534; }
.banner-degraded { background: #451a03; color: #fbbf24; border: 1px solid #92400e; }
.banner-outage { background: #450a0a; color: #f87171; border: 1px solid #991b1b; }
.service-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #111827; border-radius: 8px; }
.status-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.dot-operational { background: #4ade80; box-shadow: 0 0 6px #4ade80; }
.dot-degraded { background: #fbbf24; box-shadow: 0 0 6px #fbbf24; }
.dot-outage { background: #f87171; box-shadow: 0 0 6px #f87171; }
.dot-maintenance { background: #60a5fa; box-shadow: 0 0 6px #60a5fa; }
.uptime-bars { display: flex; gap: 1px; height: 28px; }
.uptime-day { flex: 1; border-radius: 2px; cursor: pointer; position: relative; }
.uptime-day.up { background: #22c55e; }
.uptime-day.degraded { background: #eab308; }
.uptime-day.down { background: #ef4444; }
.uptime-tooltip { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: #1f2937; padding: 4px 8px; border-radius: 6px; font-size: 0.6rem; white-space: nowrap; display: none; z-index: 10; }
.uptime-day:hover .uptime-tooltip { display: block; }
.incident-card { padding: 16px; background: #111827; border-radius: 8px; border-left: 3px solid; }
.incident-resolved { border-color: #22c55e; }
.incident-investigating { border-color: #eab308; }
.incident-identified { border-color: #f97316; }
.maint-card { padding: 12px 16px; background: #111827; border-radius: 8px; border-left: 3px solid #3b82f6; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const services = [
  { name: 'API Server', status: 'operational', uptime: 99.98 },
  { name: 'Web Application', status: 'operational', uptime: 99.95 },
  { name: 'Database Cluster', status: 'operational', uptime: 99.99 },
  { name: 'CDN / Static Assets', status: 'operational', uptime: 100 },
  { name: 'Email Service', status: 'degraded', uptime: 98.7 },
  { name: 'WebSocket Gateway', status: 'operational', uptime: 99.92 },
  { name: 'Background Workers', status: 'operational', uptime: 99.88 },
  { name: 'Authentication', status: 'operational', uptime: 99.97 },
];

const incidents = [
  { title: 'Email delivery delays', date: 'Jan 18, 2025', status: 'investigating', updates: [
    { time: '14:30 UTC', text: 'We are investigating reports of delayed email delivery.' },
    { time: '14:15 UTC', text: 'Monitoring systems detected elevated email queue latency.' },
  ]},
  { title: 'API latency spike', date: 'Jan 15, 2025', status: 'resolved', updates: [
    { time: '10:00 UTC', text: 'Issue resolved. Root cause was a misconfigured load balancer rule.' },
    { time: '09:20 UTC', text: 'Fix deployed. Monitoring for recovery.' },
    { time: '09:00 UTC', text: 'Identified increased latency on API endpoints due to load balancer misconfiguration.' },
  ]},
  { title: 'Database failover event', date: 'Jan 10, 2025', status: 'resolved', updates: [
    { time: '03:45 UTC', text: 'Failover completed successfully. All services restored.' },
    { time: '03:30 UTC', text: 'Primary database node became unresponsive. Automatic failover initiated.' },
  ]},
];

const maintenance = [
  { title: 'Database migration v4.2', date: 'Jan 25, 2025 02:00-04:00 UTC', desc: 'Schema migration and index optimization. Brief read-only mode expected.' },
  { title: 'Infrastructure upgrade', date: 'Feb 1, 2025 01:00-03:00 UTC', desc: 'Upgrading Kubernetes cluster to v1.29. Rolling restart of all pods.' },
];

// Overall
const hasOutage = services.some(s => s.status === 'outage');
const hasDegraded = services.some(s => s.status === 'degraded');
const banner = document.getElementById('overallBanner');
if (hasOutage) { banner.className = 'overall-banner mb-8 banner-outage'; banner.textContent = '⚠ Major System Outage'; }
else if (hasDegraded) { banner.className = 'overall-banner mb-8 banner-degraded'; banner.textContent = '⚡ Partial System Degradation'; }
else { banner.className = 'overall-banner mb-8 banner-ok'; banner.textContent = '✓ All Systems Operational'; }

// Services
document.getElementById('serviceList').innerHTML = services.map(s => {
  const label = s.status === 'operational' ? 'Operational' : s.status === 'degraded' ? 'Degraded Performance' : 'Major Outage';
  return '<div class="service-row"><div class="flex items-center gap-3"><div class="status-dot dot-' + s.status + '"></div><span class="text-sm">' + s.name + '</span></div><span class="text-xs text-canvas-muted-deep">' + label + '</span></div>';
}).join('');

// Uptime bars
function genDays() {
  const days = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const r = Math.random();
    let st = 'up';
    if (r > 0.97) st = 'down'; else if (r > 0.93) st = 'degraded';
    days.push({ date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), status: st });
  }
  return days;
}

document.getElementById('uptimeBars').innerHTML = services.slice(0, 4).map(s => {
  const days = genDays();
  const bars = days.map(d => '<div class="uptime-day ' + d.status + '"><div class="uptime-tooltip">' + d.date + ' — ' + d.status + '</div></div>').join('');
  return '<div><div class="flex justify-between text-xs mb-1"><span>' + s.name + '</span><span class="text-canvas-muted-deep">' + s.uptime + '% uptime</span></div><div class="uptime-bars">' + bars + '</div></div>';
}).join('');

// Incidents
document.getElementById('incidentList').innerHTML = incidents.map(inc => {
  const updates = inc.updates.map(u => '<div class="text-xs mt-2"><span class="text-canvas-muted-deep">' + u.time + '</span> <span class="text-canvas-text">' + u.text + '</span></div>').join('');
  return '<div class="incident-card incident-' + inc.status + '"><div class="flex justify-between"><span class="font-bold text-sm">' + inc.title + '</span><span class="text-xs text-canvas-muted-deep">' + inc.date + '</span></div><span class="text-xs font-medium ' + (inc.status === 'resolved' ? 'text-green-400' : 'text-yellow-400') + '">' + inc.status.charAt(0).toUpperCase() + inc.status.slice(1) + '</span>' + updates + '</div>';
}).join('');

// Maintenance
document.getElementById('maintenanceList').innerHTML = maintenance.map(m =>
  '<div class="maint-card"><div class="font-medium text-sm">' + m.title + '</div><div class="text-xs text-blue-400 mt-1">🔧 ' + m.date + '</div><p class="text-xs text-canvas-muted mt-1">' + m.desc + '</p></div>'
).join('');

document.getElementById('lastUpdate').textContent = new Date().toLocaleString();
`,
      },
    ],
  },

  // 49. Changelog
  {
    name: 'Changelog',
    icon: '📋',
    category: 'tech',
    description: 'Product changelog with version entries, type badges, search, and filter by change type.',
    prompt: 'Build a product changelog page with versioned release entries, type badges (feature, fix, improvement, breaking), search, and filter by change type.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Changelog</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-950 text-gray-200 font-sans min-h-screen">
  <div class="max-w-3xl mx-auto px-6 py-12">
    <div class="text-center mb-10">
      <h1 class="text-3xl font-bold">📋 Changelog</h1>
      <p class="text-canvas-muted-deep mt-2">All notable changes to the platform</p>
    </div>

    <!-- Controls -->
    <div class="flex items-center gap-3 mb-8 flex-wrap">
      <input type="text" id="searchInput" class="flex-1 min-w-0 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none" placeholder="Search changes..." />
      <div class="flex gap-2" id="filterBtns">
        <button class="filter-btn active" data-type="all">All</button>
        <button class="filter-btn" data-type="feature">✨ Feature</button>
        <button class="filter-btn" data-type="fix">🐛 Fix</button>
        <button class="filter-btn" data-type="improvement">⚡ Improvement</button>
        <button class="filter-btn" data-type="breaking">💥 Breaking</button>
      </div>
    </div>

    <!-- Releases -->
    <div id="releases" class="space-y-8"></div>
  </div>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.filter-btn { padding: 4px 12px; font-size: 0.75rem; border-radius: 20px; background: #1f2937; color: #9ca3af; cursor: pointer; border: 1px solid transparent; white-space: nowrap; }
.filter-btn:hover { background: #374151; }
.filter-btn.active { background: #1e3a5f; color: #93c5fd; border-color: #2563eb; }
.release-card { background: #111827; border-radius: 12px; padding: 24px; border: 1px solid #1f2937; }
.version-badge { font-size: 1.1rem; font-weight: 800; color: #fff; }
.date-label { font-size: 0.75rem; color: #6b7280; }
.type-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; }
.badge-feature { background: #064e3b; color: #6ee7b7; }
.badge-fix { background: #7f1d1d; color: #fca5a5; }
.badge-improvement { background: #1e3a5f; color: #93c5fd; }
.badge-breaking { background: #581c87; color: #d8b4fe; }
.change-item { display: flex; gap: 10px; align-items: flex-start; padding: 8px 0; border-bottom: 1px solid #1f2937; }
.change-item:last-child { border-bottom: none; }
.timeline-dot { width: 8px; height: 8px; border-radius: 50%; background: #4b5563; margin-top: 6px; flex-shrink: 0; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `const releases = [
  { version: '2.4.0', date: 'January 20, 2025', changes: [
    { type: 'feature', text: 'Added real-time collaboration with live cursors and presence indicators' },
    { type: 'feature', text: 'New AI-powered code completion engine with multi-language support' },
    { type: 'improvement', text: 'Reduced initial load time by 40% with lazy-loaded modules' },
    { type: 'fix', text: 'Fixed file upload hanging on files larger than 50MB' },
    { type: 'fix', text: 'Resolved WebSocket reconnection loop in unstable network conditions' },
  ]},
  { version: '2.3.2', date: 'January 10, 2025', changes: [
    { type: 'fix', text: 'Fixed dashboard charts not rendering on Safari 17' },
    { type: 'fix', text: 'Corrected timezone handling in scheduled task execution' },
    { type: 'improvement', text: 'Optimized database queries for project listing — 3x faster' },
  ]},
  { version: '2.3.0', date: 'December 28, 2024', changes: [
    { type: 'feature', text: 'Introduced team workspaces with role-based permissions' },
    { type: 'feature', text: 'Added dark/light theme toggle with system preference detection' },
    { type: 'improvement', text: 'Redesigned settings page with categorized sections' },
    { type: 'breaking', text: 'Removed deprecated v1 API endpoints — migrate to v2 endpoints' },
    { type: 'fix', text: 'Fixed notification bell not clearing badge count after viewing' },
  ]},
  { version: '2.2.0', date: 'December 15, 2024', changes: [
    { type: 'feature', text: 'Export projects as ZIP with all assets and configuration' },
    { type: 'feature', text: 'Added webhook support for CI/CD pipeline integration' },
    { type: 'improvement', text: 'Enhanced search with fuzzy matching and highlighted results' },
    { type: 'fix', text: 'Fixed drag-and-drop reordering in kanban board on Firefox' },
  ]},
  { version: '2.1.0', date: 'November 30, 2024', changes: [
    { type: 'feature', text: 'GitHub and GitLab integration for direct repository sync' },
    { type: 'breaking', text: 'Changed authentication from session cookies to JWT tokens' },
    { type: 'improvement', text: 'Moved to server-sent events for real-time updates (from polling)' },
    { type: 'fix', text: 'Fixed memory leak in long-running preview sessions' },
    { type: 'fix', text: 'Resolved race condition in concurrent file saves' },
  ]},
  { version: '2.0.0', date: 'November 1, 2024', changes: [
    { type: 'breaking', text: 'Complete platform rewrite — new architecture, new API, new UI' },
    { type: 'feature', text: 'Multi-file project support with folder structure' },
    { type: 'feature', text: 'Live preview with hot reload' },
    { type: 'feature', text: 'Built-in terminal with Node.js runtime' },
    { type: 'improvement', text: 'New design system with consistent component library' },
  ]},
];

let activeFilter = 'all';
let searchQuery = '';

function render() {
  const container = document.getElementById('releases');
  const filtered = releases.map(r => {
    const changes = r.changes.filter(c => {
      const matchType = activeFilter === 'all' || c.type === activeFilter;
      const matchSearch = !searchQuery || c.text.toLowerCase().includes(searchQuery);
      return matchType && matchSearch;
    });
    return { ...r, changes };
  }).filter(r => r.changes.length > 0);

  container.innerHTML = filtered.map(r => {
    const items = r.changes.map(c =>
      '<div class="change-item"><div class="timeline-dot"></div><div><span class="type-badge badge-' + c.type + '">' + c.type + '</span><span class="text-sm ml-2">' + c.text + '</span></div></div>'
    ).join('');

    const counts = {};
    r.changes.forEach(c => { counts[c.type] = (counts[c.type] || 0) + 1; });
    const summary = Object.entries(counts).map(([t, n]) => '<span class="type-badge badge-' + t + '">' + n + ' ' + t + '</span>').join(' ');

    return '<div class="release-card"><div class="flex items-center justify-between mb-4"><div><span class="version-badge">v' + r.version + '</span><span class="date-label ml-3">' + r.date + '</span></div><div class="flex gap-1">' + summary + '</div></div><div>' + items + '</div></div>';
  }).join('');

  if (filtered.length === 0) {
    container.innerHTML = '<div class="text-center text-canvas-muted-deep py-12">No changes match your filters.</div>';
  }
}

document.getElementById('filterBtns').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  activeFilter = btn.dataset.type;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  render();
});

document.getElementById('searchInput').addEventListener('input', e => {
  searchQuery = e.target.value.toLowerCase();
  render();
});

render();
`,
      },
    ],
  },

  // 50. Developer Tools
  {
    name: 'Developer Tools',
    icon: '🛠️',
    category: 'tech',
    description: 'Multi-tool developer utility with JSON formatter, Base64 encoder/decoder, color converter, and regex tester.',
    prompt: 'Build a developer tools page with tabs for JSON formatter/validator, Base64 encoder/decoder, color converter (HEX/RGB/HSL), and regex tester with match highlighting.',
    tags: ['HTML', 'Tailwind CSS', 'JavaScript'],
    files: [
      {
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dev Tools</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="bg-gray-950 text-gray-200 font-sans min-h-screen p-6">
  <div class="max-w-4xl mx-auto">
    <h1 class="text-2xl font-bold text-center mb-2">🛠️ Developer Tools</h1>
    <p class="text-center text-canvas-muted-deep text-sm mb-8">Handy utilities for everyday development</p>

    <!-- Tabs -->
    <div class="flex gap-2 mb-6 justify-center flex-wrap" id="toolTabs">
      <button class="tool-tab active" data-tool="json">📄 JSON</button>
      <button class="tool-tab" data-tool="base64">🔐 Base64</button>
      <button class="tool-tab" data-tool="color">🎨 Color</button>
      <button class="tool-tab" data-tool="regex">🔍 Regex</button>
    </div>

    <!-- JSON Tool -->
    <div id="panel-json" class="tool-panel">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="label">Input JSON</label>
          <textarea id="jsonInput" class="code-area" rows="14" placeholder='{"key": "value"}'></textarea>
        </div>
        <div>
          <label class="label">Formatted Output</label>
          <pre id="jsonOutput" class="code-area output-area"></pre>
        </div>
      </div>
      <div class="flex gap-2 mt-3">
        <button class="action-btn" onclick="formatJSON()">Format</button>
        <button class="action-btn secondary" onclick="minifyJSON()">Minify</button>
        <button class="action-btn secondary" onclick="copyResult('jsonOutput')">Copy</button>
      </div>
      <div id="jsonError" class="error-msg mt-2"></div>
    </div>

    <!-- Base64 Tool -->
    <div id="panel-base64" class="tool-panel hidden">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="label">Text</label>
          <textarea id="b64Text" class="code-area" rows="8" placeholder="Enter text to encode..."></textarea>
        </div>
        <div>
          <label class="label">Base64</label>
          <textarea id="b64Encoded" class="code-area" rows="8" placeholder="Or paste Base64 to decode..."></textarea>
        </div>
      </div>
      <div class="flex gap-2 mt-3">
        <button class="action-btn" onclick="encodeB64()">Encode →</button>
        <button class="action-btn" onclick="decodeB64()">← Decode</button>
      </div>
      <div id="b64Error" class="error-msg mt-2"></div>
    </div>

    <!-- Color Tool -->
    <div id="panel-color" class="tool-panel hidden">
      <div class="flex gap-4 items-start">
        <div id="colorPreview" class="color-preview"></div>
        <div class="flex-1 space-y-3">
          <div><label class="label">HEX</label><input type="text" id="hexInput" class="input-field" value="#3b82f6" /></div>
          <div><label class="label">RGB</label><input type="text" id="rgbInput" class="input-field" value="rgb(59, 130, 246)" /></div>
          <div><label class="label">HSL</label><input type="text" id="hslInput" class="input-field" value="hsl(217, 91%, 60%)" /></div>
        </div>
      </div>
      <div class="flex gap-2 mt-3">
        <button class="action-btn" onclick="convertFromHex()">From HEX</button>
        <button class="action-btn secondary" onclick="randomizeColor()">Random</button>
      </div>
    </div>

    <!-- Regex Tool -->
    <div id="panel-regex" class="tool-panel hidden">
      <div class="space-y-3">
        <div><label class="label">Pattern</label><div class="flex gap-2"><span class="text-canvas-muted-deep text-lg">/</span><input type="text" id="regexPattern" class="input-field flex-1" placeholder="[A-Z]\\w+" /><span class="text-canvas-muted-deep text-lg">/</span><input type="text" id="regexFlags" class="input-field w-16" value="gi" /></div></div>
        <div><label class="label">Test String</label><textarea id="regexTest" class="code-area" rows="4" placeholder="Enter text to test against...">The Quick Brown Fox jumps over the Lazy Dog 42 times.</textarea></div>
        <div><label class="label">Matches</label><div id="regexResult" class="code-area output-area min-h-16"></div></div>
        <div class="flex gap-2">
          <button class="action-btn" onclick="testRegex()">Test</button>
        </div>
      </div>
    </div>
  </div>
  <script src="/script.js"></script>
</body>
</html>`,
      },
      {
        path: '/styles.css',
        language: 'css',
        content: `.tool-tab { padding: 8px 18px; border-radius: 8px; font-size: 0.85rem; background: #1f2937; cursor: pointer; border: 1px solid transparent; }
.tool-tab:hover { background: #374151; }
.tool-tab.active { background: #1e3a5f; color: #93c5fd; border-color: #2563eb; }
.tool-panel { background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 24px; }
.label { display: block; font-size: 0.7rem; font-weight: 700; color: #6b7280; text-transform: uppercase; margin-bottom: 6px; }
.code-area { width: 100%; background: #0d1117; border: 1px solid #21262d; border-radius: 8px; padding: 12px; font-family: 'Menlo', monospace; font-size: 0.8rem; color: #e5e7eb; resize: vertical; line-height: 1.5; }
.code-area:focus { outline: none; border-color: #3b82f6; }
.output-area { overflow: auto; white-space: pre-wrap; min-height: 100px; }
.input-field { width: 100%; background: #0d1117; border: 1px solid #21262d; border-radius: 6px; padding: 8px 12px; font-size: 0.8rem; color: #e5e7eb; }
.input-field:focus { outline: none; border-color: #3b82f6; }
.action-btn { padding: 8px 20px; border-radius: 8px; font-size: 0.8rem; font-weight: 600; background: #2563eb; color: #fff; cursor: pointer; }
.action-btn:hover { background: #1d4ed8; }
.action-btn.secondary { background: #374151; color: #d1d5db; }
.action-btn.secondary:hover { background: #4b5563; }
.error-msg { font-size: 0.75rem; color: #f87171; }
.color-preview { width: 120px; height: 120px; border-radius: 12px; background: #3b82f6; border: 2px solid #374151; flex-shrink: 0; }
.match-highlight { background: #854d0e; color: #fef08a; padding: 1px 2px; border-radius: 2px; }
`,
      },
      {
        path: '/script.js',
        language: 'javascript',
        content: `// Tab switching
document.getElementById('toolTabs').addEventListener('click', e => {
  const btn = e.target.closest('.tool-tab');
  if (!btn) return;
  document.querySelectorAll('.tool-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.tool-panel').forEach(p => p.classList.add('hidden'));
  document.getElementById('panel-' + btn.dataset.tool).classList.remove('hidden');
});

// JSON
function formatJSON() {
  try {
    const input = document.getElementById('jsonInput').value;
    const parsed = JSON.parse(input);
    document.getElementById('jsonOutput').textContent = JSON.stringify(parsed, null, 2);
    document.getElementById('jsonError').textContent = '';
  } catch (e) { document.getElementById('jsonError').textContent = 'Invalid JSON: ' + e.message; }
}

function minifyJSON() {
  try {
    const input = document.getElementById('jsonInput').value;
    const parsed = JSON.parse(input);
    document.getElementById('jsonOutput').textContent = JSON.stringify(parsed);
    document.getElementById('jsonError').textContent = '';
  } catch (e) { document.getElementById('jsonError').textContent = 'Invalid JSON: ' + e.message; }
}

// Base64
function encodeB64() {
  try {
    const text = document.getElementById('b64Text').value;
    document.getElementById('b64Encoded').value = btoa(unescape(encodeURIComponent(text)));
    document.getElementById('b64Error').textContent = '';
  } catch (e) { document.getElementById('b64Error').textContent = 'Encoding error: ' + e.message; }
}

function decodeB64() {
  try {
    const encoded = document.getElementById('b64Encoded').value;
    document.getElementById('b64Text').value = decodeURIComponent(escape(atob(encoded)));
    document.getElementById('b64Error').textContent = '';
  } catch (e) { document.getElementById('b64Error').textContent = 'Invalid Base64 input'; }
}

// Color
function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const n = parseInt(hex, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function convertFromHex() {
  const hex = document.getElementById('hexInput').value.trim();
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  document.getElementById('rgbInput').value = 'rgb(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ')';
  document.getElementById('hslInput').value = 'hsl(' + hsl.h + ', ' + hsl.s + '%, ' + hsl.l + '%)';
  document.getElementById('colorPreview').style.background = hex;
}

function randomizeColor() {
  const hex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  document.getElementById('hexInput').value = hex;
  convertFromHex();
}

// Regex
function testRegex() {
  const pattern = document.getElementById('regexPattern').value;
  const flags = document.getElementById('regexFlags').value;
  const text = document.getElementById('regexTest').value;
  const result = document.getElementById('regexResult');
  try {
    const re = new RegExp(pattern, flags);
    const matches = [];
    let m;
    const isGlobal = flags.includes('g');
    if (isGlobal) {
      while ((m = re.exec(text)) !== null) { matches.push({ value: m[0], index: m.index }); }
    } else {
      m = re.exec(text);
      if (m) matches.push({ value: m[0], index: m.index });
    }
    if (matches.length === 0) { result.innerHTML = '<span class="text-canvas-muted-deep">No matches found</span>'; return; }
    let highlighted = '';
    let last = 0;
    matches.forEach(mt => {
      highlighted += escapeHtml(text.substring(last, mt.index));
      highlighted += '<span class="match-highlight">' + escapeHtml(mt.value) + '</span>';
      last = mt.index + mt.value.length;
    });
    highlighted += escapeHtml(text.substring(last));
    result.innerHTML = '<div class="mb-2 text-xs text-canvas-muted-deep">' + matches.length + ' match(es) found</div>' + highlighted;
  } catch (e) { result.innerHTML = '<span class="text-primary-400">Invalid regex: ' + escapeHtml(e.message) + '</span>'; }
}

function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function copyResult(id) {
  const text = document.getElementById(id).textContent;
  navigator.clipboard.writeText(text);
}

convertFromHex();
`,
      },
    ],
  },

];

