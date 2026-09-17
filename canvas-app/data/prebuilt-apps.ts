import { ProgrammingLanguage } from '../types';

export interface PrebuiltApp {
  id: string;
  name: string;
  description: string;
  language: ProgrammingLanguage;
  icon: string;
  code: string;
}

// ── HTML Prebuilt Apps ────────────────────────────────────────────

const htmlPortfolio: PrebuiltApp = {
  id: 'html-portfolio',
  name: 'Developer Portfolio',
  description: 'A clean developer portfolio with hero, projects, skills & contact form',
  language: 'html',
  icon: '💼',
  code: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Developer Portfolio</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#0a0a0f;color:#e0e0e8;scroll-behavior:smooth}
nav{position:fixed;top:0;width:100%;background:rgba(10,10,15,.92);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,.06);padding:14px 40px;display:flex;justify-content:space-between;align-items:center;z-index:100}
nav .logo{font-size:18px;font-weight:800;background:linear-gradient(135deg,#f43f5e,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
nav a{color:#888;text-decoration:none;font-size:13px;font-weight:500;margin-left:24px;transition:.2s}nav a:hover{color:#f43f5e}
.hero{min-height:100vh;display:flex;flex-direction:column;justify-content:center;padding:0 60px;position:relative}
.hero::after{content:'';position:absolute;top:20%;right:10%;width:400px;height:400px;background:radial-gradient(circle,rgba(244,63,94,.12),transparent 70%);border-radius:50%;pointer-events:none}
.hero h1{font-size:clamp(36px,5vw,64px);font-weight:800;line-height:1.1;margin-bottom:16px}
.hero h1 span{background:linear-gradient(135deg,#f43f5e,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hero p{font-size:18px;color:#888;max-width:540px;line-height:1.6;margin-bottom:32px}
.btn{display:inline-flex;align-items:center;gap:8px;padding:12px 28px;background:linear-gradient(135deg,#f43f5e,#ec4899);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;transition:.2s;text-decoration:none}
.btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(244,63,94,.3)}
section{padding:80px 60px}
h2{font-size:28px;font-weight:700;margin-bottom:40px}h2 span{color:#f43f5e}
.projects-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:24px}
.project-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:28px;transition:.3s}
.project-card:hover{border-color:rgba(244,63,94,.3);transform:translateY(-4px);box-shadow:0 12px 32px rgba(0,0,0,.3)}
.project-card h3{font-size:18px;font-weight:600;margin-bottom:8px}.project-card p{font-size:13px;color:#888;line-height:1.5;margin-bottom:16px}
.tags{display:flex;gap:6px;flex-wrap:wrap}.tag{padding:4px 10px;background:rgba(244,63,94,.1);color:#f43f5e;border-radius:6px;font-size:11px;font-weight:500}
.skills-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}
.skill{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:20px}
.skill-name{font-size:13px;font-weight:600;margin-bottom:8px;display:flex;justify-content:space-between}.skill-name span{color:#f43f5e}
.bar{height:6px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden}.bar-fill{height:100%;background:linear-gradient(90deg,#f43f5e,#ec4899);border-radius:3px;transition:width 1s ease}
.contact-form{max-width:480px;display:flex;flex-direction:column;gap:14px}
.contact-form input,.contact-form textarea{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:14px 16px;color:#e0e0e8;font-size:13px;outline:none;transition:.2s;font-family:inherit}
.contact-form input:focus,.contact-form textarea:focus{border-color:#f43f5e}
.contact-form textarea{min-height:120px;resize:vertical}
footer{text-align:center;padding:40px;border-top:1px solid rgba(255,255,255,.06);color:#555;font-size:12px}
</style>
</head>
<body>
<nav><div class="logo">Alex.dev</div><div><a href="#projects">Projects</a><a href="#skills">Skills</a><a href="#contact">Contact</a></div></nav>

<section class="hero">
<h1>Hi, I'm <span>Alex Chen</span></h1>
<p>A full-stack developer passionate about building beautiful, performant web applications with modern technologies.</p>
<a href="#projects" class="btn">View My Work &darr;</a>
</section>

<section id="projects">
<h2>Featured <span>Projects</span></h2>
<div class="projects-grid">
<div class="project-card"><h3>TaskFlow Pro</h3><p>A Kanban-style project management app with real-time collaboration, drag-and-drop, and team chat.</p><div class="tags"><span class="tag">React</span><span class="tag">Node.js</span><span class="tag">WebSocket</span></div></div>
<div class="project-card"><h3>CryptoVault</h3><p>Cryptocurrency portfolio tracker with live price charts, alerts, and DeFi integration.</p><div class="tags"><span class="tag">Next.js</span><span class="tag">Python</span><span class="tag">ML</span></div></div>
<div class="project-card"><h3>HealthSync</h3><p>Fitness tracking platform with AI workout recommendations and nutrition planning.</p><div class="tags"><span class="tag">React Native</span><span class="tag">FastAPI</span><span class="tag">TensorFlow</span></div></div>
</div>
</section>

<section id="skills">
<h2>My <span>Skills</span></h2>
<div class="skills-grid">
<div class="skill"><div class="skill-name">React / Next.js <span>95%</span></div><div class="bar"><div class="bar-fill" style="width:95%"></div></div></div>
<div class="skill"><div class="skill-name">TypeScript <span>90%</span></div><div class="bar"><div class="bar-fill" style="width:90%"></div></div></div>
<div class="skill"><div class="skill-name">Node.js / Express <span>88%</span></div><div class="bar"><div class="bar-fill" style="width:88%"></div></div></div>
<div class="skill"><div class="skill-name">Python <span>82%</span></div><div class="bar"><div class="bar-fill" style="width:82%"></div></div></div>
<div class="skill"><div class="skill-name">PostgreSQL / MongoDB <span>85%</span></div><div class="bar"><div class="bar-fill" style="width:85%"></div></div></div>
<div class="skill"><div class="skill-name">Docker / CI-CD <span>78%</span></div><div class="bar"><div class="bar-fill" style="width:78%"></div></div></div>
</div>
</section>

<section id="contact">
<h2>Get In <span>Touch</span></h2>
<form class="contact-form" onsubmit="event.preventDefault();this.querySelector('button').textContent='Sent ✓';setTimeout(()=>this.reset(),1500);setTimeout(()=>this.querySelector('button').textContent='Send Message →',1500)">
<input type="text" placeholder="Your Name" required>
<input type="email" placeholder="Your Email" required>
<textarea placeholder="Your Message..." required></textarea>
<button type="submit" class="btn">Send Message &rarr;</button>
</form>
</section>

<footer>&copy; 2026 Alex Chen. Built with ❤️</footer>
</body>
</html>`,
};

const htmlDashboard: PrebuiltApp = {
  id: 'html-dashboard',
  name: 'Analytics Dashboard',
  description: 'Dark analytics dashboard with stat cards, charts & activity feed',
  language: 'html',
  icon: '📊',
  code: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Analytics Dashboard</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#0f0f14;color:#d0d0d8;display:flex;min-height:100vh}
.sidebar{width:220px;background:#0a0a10;border-right:1px solid rgba(255,255,255,.06);padding:20px 0;display:flex;flex-direction:column;flex-shrink:0}
.sidebar .brand{padding:0 20px 24px;font-size:16px;font-weight:800;background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.nav-item{display:flex;align-items:center;gap:10px;padding:10px 20px;color:#666;font-size:13px;cursor:pointer;transition:.2s;border-left:3px solid transparent}
.nav-item:hover,.nav-item.active{color:#c4b5fd;background:rgba(99,102,241,.06);border-left-color:#6366f1}
.nav-item svg{width:16px;height:16px}
.main{flex:1;padding:24px 32px;overflow-y:auto}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:28px}
.header h1{font-size:22px;font-weight:700}.header p{color:#666;font-size:13px;margin-top:2px}
.header-right{display:flex;align-items:center;gap:12px}
.search{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:8px 14px;color:#ccc;font-size:12px;outline:none;width:200px}
.avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px}
.stat-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:20px}
.stat-card .label{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
.stat-card .value{font-size:28px;font-weight:700}
.stat-card .change{font-size:11px;margin-top:6px;display:flex;align-items:center;gap:4px}
.stat-card .change.up{color:#22c55e}.stat-card .change.down{color:#ef4444}
.charts{display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:28px}
.chart-box{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:20px}
.chart-box h3{font-size:14px;font-weight:600;margin-bottom:16px}
.bar-chart{display:flex;align-items:flex-end;gap:8px;height:160px}
.bar-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px}
.bar-col .bar{width:100%;border-radius:4px 4px 0 0;background:linear-gradient(to top,#6366f1,#8b5cf6);transition:.3s;min-height:4px}
.bar-col span{font-size:9px;color:#666}
.donut{width:140px;height:140px;border-radius:50%;background:conic-gradient(#6366f1 0% 42%,#8b5cf6 42% 68%,#c084fc 68% 85%,rgba(255,255,255,.06) 85% 100%);margin:0 auto;position:relative}
.donut::after{content:'68%';position:absolute;inset:20%;background:#0f0f14;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#c4b5fd}
.activity{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:20px}
.activity h3{font-size:14px;font-weight:600;margin-bottom:16px}
.activity-item{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04)}
.activity-item:last-child{border-bottom:none}
.activity-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.activity-item p{font-size:12px;color:#aaa;flex:1}.activity-item span{font-size:10px;color:#555}
</style>
</head>
<body>
<aside class="sidebar">
<div class="brand">📊 AnalyticsHQ</div>
<div class="nav-item active"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>Dashboard</div>
<div class="nav-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>Analytics</div>
<div class="nav-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>Users</div>
<div class="nav-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>Products</div>
<div class="nav-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>Settings</div>
</aside>
<main class="main">
<div class="header"><div><h1>Dashboard</h1><p>Welcome back, here's your overview</p></div><div class="header-right"><input class="search" placeholder="Search..."><div class="avatar">JD</div></div></div>

<div class="stats">
<div class="stat-card"><div class="label">Revenue</div><div class="value" style="color:#6366f1">$48.2K</div><div class="change up">↑ 12.5% from last month</div></div>
<div class="stat-card"><div class="label">Users</div><div class="value">2,847</div><div class="change up">↑ 8.2% from last month</div></div>
<div class="stat-card"><div class="label">Conversion</div><div class="value">3.6%</div><div class="change up">↑ 1.2% from last month</div></div>
<div class="stat-card"><div class="label">Bounce Rate</div><div class="value">24%</div><div class="change down">↓ 3.1% from last month</div></div>
</div>

<div class="charts">
<div class="chart-box"><h3>Revenue Trend</h3><div class="bar-chart">
<div class="bar-col"><div class="bar" style="height:45%"></div><span>Jan</span></div>
<div class="bar-col"><div class="bar" style="height:62%"></div><span>Feb</span></div>
<div class="bar-col"><div class="bar" style="height:55%"></div><span>Mar</span></div>
<div class="bar-col"><div class="bar" style="height:78%"></div><span>Apr</span></div>
<div class="bar-col"><div class="bar" style="height:68%"></div><span>May</span></div>
<div class="bar-col"><div class="bar" style="height:82%"></div><span>Jun</span></div>
<div class="bar-col"><div class="bar" style="height:72%"></div><span>Jul</span></div>
<div class="bar-col"><div class="bar" style="height:91%"></div><span>Aug</span></div>
<div class="bar-col"><div class="bar" style="height:85%"></div><span>Sep</span></div>
<div class="bar-col"><div class="bar" style="height:95%"></div><span>Oct</span></div>
<div class="bar-col"><div class="bar" style="height:88%"></div><span>Nov</span></div>
<div class="bar-col"><div class="bar" style="height:100%"></div><span>Dec</span></div>
</div></div>
<div class="chart-box"><h3>Traffic Sources</h3><div class="donut"></div><div style="margin-top:16px;display:flex;flex-direction:column;gap:6px;align-items:center"><span style="font-size:11px;color:#888">🟣 Direct 42% &bull; 🔵 Social 26% &bull; 💜 Search 17%</span></div></div>
</div>

<div class="activity"><h3>Recent Activity</h3>
<div class="activity-item"><div class="activity-dot" style="background:#22c55e"></div><p>New user <b>Sarah K.</b> signed up</p><span>2m ago</span></div>
<div class="activity-item"><div class="activity-dot" style="background:#6366f1"></div><p>Order <b>#1284</b> completed — $129.00</p><span>15m ago</span></div>
<div class="activity-item"><div class="activity-dot" style="background:#f59e0b"></div><p>Server CPU usage reached <b>82%</b></p><span>1h ago</span></div>
<div class="activity-item"><div class="activity-dot" style="background:#22c55e"></div><p>Deployment <b>v2.4.1</b> succeeded</p><span>3h ago</span></div>
<div class="activity-item"><div class="activity-dot" style="background:#ef4444"></div><p>Payment failed for user <b>Mike R.</b></p><span>5h ago</span></div>
</div>
</main>
</body>
</html>`,
};

const htmlEcommerce: PrebuiltApp = {
  id: 'html-ecommerce',
  name: 'E-Commerce Store',
  description: 'Minimal product store with cart, filters & responsive grid',
  language: 'html',
  icon: '🛒',
  code: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MinimalShop</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#fafafa;color:#111}
header{background:#fff;border-bottom:1px solid #eee;padding:16px 40px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:50}
.logo{font-size:20px;font-weight:800;letter-spacing:-0.5px}
.logo span{color:#f43f5e}
nav a{color:#555;text-decoration:none;font-size:13px;margin-left:24px;font-weight:500;transition:.2s}nav a:hover{color:#f43f5e}
.cart-btn{position:relative;background:none;border:none;font-size:18px;cursor:pointer;padding:6px}
.cart-badge{position:absolute;top:-2px;right:-6px;background:#f43f5e;color:#fff;font-size:9px;font-weight:700;width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center}
.hero-banner{background:linear-gradient(135deg,#0f0f14,#1a1a2e);color:#fff;padding:60px 40px;text-align:center}
.hero-banner h1{font-size:36px;font-weight:800;margin-bottom:10px}
.hero-banner p{color:#aaa;font-size:15px;margin-bottom:24px}
.hero-banner .btn{display:inline-block;padding:12px 32px;background:#f43f5e;color:#fff;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;transition:.2s}
.hero-banner .btn:hover{background:#e11d48;transform:translateY(-2px)}
.container{max-width:1200px;margin:0 auto;padding:40px 20px}
.filters{display:flex;gap:8px;margin-bottom:32px;flex-wrap:wrap}
.filter-btn{padding:8px 18px;border:1px solid #ddd;border-radius:20px;background:#fff;font-size:12px;font-weight:500;cursor:pointer;transition:.2s;color:#555}
.filter-btn:hover,.filter-btn.active{background:#f43f5e;color:#fff;border-color:#f43f5e}
.products{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:24px}
.product{background:#fff;border-radius:16px;overflow:hidden;border:1px solid #eee;transition:.3s;cursor:pointer}
.product:hover{transform:translateY(-4px);box-shadow:0 12px 32px rgba(0,0,0,.08)}
.product-img{height:220px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-size:48px}
.product-info{padding:16px}
.product-info h3{font-size:15px;font-weight:600;margin-bottom:4px}
.product-info .price{font-size:18px;font-weight:700;color:#f43f5e;margin-bottom:8px}
.product-info .old-price{font-size:12px;color:#aaa;text-decoration:line-through;margin-left:6px}
.product-info .rating{font-size:11px;color:#f59e0b}
.add-btn{width:100%;padding:10px;background:#111;color:#fff;border:none;font-size:12px;font-weight:600;cursor:pointer;transition:.2s}
.add-btn:hover{background:#f43f5e}
footer{background:#111;color:#888;text-align:center;padding:40px;font-size:12px;margin-top:60px}
</style>
</head>
<body>
<header>
<div class="logo">Minimal<span>Shop</span></div>
<nav><a href="#">Home</a><a href="#">Shop</a><a href="#">Collections</a><a href="#">About</a></nav>
<button class="cart-btn">🛒<span class="cart-badge" id="cartCount">0</span></button>
</header>

<div class="hero-banner">
<h1>Summer Collection 2026</h1>
<p>Discover minimally designed products for the modern lifestyle</p>
<a href="#shop" class="btn">Shop Now →</a>
</div>

<div class="container" id="shop">
<div class="filters">
<button class="filter-btn active" onclick="filterProducts('all')">All</button>
<button class="filter-btn" onclick="filterProducts('clothing')">Clothing</button>
<button class="filter-btn" onclick="filterProducts('accessories')">Accessories</button>
<button class="filter-btn" onclick="filterProducts('electronics')">Electronics</button>
<button class="filter-btn" onclick="filterProducts('home')">Home</button>
</div>

<div class="products" id="productsGrid"></div>
</div>

<footer>&copy; 2026 MinimalShop. All rights reserved.</footer>

<script>
const products = [
  { name:'Minimalist Watch', price:129, oldPrice:179, category:'accessories', emoji:'⌚', rating:4.8 },
  { name:'Linen Shirt', price:59, oldPrice:null, category:'clothing', emoji:'👔', rating:4.5 },
  { name:'Wireless Earbuds', price:89, oldPrice:119, category:'electronics', emoji:'🎧', rating:4.7 },
  { name:'Ceramic Vase', price:42, oldPrice:null, category:'home', emoji:'🏺', rating:4.3 },
  { name:'Canvas Sneakers', price:75, oldPrice:95, category:'clothing', emoji:'👟', rating:4.6 },
  { name:'Desk Lamp', price:64, oldPrice:null, category:'home', emoji:'💡', rating:4.4 },
  { name:'Leather Wallet', price:49, oldPrice:69, category:'accessories', emoji:'👛', rating:4.8 },
  { name:'Bluetooth Speaker', price:99, oldPrice:149, category:'electronics', emoji:'🔊', rating:4.6 },
];
let cart = 0;
function renderProducts(list) {
  document.getElementById('productsGrid').innerHTML = list.map(p => \`
    <div class="product">
      <div class="product-img">\${p.emoji}</div>
      <div class="product-info">
        <h3>\${p.name}</h3>
        <div class="price">$\${p.price}\${p.oldPrice ? '<span class="old-price">$'+p.oldPrice+'</span>' : ''}</div>
        <div class="rating">\${'★'.repeat(Math.floor(p.rating))}\${'☆'.repeat(5 - Math.floor(p.rating))} \${p.rating}</div>
      </div>
      <button class="add-btn" onclick="addToCart()">Add to Cart</button>
    </div>\`).join('');
}
function filterProducts(cat) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  renderProducts(cat === 'all' ? products : products.filter(p => p.category === cat));
}
function addToCart() { cart++; document.getElementById('cartCount').textContent = cart; }
renderProducts(products);
</script>
</body>
</html>`,
};

// ── JavaScript Prebuilt Apps ──────────────────────────────────────

const jsTodoApp: PrebuiltApp = {
  id: 'js-todo-app',
  name: 'Task Manager App',
  description: 'Kanban board with drag & drop, local storage persistence',
  language: 'javascript',
  icon: '📋',
  code: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>TaskBoard</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#0f0f14;color:#e0e0e8;min-height:100vh}
header{background:rgba(10,10,15,.95);border-bottom:1px solid rgba(255,255,255,.06);padding:16px 32px;display:flex;justify-content:space-between;align-items:center}
header h1{font-size:18px;font-weight:700}header h1 span{color:#6366f1}
.add-task-btn{padding:8px 20px;background:#6366f1;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:.2s}
.add-task-btn:hover{background:#4f46e5}
.board{display:flex;gap:20px;padding:28px 32px;overflow-x:auto;min-height:calc(100vh - 60px)}
.column{min-width:280px;max-width:280px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:14px;display:flex;flex-direction:column;max-height:calc(100vh - 100px)}
.column-header{padding:16px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between}
.column-header h2{font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px}
.count{background:rgba(255,255,255,.08);padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700}
.cards{flex:1;padding:10px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;min-height:40px}
.card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:14px;cursor:grab;transition:.2s;user-select:none}
.card:hover{border-color:rgba(99,102,241,.3);background:rgba(99,102,241,.05)}
.card.dragging{opacity:.4;transform:scale(.96)}
.card h4{font-size:13px;font-weight:600;margin-bottom:6px}.card p{font-size:11px;color:#888;line-height:1.4}
.card-footer{display:flex;justify-content:space-between;align-items:center;margin-top:10px}
.priority{padding:3px 8px;border-radius:4px;font-size:9px;font-weight:700;text-transform:uppercase}
.priority.high{background:rgba(239,68,68,.15);color:#ef4444}
.priority.medium{background:rgba(245,158,11,.15);color:#f59e0b}
.priority.low{background:rgba(34,197,94,.15);color:#22c55e}
.delete-btn{background:none;border:none;color:#555;font-size:12px;cursor:pointer;transition:.2s;padding:2px 6px;border-radius:4px}
.delete-btn:hover{color:#ef4444;background:rgba(239,68,68,.1)}
.modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100;align-items:center;justify-content:center}
.modal-overlay.show{display:flex}
.modal{background:#16161e;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:28px;width:380px}
.modal h3{font-size:16px;font-weight:700;margin-bottom:20px}
.modal label{font-size:11px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px}
.modal input,.modal textarea,.modal select{width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px 12px;color:#e0e0e8;font-size:12px;outline:none;margin-bottom:16px;font-family:inherit}
.modal textarea{min-height:80px;resize:vertical}
.modal-actions{display:flex;gap:8px;justify-content:flex-end}
.modal-actions button{padding:8px 20px;border-radius:8px;border:none;font-size:12px;font-weight:600;cursor:pointer;transition:.2s}
.cancel-btn{background:rgba(255,255,255,.06);color:#aaa}.cancel-btn:hover{background:rgba(255,255,255,.1)}
.save-btn{background:#6366f1;color:#fff}.save-btn:hover{background:#4f46e5}
</style>
</head>
<body>
<header><h1>📋 Task<span>Board</span></h1><button class="add-task-btn" onclick="openModal()">+ New Task</button></header>
<div class="board">
<div class="column" id="todo" ondragover="event.preventDefault()" ondrop="drop(event,'todo')">
<div class="column-header"><h2>📝 To Do <span class="count" id="todo-count">0</span></h2></div>
<div class="cards" id="todo-cards"></div>
</div>
<div class="column" id="progress" ondragover="event.preventDefault()" ondrop="drop(event,'progress')">
<div class="column-header"><h2>🔄 In Progress <span class="count" id="progress-count">0</span></h2></div>
<div class="cards" id="progress-cards"></div>
</div>
<div class="column" id="review" ondragover="event.preventDefault()" ondrop="drop(event,'review')">
<div class="column-header"><h2>👀 Review <span class="count" id="review-count">0</span></h2></div>
<div class="cards" id="review-cards"></div>
</div>
<div class="column" id="done" ondragover="event.preventDefault()" ondrop="drop(event,'done')">
<div class="column-header"><h2>✅ Done <span class="count" id="done-count">0</span></h2></div>
<div class="cards" id="done-cards"></div>
</div>
</div>

<div class="modal-overlay" id="modal">
<div class="modal">
<h3>New Task</h3>
<label>Title</label><input id="taskTitle" placeholder="Task title...">
<label>Description</label><textarea id="taskDesc" placeholder="Describe the task..."></textarea>
<label>Priority</label>
<select id="taskPriority"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option></select>
<div class="modal-actions"><button class="cancel-btn" onclick="closeModal()">Cancel</button><button class="save-btn" onclick="addTask()">Create</button></div>
</div>
</div>

<script>
let tasks = JSON.parse(localStorage.getItem('tasks')||'[]');
if(!tasks.length) tasks=[
  {id:1,title:'Design landing page',desc:'Create wireframes and mockup for the new landing page',priority:'high',status:'todo'},
  {id:2,title:'Setup CI/CD pipeline',desc:'Configure GitHub Actions for auto-deployment',priority:'medium',status:'progress'},
  {id:3,title:'Write unit tests',desc:'Add tests for auth module and API endpoints',priority:'medium',status:'todo'},
  {id:4,title:'Update documentation',desc:'Refresh README and API docs',priority:'low',status:'review'},
  {id:5,title:'Fix mobile nav bug',desc:'Hamburger menu not closing on route change',priority:'high',status:'done'},
];
function save(){localStorage.setItem('tasks',JSON.stringify(tasks))}
function render(){
  ['todo','progress','review','done'].forEach(s=>{
    const list=tasks.filter(t=>t.status===s);
    document.getElementById(s+'-cards').innerHTML=list.map(t=>\`
      <div class="card" draggable="true" ondragstart="drag(event,\${t.id})" id="task-\${t.id}">
        <h4>\${t.title}</h4><p>\${t.desc}</p>
        <div class="card-footer"><span class="priority \${t.priority}">\${t.priority}</span><button class="delete-btn" onclick="deleteTask(\${t.id})">✕</button></div>
      </div>\`).join('');
    document.getElementById(s+'-count').textContent=list.length;
  });
}
let dragId=null;
function drag(e,id){dragId=id;e.target.classList.add('dragging');e.dataTransfer.effectAllowed='move'}
function drop(e,status){e.preventDefault();const t=tasks.find(t=>t.id===dragId);if(t){t.status=status;save();render()}}
document.addEventListener('dragend',()=>{document.querySelectorAll('.card').forEach(c=>c.classList.remove('dragging'))});
function openModal(){document.getElementById('modal').classList.add('show')}
function closeModal(){document.getElementById('modal').classList.remove('show');document.getElementById('taskTitle').value='';document.getElementById('taskDesc').value=''}
function addTask(){
  const title=document.getElementById('taskTitle').value.trim();
  if(!title)return;
  tasks.push({id:Date.now(),title,desc:document.getElementById('taskDesc').value,priority:document.getElementById('taskPriority').value,status:'todo'});
  save();render();closeModal();
}
function deleteTask(id){tasks=tasks.filter(t=>t.id!==id);save();render()}
render();
</script>
</body>
</html>`,
};

const jsWeatherApp: PrebuiltApp = {
  id: 'js-weather-app',
  name: 'Weather Dashboard',
  description: 'Beautiful weather app with animated icons & 5-day forecast',
  language: 'javascript',
  icon: '🌤️',
  code: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Weather Dashboard</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.container{width:100%;max-width:480px}
.search{display:flex;gap:8px;margin-bottom:24px}
.search input{flex:1;padding:14px 18px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(255,255,255,.06);backdrop-filter:blur(10px);color:#fff;font-size:14px;outline:none;transition:.2s}
.search input:focus{border-color:rgba(255,255,255,.3)}
.search input::placeholder{color:rgba(255,255,255,.4)}
.search button{padding:14px 20px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.12);border-radius:14px;color:#fff;font-size:16px;cursor:pointer;transition:.2s}
.search button:hover{background:rgba(255,255,255,.2)}
.main-card{background:rgba(255,255,255,.06);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:32px;text-align:center;margin-bottom:16px}
.city{font-size:20px;font-weight:300;margin-bottom:4px;opacity:.8}.date{font-size:12px;opacity:.5;margin-bottom:20px}
.weather-icon{font-size:72px;margin:12px 0;filter:drop-shadow(0 4px 12px rgba(255,255,255,.1))}
.temp{font-size:64px;font-weight:200;line-height:1}.temp span{font-size:28px;vertical-align:top;opacity:.6}
.desc{font-size:14px;opacity:.6;margin:8px 0 20px;text-transform:capitalize}
.details{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.detail{background:rgba(255,255,255,.05);border-radius:12px;padding:12px 8px}
.detail .label{font-size:10px;opacity:.4;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
.detail .val{font-size:16px;font-weight:600}
.forecast{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.forecast-day{background:rgba(255,255,255,.06);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px 8px;text-align:center;transition:.2s}
.forecast-day:hover{background:rgba(255,255,255,.1);transform:translateY(-2px)}
.forecast-day .day{font-size:11px;opacity:.5;margin-bottom:6px;font-weight:600}
.forecast-day .icon{font-size:28px;margin-bottom:6px}
.forecast-day .temps{font-size:12px}.forecast-day .temps span{opacity:.4}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.weather-icon{animation:float 3s ease-in-out infinite}
</style>
</head>
<body>
<div class="container">
<div class="search"><input id="cityInput" placeholder="Search city..." value="San Francisco"><button onclick="searchCity()">🔍</button></div>
<div class="main-card" id="mainCard"></div>
<div class="forecast" id="forecast"></div>
</div>
<script>
const cities={
  'san francisco':{temp:18,feels:16,humidity:72,wind:14,icon:'🌤️',desc:'partly cloudy',forecast:[{d:'Mon',i:'☀️',h:20,l:13},{d:'Tue',i:'⛅',h:17,l:12},{d:'Wed',i:'🌧️',h:14,l:10},{d:'Thu',i:'⛅',h:16,l:11},{d:'Fri',i:'☀️',h:19,l:13}]},
  'new york':{temp:8,feels:4,humidity:55,wind:22,icon:'❄️',desc:'light snow',forecast:[{d:'Mon',i:'🌨️',h:6,l:1},{d:'Tue',i:'☁️',h:9,l:3},{d:'Wed',i:'⛅',h:11,l:5},{d:'Thu',i:'☀️',h:13,l:6},{d:'Fri',i:'🌤️',h:12,l:5}]},
  'tokyo':{temp:22,feels:21,humidity:60,wind:8,icon:'☀️',desc:'clear sky',forecast:[{d:'Mon',i:'☀️',h:24,l:18},{d:'Tue',i:'☀️',h:25,l:19},{d:'Wed',i:'⛅',h:22,l:17},{d:'Thu',i:'🌧️',h:19,l:15},{d:'Fri',i:'⛅',h:21,l:16}]},
  'london':{temp:12,feels:9,humidity:80,wind:18,icon:'🌧️',desc:'light rain',forecast:[{d:'Mon',i:'🌧️',h:11,l:7},{d:'Tue',i:'☁️',h:13,l:8},{d:'Wed',i:'🌧️',h:10,l:6},{d:'Thu',i:'⛅',h:14,l:9},{d:'Fri',i:'☀️',h:15,l:10}]},
  'dubai':{temp:34,feels:38,humidity:45,wind:12,icon:'☀️',desc:'sunny',forecast:[{d:'Mon',i:'☀️',h:36,l:28},{d:'Tue',i:'☀️',h:37,l:29},{d:'Wed',i:'☀️',h:35,l:27},{d:'Thu',i:'🌤️',h:33,l:26},{d:'Fri',i:'☀️',h:36,l:28}]},
};
function render(city,data){
  const now=new Date();
  document.getElementById('mainCard').innerHTML=\`
    <div class="city">\${city}</div>
    <div class="date">\${now.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</div>
    <div class="weather-icon">\${data.icon}</div>
    <div class="temp">\${data.temp}<span>°C</span></div>
    <div class="desc">\${data.desc}</div>
    <div class="details">
      <div class="detail"><div class="label">Feels Like</div><div class="val">\${data.feels}°</div></div>
      <div class="detail"><div class="label">Humidity</div><div class="val">\${data.humidity}%</div></div>
      <div class="detail"><div class="label">Wind</div><div class="val">\${data.wind} km/h</div></div>
    </div>\`;
  document.getElementById('forecast').innerHTML=data.forecast.map(f=>\`
    <div class="forecast-day"><div class="day">\${f.d}</div><div class="icon">\${f.i}</div><div class="temps">\${f.h}° <span>\${f.l}°</span></div></div>\`).join('');
}
function searchCity(){
  const val=document.getElementById('cityInput').value.trim().toLowerCase();
  const data=cities[val];
  if(data)render(val.split(' ').map(w=>w[0].toUpperCase()+w.slice(1)).join(' '),data);
  else{document.getElementById('mainCard').innerHTML='<p style="padding:40px;opacity:.5">City not found. Try: San Francisco, New York, Tokyo, London, Dubai</p>';document.getElementById('forecast').innerHTML=''}
}
searchCity();
</script>
</body>
</html>`,
};

const jsGameApp: PrebuiltApp = {
  id: 'js-space-game',
  name: 'Space Shooter Game',
  description: 'HTML5 Canvas game with enemies, bullets & score tracking',
  language: 'javascript',
  icon: '🎮',
  code: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Space Shooter</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a14;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:'Segoe UI',system-ui,sans-serif;color:#fff}
canvas{border:1px solid rgba(255,255,255,.1);border-radius:8px;display:block}
.hud{width:600px;display:flex;justify-content:space-between;padding:10px 4px;font-size:13px;color:#888}
.hud span{font-weight:600}.hud .score{color:#6366f1}.hud .lives{color:#f43f5e}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10}
.overlay h1{font-size:36px;margin-bottom:12px}.overlay p{color:#888;margin-bottom:24px;font-size:14px}
.overlay button{padding:12px 32px;background:#6366f1;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;transition:.2s}
.overlay button:hover{background:#4f46e5}
.hidden{display:none}
</style>
</head>
<body>
<div class="hud"><span>Score: <span class="score" id="score">0</span></span><span>Lives: <span class="lives" id="lives">3</span></span><span>Level: <span id="level">1</span></span></div>
<canvas id="canvas" width="600" height="500"></canvas>
<div class="overlay" id="startScreen"><h1>🚀 Space Shooter</h1><p>Arrow keys to move, Space to shoot</p><button onclick="startGame()">Start Game</button></div>
<div class="overlay hidden" id="gameOver"><h1>💥 Game Over</h1><p>Final Score: <span id="finalScore">0</span></p><button onclick="startGame()">Play Again</button></div>
<script>
const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d');
let player,bullets,enemies,particles,stars,score,lives,level,enemySpeed,spawnRate,frame,gameRunning;
const keys={};
function init(){
  player={x:280,y:440,w:30,h:20,speed:5};
  bullets=[];enemies=[];particles=[];stars=Array.from({length:80},()=>({x:Math.random()*600,y:Math.random()*500,s:Math.random()*1.5+.5,sp:Math.random()*1+.5}));
  score=0;lives=3;level=1;enemySpeed=1.2;spawnRate=80;frame=0;gameRunning=true;
  document.getElementById('score').textContent=0;document.getElementById('lives').textContent=3;document.getElementById('level').textContent=1;
}
function startGame(){init();document.getElementById('startScreen').classList.add('hidden');document.getElementById('gameOver').classList.add('hidden');loop()}
function spawnEnemy(){
  const type=Math.random()<.2?'big':'normal';
  enemies.push({x:Math.random()*(600-30),y:-30,w:type==='big'?36:24,h:type==='big'?30:20,hp:type==='big'?3:1,type,speed:enemySpeed*(type==='big'?.7:1)});
}
function explode(x,y,color){for(let i=0;i<8;i++)particles.push({x,y,vx:(Math.random()-.5)*4,vy:(Math.random()-.5)*4,life:20+Math.random()*10,color})}
function update(){
  frame++;
  // Stars
  stars.forEach(s=>{s.y+=s.sp;if(s.y>500){s.y=0;s.x=Math.random()*600}});
  // Player
  if(keys['ArrowLeft']&&player.x>0)player.x-=player.speed;
  if(keys['ArrowRight']&&player.x<600-player.w)player.x+=player.speed;
  if(keys['ArrowUp']&&player.y>300)player.y-=player.speed;
  if(keys['ArrowDown']&&player.y<500-player.h)player.y+=player.speed;
  // Bullets
  bullets.forEach(b=>b.y-=8);
  bullets=bullets.filter(b=>b.y>-10);
  // Enemies
  if(frame%spawnRate===0)spawnEnemy();
  enemies.forEach(e=>e.y+=e.speed);
  // Collision: bullet-enemy
  bullets.forEach(b=>{enemies.forEach(e=>{if(b.x<e.x+e.w&&b.x+4>e.x&&b.y<e.y+e.h&&b.y+10>e.y){e.hp--;b.y=-99;if(e.hp<=0){score+=e.type==='big'?30:10;explode(e.x+e.w/2,e.y+e.h/2,e.type==='big'?'#f59e0b':'#6366f1');e.y=999;document.getElementById('score').textContent=score}}})});
  // Collision: enemy-player
  enemies.forEach(e=>{if(e.y+e.h>player.y&&e.y<player.y+player.h&&e.x+e.w>player.x&&e.x<player.x+player.w){lives--;document.getElementById('lives').textContent=lives;explode(player.x+player.w/2,player.y,'#f43f5e');e.y=999;if(lives<=0){gameRunning=false;document.getElementById('finalScore').textContent=score;document.getElementById('gameOver').classList.remove('hidden')}}});
  enemies=enemies.filter(e=>e.y<520);
  // Particles
  particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life--});
  particles=particles.filter(p=>p.life>0);
  // Level up
  if(score>=level*100){level++;enemySpeed+=.3;spawnRate=Math.max(25,spawnRate-8);document.getElementById('level').textContent=level}
}
function draw(){
  ctx.fillStyle='#0a0a14';ctx.fillRect(0,0,600,500);
  // Stars
  stars.forEach(s=>{ctx.fillStyle=\`rgba(255,255,255,\${s.s/2})\`;ctx.fillRect(s.x,s.y,s.s,s.s)});
  // Player
  ctx.fillStyle='#6366f1';ctx.beginPath();ctx.moveTo(player.x+player.w/2,player.y);ctx.lineTo(player.x,player.y+player.h);ctx.lineTo(player.x+player.w,player.y+player.h);ctx.fill();
  ctx.fillStyle='#818cf8';ctx.fillRect(player.x+player.w/2-2,player.y+player.h,4,6);
  // Bullets
  ctx.fillStyle='#22c55e';bullets.forEach(b=>{ctx.fillRect(b.x,b.y,4,10)});
  // Enemies
  enemies.forEach(e=>{ctx.fillStyle=e.type==='big'?'#f59e0b':'#f43f5e';ctx.beginPath();ctx.moveTo(e.x,e.y+e.h);ctx.lineTo(e.x+e.w/2,e.y);ctx.lineTo(e.x+e.w,e.y+e.h);ctx.fill()});
  // Particles
  particles.forEach(p=>{ctx.globalAlpha=p.life/30;ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,3,3);ctx.globalAlpha=1});
}
function loop(){if(!gameRunning)return;update();draw();requestAnimationFrame(loop)}
document.addEventListener('keydown',e=>{keys[e.key]=true;if(e.key===' '){e.preventDefault();if(gameRunning)bullets.push({x:player.x+player.w/2-2,y:player.y})}});
document.addEventListener('keyup',e=>keys[e.key]=false);
</script>
</body>
</html>`,
};

// ── React Prebuilt Apps ───────────────────────────────────────────

const reactChatApp: PrebuiltApp = {
  id: 'react-chat-ui',
  name: 'Chat Application',
  description: 'Modern chat interface with contacts, messages & typing indicator',
  language: 'react',
  icon: '💬',
  code: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ChatApp</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#0a0a0f;color:#e0e0e8;height:100vh;display:flex}
.contacts{width:300px;background:#0e0e14;border-right:1px solid rgba(255,255,255,.06);display:flex;flex-direction:column}
.contacts-header{padding:16px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:12px}
.contacts-header h2{font-size:16px;font-weight:700;flex:1}
.search-box{padding:12px 16px}
.search-box input{width:100%;padding:10px 14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;color:#ccc;font-size:12px;outline:none}
.contact-list{flex:1;overflow-y:auto}
.contact{display:flex;align-items:center;gap:12px;padding:12px 16px;cursor:pointer;transition:.15s;border-left:3px solid transparent}
.contact:hover{background:rgba(255,255,255,.03)}.contact.active{background:rgba(99,102,241,.08);border-left-color:#6366f1}
.contact-avatar{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;position:relative}
.online-dot{position:absolute;bottom:0;right:0;width:10px;height:10px;background:#22c55e;border:2px solid #0e0e14;border-radius:50%}
.contact-info{flex:1;min-width:0}
.contact-info .name{font-size:13px;font-weight:600}.contact-info .last-msg{font-size:11px;color:#666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.contact-time{font-size:10px;color:#555;flex-shrink:0}
.chat{flex:1;display:flex;flex-direction:column}
.chat-header{padding:14px 20px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:12px}
.chat-header .avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px}
.chat-header .info .name{font-size:14px;font-weight:600}.chat-header .info .status{font-size:11px;color:#22c55e}
.messages{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:12px}
.msg{max-width:70%;padding:10px 16px;border-radius:16px;font-size:13px;line-height:1.5;animation:fadeIn .2s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
.msg.sent{align-self:flex-end;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-bottom-right-radius:4px}
.msg.received{align-self:flex-start;background:rgba(255,255,255,.06);border-bottom-left-radius:4px}
.msg .time{font-size:9px;opacity:.5;margin-top:4px}
.typing{align-self:flex-start;padding:10px 16px;background:rgba(255,255,255,.06);border-radius:16px;font-size:12px;color:#888;display:flex;align-items:center;gap:6px}
.typing-dots span{display:inline-block;width:6px;height:6px;background:#888;border-radius:50%;animation:bounce .6s ease infinite}
.typing-dots span:nth-child(2){animation-delay:.15s}.typing-dots span:nth-child(3){animation-delay:.3s}
@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
.input-area{padding:14px 20px;border-top:1px solid rgba(255,255,255,.06);display:flex;gap:8px}
.input-area input{flex:1;padding:12px 16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;color:#e0e0e8;font-size:13px;outline:none}
.input-area input:focus{border-color:rgba(99,102,241,.4)}
.input-area button{padding:12px 20px;background:#6366f1;color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;transition:.2s}
.input-area button:hover{background:#4f46e5}
</style>
</head>
<body>
<aside class="contacts">
<div class="contacts-header"><h2>💬 Messages</h2></div>
<div class="search-box"><input placeholder="Search conversations..." id="searchInput" oninput="filterContacts()"></div>
<div class="contact-list" id="contactList"></div>
</aside>
<main class="chat">
<div class="chat-header" id="chatHeader"></div>
<div class="messages" id="messagesArea"></div>
<div class="input-area">
<input id="msgInput" placeholder="Type a message..." onkeydown="if(event.key==='Enter')sendMessage()">
<button onclick="sendMessage()">Send</button>
</div>
</main>
<script>
const contacts=[
  {id:1,name:'Sarah Chen',emoji:'👩‍💻',online:true,messages:[{text:'Hey! How\\'s the new project going?',sent:false,time:'10:30 AM'},{text:'Great! Almost done with the landing page',sent:true,time:'10:32 AM'},{text:'That\\'s awesome! Can you share a preview?',sent:false,time:'10:33 AM'},{text:'Sure, I\\'ll push it to staging in 5 min',sent:true,time:'10:35 AM'}]},
  {id:2,name:'Mike Johnson',emoji:'👨‍🎨',online:true,messages:[{text:'The design mockups are ready for review',sent:false,time:'9:15 AM'},{text:'Looking good! Love the color scheme',sent:true,time:'9:20 AM'},{text:'Thanks! I refined the typography too',sent:false,time:'9:22 AM'}]},
  {id:3,name:'Emily Davis',emoji:'👩‍🔬',online:false,messages:[{text:'Can we schedule a code review for tomorrow?',sent:false,time:'Yesterday'},{text:'Sure, how about 2pm?',sent:true,time:'Yesterday'}]},
  {id:4,name:'Alex Rivera',emoji:'🧑‍💻',online:true,messages:[{text:'Just deployed the new API endpoints',sent:false,time:'8:00 AM'},{text:'Nice! I\\'ll start integrating the frontend',sent:true,time:'8:05 AM'}]},
  {id:5,name:'Team Standup',emoji:'👥',online:false,messages:[{text:'Don\\'t forget standup at 9:30!',sent:false,time:'Yesterday'}]},
];
let activeId=1;
function renderContacts(filter=''){
  const list=contacts.filter(c=>c.name.toLowerCase().includes(filter.toLowerCase()));
  document.getElementById('contactList').innerHTML=list.map(c=>{
    const last=c.messages[c.messages.length-1];
    return \`<div class="contact\${c.id===activeId?' active':''}" onclick="selectContact(\${c.id})">
      <div class="contact-avatar" style="background:rgba(99,102,241,.15)">\${c.emoji}\${c.online?'<div class="online-dot"></div>':''}</div>
      <div class="contact-info"><div class="name">\${c.name}</div><div class="last-msg">\${last.text}</div></div>
      <div class="contact-time">\${last.time}</div></div>\`;
  }).join('');
}
function renderChat(){
  const c=contacts.find(c=>c.id===activeId);
  document.getElementById('chatHeader').innerHTML=\`<div class="avatar" style="background:rgba(99,102,241,.15)">\${c.emoji}</div><div class="info"><div class="name">\${c.name}</div><div class="status">\${c.online?'Online':'Offline'}</div></div>\`;
  document.getElementById('messagesArea').innerHTML=c.messages.map(m=>\`<div class="msg \${m.sent?'sent':'received'}">\${m.text}<div class="time">\${m.time}</div></div>\`).join('');
  const area=document.getElementById('messagesArea');area.scrollTop=area.scrollHeight;
}
function selectContact(id){activeId=id;renderContacts();renderChat()}
function filterContacts(){renderContacts(document.getElementById('searchInput').value)}
function sendMessage(){
  const input=document.getElementById('msgInput');const text=input.value.trim();if(!text)return;
  const c=contacts.find(c=>c.id===activeId);c.messages.push({text,sent:true,time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})});
  input.value='';renderChat();renderContacts();
  // Simulate reply
  setTimeout(()=>{
    const area=document.getElementById('messagesArea');
    area.innerHTML+=\`<div class="typing"><div class="typing-dots"><span></span><span></span><span></span></div> typing...</div>\`;
    area.scrollTop=area.scrollHeight;
    setTimeout(()=>{
      const replies=['Got it!','Sounds great! 👍','I\\'ll check and get back to you','Thanks for letting me know','Awesome work!'];
      c.messages.push({text:replies[Math.floor(Math.random()*replies.length)],sent:false,time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})});
      renderChat();renderContacts();
    },1500);
  },800);
}
renderContacts();renderChat();
</script>
</body>
</html>`,
};

// ── Python Prebuilt Apps ──────────────────────────────────────────

const pythonFlaskApi: PrebuiltApp = {
  id: 'python-flask-api',
  name: 'Flask REST API',
  description: 'Complete REST API with CRUD, validation & documentation',
  language: 'python',
  icon: '🐍',
  code: `"""
Flask REST API — Task Management Service
==========================================
A production-ready REST API with CRUD operations,
input validation, error handling, and auto-documentation.

Run: pip install flask && python app.py
Endpoints: http://localhost:5000/api/tasks
"""

from flask import Flask, jsonify, request, abort
from datetime import datetime
from functools import wraps
import uuid

app = Flask(__name__)

# ── In-memory store ──────────────────────────────────────────────
tasks_db: dict[str, dict] = {}

# Seed some sample data
for title, desc, priority, status in [
    ("Design landing page", "Create wireframes and high-fidelity mockups", "high", "in_progress"),
    ("Setup CI/CD pipeline", "Configure GitHub Actions for auto-deployment", "medium", "todo"),
    ("Write unit tests", "Add tests for auth module and API endpoints", "medium", "todo"),
    ("Fix mobile nav bug", "Hamburger menu not closing on route change", "high", "done"),
    ("Update documentation", "Refresh README and API reference docs", "low", "review"),
]:
    tid = str(uuid.uuid4())[:8]
    tasks_db[tid] = {
        "id": tid,
        "title": title,
        "description": desc,
        "priority": priority,
        "status": status,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }


# ── Validation helpers ───────────────────────────────────────────
VALID_PRIORITIES = {"low", "medium", "high"}
VALID_STATUSES = {"todo", "in_progress", "review", "done"}


def validate_task_input(data: dict, partial: bool = False) -> dict:
    """Validate and sanitize task input data."""
    errors = []

    if not partial and "title" not in data:
        errors.append("'title' is required")
    if "title" in data and (not isinstance(data["title"], str) or len(data["title"].strip()) == 0):
        errors.append("'title' must be a non-empty string")
    if "priority" in data and data["priority"] not in VALID_PRIORITIES:
        errors.append(f"'priority' must be one of: {', '.join(VALID_PRIORITIES)}")
    if "status" in data and data["status"] not in VALID_STATUSES:
        errors.append(f"'status' must be one of: {', '.join(VALID_STATUSES)}")

    if errors:
        abort(400, description="; ".join(errors))

    return {k: v.strip() if isinstance(v, str) else v for k, v in data.items()}


# ── Error handlers ───────────────────────────────────────────────
@app.errorhandler(400)
def bad_request(e):
    return jsonify({"error": "Bad Request", "message": str(e.description)}), 400


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not Found", "message": str(e.description)}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal Server Error"}), 500


# ── API Routes ───────────────────────────────────────────────────
@app.route("/api/tasks", methods=["GET"])
def list_tasks():
    """List all tasks with optional filtering and sorting."""
    tasks = list(tasks_db.values())

    # Filter by status
    status = request.args.get("status")
    if status:
        tasks = [t for t in tasks if t["status"] == status]

    # Filter by priority
    priority = request.args.get("priority")
    if priority:
        tasks = [t for t in tasks if t["priority"] == priority]

    # Search by title
    search = request.args.get("q")
    if search:
        tasks = [t for t in tasks if search.lower() in t["title"].lower()]

    # Sort
    sort_by = request.args.get("sort", "created_at")
    reverse = request.args.get("order", "desc") == "desc"
    if sort_by in ("created_at", "updated_at", "title", "priority"):
        tasks.sort(key=lambda t: t.get(sort_by, ""), reverse=reverse)

    return jsonify({
        "tasks": tasks,
        "total": len(tasks),
    })


@app.route("/api/tasks", methods=["POST"])
def create_task():
    """Create a new task."""
    data = validate_task_input(request.get_json(force=True))
    task_id = str(uuid.uuid4())[:8]
    now = datetime.utcnow().isoformat()

    task = {
        "id": task_id,
        "title": data["title"],
        "description": data.get("description", ""),
        "priority": data.get("priority", "medium"),
        "status": data.get("status", "todo"),
        "created_at": now,
        "updated_at": now,
    }
    tasks_db[task_id] = task
    return jsonify(task), 201


@app.route("/api/tasks/<task_id>", methods=["GET"])
def get_task(task_id: str):
    """Get a single task by ID."""
    task = tasks_db.get(task_id)
    if not task:
        abort(404, description=f"Task '{task_id}' not found")
    return jsonify(task)


@app.route("/api/tasks/<task_id>", methods=["PUT"])
def update_task(task_id: str):
    """Update an existing task."""
    task = tasks_db.get(task_id)
    if not task:
        abort(404, description=f"Task '{task_id}' not found")

    data = validate_task_input(request.get_json(force=True), partial=True)
    for key in ("title", "description", "priority", "status"):
        if key in data:
            task[key] = data[key]
    task["updated_at"] = datetime.utcnow().isoformat()

    return jsonify(task)


@app.route("/api/tasks/<task_id>", methods=["DELETE"])
def delete_task(task_id: str):
    """Delete a task by ID."""
    if task_id not in tasks_db:
        abort(404, description=f"Task '{task_id}' not found")
    del tasks_db[task_id]
    return jsonify({"message": f"Task '{task_id}' deleted"}), 200


@app.route("/api/stats", methods=["GET"])
def get_stats():
    """Get task statistics."""
    tasks = list(tasks_db.values())
    return jsonify({
        "total": len(tasks),
        "by_status": {s: sum(1 for t in tasks if t["status"] == s) for s in VALID_STATUSES},
        "by_priority": {p: sum(1 for t in tasks if t["priority"] == p) for p in VALID_PRIORITIES},
    })


# ── Entry point ──────────────────────────────────────────────────
if __name__ == "__main__":
    print("\\n🚀 Task API running at http://localhost:5000")
    print("📖 Endpoints:")
    print("   GET    /api/tasks          — List tasks (filter: ?status=todo&priority=high&q=search)")
    print("   POST   /api/tasks          — Create task")
    print("   GET    /api/tasks/<id>     — Get task")
    print("   PUT    /api/tasks/<id>     — Update task")
    print("   DELETE /api/tasks/<id>     — Delete task")
    print("   GET    /api/stats          — Task statistics\\n")
    app.run(debug=True, port=5000)
`,
};

const pythonDataViz: PrebuiltApp = {
  id: 'python-data-analysis',
  name: 'Data Analysis Script',
  description: 'Pandas data analysis with stats, cleaning & visualization prep',
  language: 'python',
  icon: '📈',
  code: '"""\nData Analysis Toolkit\n=====================\nA comprehensive data analysis script demonstrating\npandas, statistics, data cleaning, and report generation.\n\nRun: pip install pandas numpy && python analysis.py\n"""\n\nimport pandas as pd\nimport numpy as np\nfrom datetime import datetime, timedelta\n\n# Generate Sample Dataset\nnp.random.seed(42)\nn = 500\n\ndates = [datetime(2025, 1, 1) + timedelta(days=int(x)) for x in np.random.uniform(0, 365, n)]\ncategories = np.random.choice(["Electronics", "Clothing", "Home", "Books", "Sports"], n, p=[0.3, 0.25, 0.2, 0.15, 0.1])\namounts = np.round(np.random.exponential(scale=80, size=n) + 10, 2)\nquantities = np.random.randint(1, 10, n)\nregions = np.random.choice(["North", "South", "East", "West"], n)\nchannels = np.random.choice(["Online", "Store", "Mobile"], n, p=[0.45, 0.30, 0.25])\n\namounts_with_na = amounts.copy()\namounts_with_na[np.random.choice(n, 15, replace=False)] = np.nan\n\ndf = pd.DataFrame({\n    "date": dates,\n    "category": categories,\n    "amount": amounts_with_na,\n    "quantity": quantities,\n    "region": regions,\n    "channel": channels,\n})\n\nprint("=" * 60)\nprint("SALES DATA ANALYSIS REPORT")\nprint("=" * 60)\n\n# 1. Data Overview\nprint("\\n1. DATA OVERVIEW")\nprint("   Records:", len(df))\nprint("   Columns:", ", ".join(df.columns))\nprint("   Date Range:", df["date"].min().strftime("%Y-%m-%d"), "to", df["date"].max().strftime("%Y-%m-%d"))\nprint("   Missing Values:", df.isnull().sum().sum())\n\n# 2. Data Cleaning\nprint("\\n2. DATA CLEANING")\nmissing_before = df["amount"].isnull().sum()\ndf["amount"] = df["amount"].fillna(df.groupby("category")["amount"].transform("median"))\nprint("   Filled", missing_before, "missing amounts with category median")\n\ndf["total"] = df["amount"] * df["quantity"]\ndf["month"] = df["date"].dt.month\ndf["day_of_week"] = df["date"].dt.day_name()\nprint("   Added derived columns: total, month, day_of_week")\n\n# 3. Summary Statistics\nprint("\\n3. SUMMARY STATISTICS")\ntotal_rev = df["total"].sum()\nprint("   Total Revenue:", round(total_rev, 2))\nprint("   Average Order:", round(df["amount"].mean(), 2))\nprint("   Std Deviation:", round(df["amount"].std(), 2))\nprint("   Min / Max:", round(df["amount"].min(), 2), "/", round(df["amount"].max(), 2))\n\n# 4. Category Analysis\nprint("\\n4. REVENUE BY CATEGORY")\ncat_stats = df.groupby("category").agg(\n    orders=("amount", "count"),\n    revenue=("total", "sum"),\n).sort_values("revenue", ascending=False)\n\nfor cat, row in cat_stats.iterrows():\n    bar = "\\u2588" * int(row["revenue"] / cat_stats["revenue"].max() * 30)\n    print("  ", cat.ljust(12), "|", str(round(row["revenue"])).rjust(10), "|", str(row["orders"]).rjust(3), "orders |", bar)\n\n# 5. Regional Performance\nprint("\\n5. REVENUE BY REGION")\nregion_stats = df.groupby("region")["total"].agg(["sum", "mean", "count"])\nregion_stats.columns = ["revenue", "avg_order", "orders"]\nregion_stats = region_stats.sort_values("revenue", ascending=False)\n\nfor region, row in region_stats.iterrows():\n    pct = row["revenue"] / region_stats["revenue"].sum() * 100\n    print("  ", region.ljust(6), "|", str(round(row["revenue"])).rjust(10), "(" + str(round(pct, 1)) + "%) |", row["orders"], "orders")\n\n# 6. Top Customers by Revenue\nprint("\\n6. TOP 10 REVENUE ENTRIES")\ntop = df.nlargest(10, "total")\nfor i, (_, row) in enumerate(top.iterrows(), 1):\n    print("  ", str(i).rjust(2) + ".", row["category"], "-", round(row["total"], 2))\n\n# 7. Monthly Trend\nprint("\\n7. MONTHLY REVENUE TREND")\nmonthly = df.groupby("month")["total"].sum()\nmonths = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]\nfor m in sorted(monthly.index):\n    bar = "\\u2593" * int(monthly[m] / monthly.max() * 40)\n    print("  ", months[m-1], "|", str(round(monthly[m])).rjust(10), "|", bar)\n\nprint("\\n" + "=" * 60)\nprint("Analysis complete!")\nprint("=" * 60)\n',
};

// ── TypeScript Prebuilt App ───────────────────────────────────────

const tsUtilityLib: PrebuiltApp = {
  id: 'ts-utility-library',
  name: 'TypeScript Utility Library',
  description: 'Production-ready utility functions with full type safety',
  language: 'typescript',
  icon: '🔷',
  code: `/**
 * TypeScript Utility Library
 * ==========================
 * A collection of production-ready, fully typed utility functions
 * covering arrays, objects, strings, dates, async patterns, and more.
 */

// ── Array Utilities ─────────────────────────────────────────────

/** Group array items by a key function */
export function groupBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    (acc[key] ??= []).push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

/** Remove duplicates by key */
export function uniqueBy<T>(items: T[], keyFn: (item: T) => unknown): T[] {
  const seen = new Set<unknown>();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Chunk array into groups of size n */
export function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/** Shuffle array (Fisher-Yates) */
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Get the intersection of two arrays */
export function intersection<T>(a: T[], b: T[]): T[] {
  const bSet = new Set(b);
  return a.filter((x) => bSet.has(x));
}

// ── Object Utilities ────────────────────────────────────────────

/** Deep clone an object */
export function deepClone<T>(obj: T): T {
  return structuredClone(obj);
}

/** Pick specified keys from an object */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) result[key] = obj[key];
  }
  return result;
}

/** Omit specified keys from an object */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) delete result[key];
  return result as Omit<T, K>;
}

/** Deep merge two objects */
export function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const output = { ...target };
  for (const key of Object.keys(source) as (keyof T)[]) {
    const val = source[key];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      output[key] = deepMerge(
        (output[key] as object) ?? {},
        val as object
      ) as T[keyof T];
    } else if (val !== undefined) {
      output[key] = val as T[keyof T];
    }
  }
  return output;
}

// ── String Utilities ────────────────────────────────────────────

/** Convert to camelCase */
export function camelCase(str: string): string {
  return str
    .replace(/[-_\\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
    .replace(/^./, (c) => c.toLowerCase());
}

/** Convert to kebab-case */
export function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\\s_]+/g, "-")
    .toLowerCase();
}

/** Truncate string with ellipsis */
export function truncate(str: string, maxLen: number, suffix = "..."): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - suffix.length) + suffix;
}

/** Slugify a string for URLs */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\\w\\s-]/g, "")
    .replace(/[\\s_]+/g, "-")
    .replace(/-+/g, "-");
}

// ── Async Utilities ─────────────────────────────────────────────

/** Sleep for given milliseconds */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retry a function with exponential backoff */
export async function retry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelay?: number; maxDelay?: number } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000 } = options;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === maxRetries) break;
      const delay = Math.min(baseDelay * 2 ** attempt, maxDelay);
      await sleep(delay + Math.random() * 1000);
    }
  }
  throw lastError;
}

/** Debounce a function */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Throttle a function */
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  interval: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= interval) {
      lastCall = now;
      fn(...args);
    }
  };
}

// ── Date Utilities ──────────────────────────────────────────────

/** Format relative time (e.g., "2 hours ago") */
export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const intervals: [number, string][] = [
    [31536000, "year"],
    [2592000, "month"],
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
    [1, "second"],
  ];
  for (const [secs, label] of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return \`\${count} \${label}\${count > 1 ? "s" : ""} ago\`;
  }
  return "just now";
}

// ── Validation Utilities ────────────────────────────────────────

/** Validate email format */
export function isValidEmail(email: string): boolean {
  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
}

/** Validate URL format */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ── Result Type (Error Handling) ────────────────────────────────

type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function Err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/** Wrap a promise in a Result type */
export async function tryCatch<T>(
  promise: Promise<T>
): Promise<Result<T>> {
  try {
    return Ok(await promise);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
}

// ── Usage Examples ──────────────────────────────────────────────

const users = [
  { id: 1, name: "Alice", role: "admin", age: 30 },
  { id: 2, name: "Bob", role: "user", age: 25 },
  { id: 3, name: "Charlie", role: "admin", age: 35 },
  { id: 4, name: "Diana", role: "user", age: 28 },
];

console.log("groupBy role:", groupBy(users, (u) => u.role));
console.log("chunk [1..8] by 3:", chunk([1, 2, 3, 4, 5, 6, 7, 8], 3));
console.log("camelCase:", camelCase("hello-world-test"));
console.log("kebabCase:", kebabCase("myVariableName"));
console.log("slugify:", slugify("Hello World! This is a Test"));
console.log("truncate:", truncate("This is a very long string", 15));
console.log("timeAgo:", timeAgo(new Date(Date.now() - 3600000)));
console.log("isValidEmail:", isValidEmail("test@example.com"));
console.log("pick:", pick(users[0], ["name", "role"]));
`,
};

// ── Next.js Prebuilt App ──────────────────────────────────────────

const nextjsSaaS: PrebuiltApp = {
  id: 'nextjs-saas-landing',
  name: 'SaaS Landing Page',
  description: 'Modern SaaS landing with hero, features, pricing & CTA',
  language: 'nextjs',
  icon: '▲',
  code: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>LaunchPad — Ship Faster</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#050508;color:#e8e8ef;overflow-x:hidden}
nav{position:fixed;top:0;width:100%;background:rgba(5,5,8,.85);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,.04);padding:14px 48px;display:flex;justify-content:space-between;align-items:center;z-index:100}
.nav-logo{font-size:18px;font-weight:800;background:linear-gradient(135deg,#6366f1,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.nav-links{display:flex;gap:28px;align-items:center}
.nav-links a{color:#888;text-decoration:none;font-size:13px;font-weight:500;transition:.2s}.nav-links a:hover{color:#c4b5fd}
.nav-cta{padding:8px 20px;background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;border-radius:8px;font-weight:600;font-size:13px;text-decoration:none;transition:.2s}
.nav-cta:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(99,102,241,.4)}
.hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 20px;position:relative}
.hero::before{content:'';position:absolute;top:10%;width:600px;height:600px;background:radial-gradient(circle,rgba(99,102,241,.12),transparent 70%);border-radius:50%;pointer-events:none}
.badge{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.2);border-radius:20px;font-size:11px;font-weight:600;color:#a5b4fc;margin-bottom:20px}
.hero h1{font-size:clamp(36px,5vw,60px);font-weight:800;line-height:1.1;max-width:700px;margin-bottom:20px}
.hero h1 span{background:linear-gradient(135deg,#6366f1,#a855f7,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hero p{font-size:17px;color:#888;max-width:520px;line-height:1.6;margin-bottom:36px}
.hero-btns{display:flex;gap:12px}
.btn-primary{padding:14px 32px;background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;transition:.2s;text-decoration:none}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(99,102,241,.35)}
.btn-ghost{padding:14px 32px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:#ccc;border-radius:12px;font-size:15px;font-weight:500;cursor:pointer;transition:.2s;text-decoration:none}
.btn-ghost:hover{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.2)}
section{padding:100px 48px;max-width:1200px;margin:0 auto}
.section-header{text-align:center;margin-bottom:60px}
.section-header h2{font-size:32px;font-weight:700;margin-bottom:12px}.section-header h2 span{color:#a855f7}
.section-header p{color:#888;font-size:15px;max-width:480px;margin:0 auto}
.features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.feature{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:28px;transition:.3s}
.feature:hover{border-color:rgba(99,102,241,.25);transform:translateY(-4px);box-shadow:0 12px 32px rgba(0,0,0,.2)}
.feature-icon{width:44px;height:44px;background:linear-gradient(135deg,rgba(99,102,241,.15),rgba(168,85,247,.15));border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;margin-bottom:16px}
.feature h3{font-size:16px;font-weight:600;margin-bottom:8px}.feature p{font-size:13px;color:#888;line-height:1.5}
.pricing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;align-items:start}
.price-card{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:20px;padding:32px;text-align:center;transition:.3s}
.price-card:hover{transform:translateY(-4px)}
.price-card.popular{border-color:rgba(99,102,241,.4);background:rgba(99,102,241,.05);position:relative}
.popular-badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;padding:4px 16px;border-radius:12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
.price-card h3{font-size:18px;font-weight:600;margin-bottom:4px}.price-card .price{font-size:40px;font-weight:800;margin:16px 0 4px}.price-card .price span{font-size:14px;color:#888;font-weight:400}
.price-card .desc{font-size:12px;color:#666;margin-bottom:20px}
.price-features{list-style:none;text-align:left;margin-bottom:24px}
.price-features li{padding:6px 0;font-size:13px;color:#aaa;display:flex;align-items:center;gap:8px}
.price-features li::before{content:'✓';color:#6366f1;font-weight:700}
.price-btn{display:block;width:100%;padding:12px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;transition:.2s;text-decoration:none;text-align:center}
.price-btn-primary{background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;border:none}.price-btn-primary:hover{box-shadow:0 4px 16px rgba(99,102,241,.4)}
.price-btn-ghost{background:transparent;border:1px solid rgba(255,255,255,.1);color:#ccc}.price-btn-ghost:hover{border-color:rgba(255,255,255,.2);background:rgba(255,255,255,.04)}
.cta{text-align:center;background:linear-gradient(135deg,rgba(99,102,241,.08),rgba(168,85,247,.08));border:1px solid rgba(99,102,241,.15);border-radius:24px;padding:60px 40px}
.cta h2{font-size:28px;font-weight:700;margin-bottom:12px}.cta p{color:#888;font-size:15px;margin-bottom:28px}
footer{text-align:center;padding:40px;border-top:1px solid rgba(255,255,255,.04);color:#555;font-size:12px;margin-top:40px}
@media(max-width:768px){.features-grid,.pricing-grid{grid-template-columns:1fr}nav{padding:14px 20px}section{padding:60px 20px}}
</style>
</head>
<body>
<nav><div class="nav-logo">⚡ LaunchPad</div><div class="nav-links"><a href="#features">Features</a><a href="#pricing">Pricing</a><a href="#">Docs</a><a class="nav-cta" href="#pricing">Get Started</a></div></nav>

<section class="hero">
<div class="badge">🚀 Now in Public Beta — v2.0</div>
<h1>Build & ship products <span>10x faster</span></h1>
<p>The all-in-one platform for modern teams. Authentication, payments, analytics, and deployment — all pre-configured and ready to go.</p>
<div class="hero-btns"><a href="#pricing" class="btn-primary">Start Building Free →</a><a href="#features" class="btn-ghost">See Features</a></div>
</section>

<section id="features">
<div class="section-header"><h2>Everything you need to <span>ship fast</span></h2><p>Stop wasting time on boilerplate. Focus on what makes your product unique.</p></div>
<div class="features-grid">
<div class="feature"><div class="feature-icon">🔐</div><h3>Authentication</h3><p>Email, social login, 2FA, and session management out of the box. Zero config needed.</p></div>
<div class="feature"><div class="feature-icon">💳</div><h3>Payments & Billing</h3><p>Stripe integration with subscriptions, invoices, and usage-based billing built in.</p></div>
<div class="feature"><div class="feature-icon">📊</div><h3>Real-time Analytics</h3><p>Track users, events, and revenue with beautiful dashboards and custom reports.</p></div>
<div class="feature"><div class="feature-icon">🚀</div><h3>One-Click Deploy</h3><p>Deploy to production in seconds with built-in CI/CD, SSL, and custom domains.</p></div>
<div class="feature"><div class="feature-icon">🔌</div><h3>API & Webhooks</h3><p>Auto-generated REST & GraphQL APIs with rate limiting and webhook management.</p></div>
<div class="feature"><div class="feature-icon">🤖</div><h3>AI Powered</h3><p>Built-in AI assistant for code generation, testing, and automated customer support.</p></div>
</div>
</section>

<section id="pricing">
<div class="section-header"><h2>Simple, transparent <span>pricing</span></h2><p>Start free, scale as you grow. No hidden fees.</p></div>
<div class="pricing-grid">
<div class="price-card"><h3>Starter</h3><div class="price">$0<span>/mo</span></div><div class="desc">Perfect for side projects</div><ul class="price-features"><li>Up to 1,000 users</li><li>Basic authentication</li><li>Community support</li><li>1 project</li></ul><a class="price-btn price-btn-ghost">Get Started</a></div>
<div class="price-card popular"><div class="popular-badge">Most Popular</div><h3>Pro</h3><div class="price">$29<span>/mo</span></div><div class="desc">For growing startups</div><ul class="price-features"><li>Unlimited users</li><li>Advanced auth + 2FA</li><li>Payments integration</li><li>10 projects</li><li>Priority support</li></ul><a class="price-btn price-btn-primary">Start Free Trial</a></div>
<div class="price-card"><h3>Enterprise</h3><div class="price">$99<span>/mo</span></div><div class="desc">For scaling teams</div><ul class="price-features"><li>Everything in Pro</li><li>Custom domains</li><li>SSO & RBAC</li><li>Unlimited projects</li><li>Dedicated support</li><li>SLA guarantee</li></ul><a class="price-btn price-btn-ghost">Contact Sales</a></div>
</div>
</section>

<section><div class="cta"><h2>Ready to launch your next idea?</h2><p>Join 5,000+ developers building with LaunchPad</p><a href="#" class="btn-primary">Start Building Free →</a></div></section>

<footer>&copy; 2026 LaunchPad. All rights reserved.</footer>
</body>
</html>`,
};

const reactMusicPlayer: PrebuiltApp = {
  id: 'react-music-player',
  name: 'Music Player',
  description: 'Sleek music player with playlist, controls & progress bar',
  language: 'react',
  icon: '🎵',
  code: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Music Player</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#0a0a0f;color:#e0e0e8;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.player{width:400px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:24px;overflow:hidden;backdrop-filter:blur(20px)}
.album-art{height:280px;background:linear-gradient(135deg,#1a1a2e,#16213e,#0f3460);display:flex;align-items:center;justify-content:center;font-size:100px;position:relative}
.album-art::after{content:'';position:absolute;inset:0;background:linear-gradient(to bottom,transparent 60%,rgba(10,10,15,.8))}
.track-info{padding:24px;text-align:center;position:relative;z-index:1;margin-top:-40px}
.track-info h2{font-size:20px;font-weight:700;margin-bottom:4px}
.track-info p{font-size:13px;color:#888}
.progress{padding:0 24px;margin:16px 0}
.progress-bar{width:100%;height:4px;background:rgba(255,255,255,.08);border-radius:2px;cursor:pointer;position:relative}
.progress-fill{height:100%;background:linear-gradient(90deg,#6366f1,#a855f7);border-radius:2px;width:35%;transition:width .3s}
.progress-fill::after{content:'';position:absolute;right:-5px;top:-4px;width:12px;height:12px;background:#fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.3)}
.progress-times{display:flex;justify-content:space-between;margin-top:6px;font-size:10px;color:#666}
.controls{display:flex;align-items:center;justify-content:center;gap:20px;padding:20px}
.ctrl-btn{background:none;border:none;color:#888;font-size:18px;cursor:pointer;transition:.2s;padding:8px;border-radius:50%}
.ctrl-btn:hover{color:#fff;background:rgba(255,255,255,.06)}
.play-btn{width:56px;height:56px;background:linear-gradient(135deg,#6366f1,#a855f7);border:none;border-radius:50%;color:#fff;font-size:22px;cursor:pointer;transition:.2s;display:flex;align-items:center;justify-content:center}
.play-btn:hover{transform:scale(1.05);box-shadow:0 4px 20px rgba(99,102,241,.4)}
.extra-controls{display:flex;justify-content:space-between;padding:0 24px 20px;align-items:center}
.vol-slider{display:flex;align-items:center;gap:6px}
.vol-slider input{width:80px;accent-color:#6366f1;height:3px}
.vol-slider span{font-size:12px;color:#666}
.extra-btn{background:none;border:none;color:#666;font-size:14px;cursor:pointer;transition:.2s;padding:4px 8px;border-radius:6px}
.extra-btn:hover{color:#a855f7;background:rgba(168,85,247,.1)}
.extra-btn.active{color:#a855f7}
.playlist{border-top:1px solid rgba(255,255,255,.06);max-height:240px;overflow-y:auto}
.playlist-header{padding:14px 24px;font-size:12px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;display:flex;justify-content:space-between}
.song{display:flex;align-items:center;gap:12px;padding:10px 24px;cursor:pointer;transition:.15s}
.song:hover{background:rgba(255,255,255,.03)}.song.active{background:rgba(99,102,241,.08)}
.song-num{font-size:11px;color:#555;width:20px;text-align:center}
.song.active .song-num{color:#6366f1}
.song-art{width:36px;height:36px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.song-info{flex:1;min-width:0}.song-info .name{font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.song.active .song-info .name{color:#a855f7}
.song-info .artist{font-size:10px;color:#666}.song-dur{font-size:10px;color:#555}
</style>
</head>
<body>
<div class="player">
<div class="album-art" id="albumArt">🎵</div>
<div class="track-info"><h2 id="trackName">Midnight City</h2><p id="trackArtist">M83</p></div>
<div class="progress"><div class="progress-bar" onclick="seekTrack(event)"><div class="progress-fill" id="progressFill" style="width:35%"></div></div><div class="progress-times"><span id="currentTime">1:23</span><span id="totalTime">3:58</span></div></div>
<div class="controls">
<button class="ctrl-btn" onclick="toggleShuffle()" id="shuffleBtn">🔀</button>
<button class="ctrl-btn" onclick="prevTrack()">⏮</button>
<button class="play-btn" onclick="togglePlay()" id="playBtn">▶</button>
<button class="ctrl-btn" onclick="nextTrack()">⏭</button>
<button class="ctrl-btn" onclick="toggleRepeat()" id="repeatBtn">🔁</button>
</div>
<div class="extra-controls">
<div class="vol-slider"><span>🔊</span><input type="range" min="0" max="100" value="75" oninput="setVolume(this.value)"><span id="volVal">75%</span></div>
<button class="extra-btn" onclick="toggleLike()" id="likeBtn">♡</button>
</div>
<div class="playlist">
<div class="playlist-header"><span>Playlist</span><span id="songCount"></span></div>
<div id="playlistSongs"></div>
</div>
</div>
<script>
const songs=[
  {name:'Midnight City',artist:'M83',dur:'3:58',emoji:'🌃',bg:'linear-gradient(135deg,#1a1a2e,#16213e)'},
  {name:'Blinding Lights',artist:'The Weeknd',dur:'3:20',emoji:'✨',bg:'linear-gradient(135deg,#2d1b4e,#4a1942)'},
  {name:'Starboy',artist:'The Weeknd',dur:'3:50',emoji:'⭐',bg:'linear-gradient(135deg,#1a1a2e,#2d3436)'},
  {name:'Something Just Like This',artist:'Coldplay',dur:'4:08',emoji:'💫',bg:'linear-gradient(135deg,#0f3460,#16213e)'},
  {name:'Levitating',artist:'Dua Lipa',dur:'3:24',emoji:'🪩',bg:'linear-gradient(135deg,#6c3483,#2c3e50)'},
  {name:'Heat Waves',artist:'Glass Animals',dur:'3:59',emoji:'🌊',bg:'linear-gradient(135deg,#e17055,#d63031)'},
  {name:'As It Was',artist:'Harry Styles',dur:'2:47',emoji:'🎸',bg:'linear-gradient(135deg,#1e3c72,#2a5298)'},
  {name:'Flowers',artist:'Miley Cyrus',dur:'3:21',emoji:'🌸',bg:'linear-gradient(135deg,#c0392b,#8e44ad)'},
];
let current=0,playing=false,shuffled=false,repeating=false,liked=new Set();
function render(){
  const s=songs[current];
  document.getElementById('trackName').textContent=s.name;
  document.getElementById('trackArtist').textContent=s.artist;
  document.getElementById('totalTime').textContent=s.dur;
  document.getElementById('albumArt').textContent=s.emoji;
  document.getElementById('albumArt').style.background=s.bg;
  document.getElementById('songCount').textContent=songs.length+' songs';
  document.getElementById('playlistSongs').innerHTML=songs.map((s,i)=>\`
    <div class="song\${i===current?' active':''}" onclick="playSong(\${i})">
      <span class="song-num">\${i===current&&playing?'♫':i+1}</span>
      <div class="song-art" style="background:rgba(99,102,241,.1)">\${s.emoji}</div>
      <div class="song-info"><div class="name">\${s.name}</div><div class="artist">\${s.artist}</div></div>
      <span class="song-dur">\${s.dur}</span>
    </div>\`).join('');
  document.getElementById('likeBtn').textContent=liked.has(current)?'❤️':'♡';
  document.getElementById('likeBtn').classList.toggle('active',liked.has(current));
}
function playSong(i){current=i;playing=true;document.getElementById('playBtn').textContent='⏸';render();simulateProgress()}
function togglePlay(){playing=!playing;document.getElementById('playBtn').textContent=playing?'⏸':'▶';if(playing)simulateProgress();render()}
function nextTrack(){current=(current+1)%songs.length;if(playing)playSong(current);else{render()}}
function prevTrack(){current=(current-1+songs.length)%songs.length;if(playing)playSong(current);else{render()}}
function toggleShuffle(){shuffled=!shuffled;document.getElementById('shuffleBtn').style.color=shuffled?'#a855f7':'#888'}
function toggleRepeat(){repeating=!repeating;document.getElementById('repeatBtn').style.color=repeating?'#a855f7':'#888'}
function toggleLike(){liked.has(current)?liked.delete(current):liked.add(current);render()}
function setVolume(v){document.getElementById('volVal').textContent=v+'%'}
function seekTrack(e){const pct=e.offsetX/e.currentTarget.offsetWidth*100;document.getElementById('progressFill').style.width=pct+'%'}
let progInterval;
function simulateProgress(){
  clearInterval(progInterval);let pct=0;const fill=document.getElementById('progressFill');
  progInterval=setInterval(()=>{if(!playing)return;pct+=0.5;if(pct>=100){pct=0;nextTrack()}
  fill.style.width=pct+'%';const totalSecs=parseInt(songs[current].dur)*60;const curSecs=Math.floor(totalSecs*pct/100);
  document.getElementById('currentTime').textContent=Math.floor(curSecs/60)+':'+String(curSecs%60).padStart(2,'0');},200);
}
render();
</script>
</body>
</html>`,
};

const htmlAuthPages: PrebuiltApp = {
  id: 'html-auth-pages',
  name: 'Authentication Pages',
  description: 'Login, signup & forgot password with validation & social login',
  language: 'html',
  icon: '🔐',
  code: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Auth Pages</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#0a0a0f;color:#e0e0e8;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.auth-container{width:100%;max-width:420px}
.tabs{display:flex;gap:4px;margin-bottom:24px;background:rgba(255,255,255,.03);border-radius:12px;padding:4px;border:1px solid rgba(255,255,255,.06)}
.tab{flex:1;padding:10px;text-align:center;font-size:13px;font-weight:600;border-radius:8px;cursor:pointer;transition:.2s;color:#888;background:transparent;border:none}
.tab.active{background:rgba(99,102,241,.15);color:#a5b4fc}
.tab:hover:not(.active){color:#ccc}
.card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:20px;padding:32px;backdrop-filter:blur(20px)}
.card h2{font-size:22px;font-weight:700;text-align:center;margin-bottom:4px}
.card .subtitle{text-align:center;font-size:13px;color:#888;margin-bottom:28px}
.form-group{margin-bottom:16px}
.form-group label{display:block;font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
.form-group input{width:100%;padding:12px 14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;color:#e0e0e8;font-size:13px;outline:none;transition:.2s}
.form-group input:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.15)}
.form-group input.error{border-color:#ef4444}
.error-msg{font-size:11px;color:#ef4444;margin-top:4px;display:none}
.error-msg.show{display:block}
.form-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
.form-row label{display:flex;align-items:center;gap:6px;font-size:12px;color:#888;cursor:pointer}
.form-row label input{width:14px;height:14px;accent-color:#6366f1}
.form-row a{font-size:12px;color:#6366f1;text-decoration:none}.form-row a:hover{color:#a5b4fc}
.submit-btn{width:100%;padding:14px;background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;transition:.2s;margin-bottom:20px}
.submit-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(99,102,241,.3)}
.submit-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none}
.divider{display:flex;align-items:center;gap:12px;margin-bottom:20px}
.divider::before,.divider::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.08)}
.divider span{font-size:11px;color:#666;text-transform:uppercase}
.social-btns{display:flex;gap:10px}
.social-btn{flex:1;padding:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:12px;font-weight:500;color:#ccc;cursor:pointer;transition:.2s;text-decoration:none}
.social-btn:hover{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.15)}
.footer-text{text-align:center;margin-top:20px;font-size:12px;color:#666}
.footer-text a{color:#6366f1;text-decoration:none}.footer-text a:hover{color:#a5b4fc}
.success-msg{background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.2);color:#22c55e;padding:12px 16px;border-radius:10px;font-size:12px;text-align:center;margin-bottom:16px;display:none}
.success-msg.show{display:block}
.hidden{display:none}
.password-strength{height:3px;background:rgba(255,255,255,.06);border-radius:2px;margin-top:6px;overflow:hidden}
.password-strength div{height:100%;border-radius:2px;transition:.3s;width:0}
</style>
</head>
<body>
<div class="auth-container">
<div class="tabs">
<button class="tab active" onclick="showForm('login')">Sign In</button>
<button class="tab" onclick="showForm('signup')">Sign Up</button>
<button class="tab" onclick="showForm('forgot')">Reset</button>
</div>

<!-- Login Form -->
<div class="card" id="loginForm">
<h2>Welcome back</h2>
<p class="subtitle">Sign in to your account to continue</p>
<div class="success-msg" id="loginSuccess">Successfully logged in! Redirecting...</div>
<div class="form-group"><label>Email</label><input type="email" id="loginEmail" placeholder="you@example.com"><div class="error-msg" id="loginEmailError">Please enter a valid email</div></div>
<div class="form-group"><label>Password</label><input type="password" id="loginPassword" placeholder="••••••••"><div class="error-msg" id="loginPasswordError">Password is required</div></div>
<div class="form-row"><label><input type="checkbox" checked> Remember me</label><a href="#" onclick="showForm('forgot');return false">Forgot password?</a></div>
<button class="submit-btn" onclick="handleLogin()">Sign In</button>
<div class="divider"><span>or continue with</span></div>
<div class="social-btns"><a class="social-btn">🔵 Google</a><a class="social-btn">⚫ GitHub</a></div>
<p class="footer-text">Don't have an account? <a href="#" onclick="showForm('signup');return false">Sign up</a></p>
</div>

<!-- Signup Form -->
<div class="card hidden" id="signupForm">
<h2>Create account</h2>
<p class="subtitle">Start your free trial today</p>
<div class="form-group"><label>Full Name</label><input type="text" id="signupName" placeholder="John Doe"></div>
<div class="form-group"><label>Email</label><input type="email" id="signupEmail" placeholder="you@example.com"><div class="error-msg" id="signupEmailError">Please enter a valid email</div></div>
<div class="form-group"><label>Password</label><input type="password" id="signupPassword" placeholder="Min. 8 characters" oninput="checkStrength(this.value)"><div class="password-strength"><div id="strengthBar"></div></div><div class="error-msg" id="signupPasswordError">Password must be at least 8 characters</div></div>
<div class="form-group"><label>Confirm Password</label><input type="password" id="signupConfirm" placeholder="••••••••"><div class="error-msg" id="signupConfirmError">Passwords don't match</div></div>
<button class="submit-btn" onclick="handleSignup()">Create Account</button>
<div class="divider"><span>or continue with</span></div>
<div class="social-btns"><a class="social-btn">🔵 Google</a><a class="social-btn">⚫ GitHub</a></div>
<p class="footer-text">Already have an account? <a href="#" onclick="showForm('login');return false">Sign in</a></p>
</div>

<!-- Forgot Password Form -->
<div class="card hidden" id="forgotForm">
<h2>Reset password</h2>
<p class="subtitle">Enter your email to receive a reset link</p>
<div class="success-msg" id="forgotSuccess">Reset link sent! Check your inbox.</div>
<div class="form-group"><label>Email Address</label><input type="email" id="forgotEmail" placeholder="you@example.com"><div class="error-msg" id="forgotEmailError">Please enter a valid email</div></div>
<button class="submit-btn" onclick="handleForgot()">Send Reset Link</button>
<p class="footer-text">Remember your password? <a href="#" onclick="showForm('login');return false">Sign in</a></p>
</div>
</div>

<script>
function showForm(type){
  document.querySelectorAll('.card').forEach(c=>c.classList.add('hidden'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.error-msg').forEach(e=>e.classList.remove('show'));
  document.querySelectorAll('.success-msg').forEach(e=>e.classList.remove('show'));
  document.querySelectorAll('input').forEach(i=>{i.classList.remove('error');i.value=''});
  const map={login:0,signup:1,forgot:2};
  document.querySelectorAll('.tab')[map[type]].classList.add('active');
  document.getElementById(type+'Form').classList.remove('hidden');
}
function validateEmail(e){return/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(e)}
function showError(id){document.getElementById(id).classList.add('show');document.getElementById(id).previousElementSibling.classList.add('error')}
function clearErrors(){document.querySelectorAll('.error-msg').forEach(e=>e.classList.remove('show'));document.querySelectorAll('input').forEach(i=>i.classList.remove('error'))}
function handleLogin(){
  clearErrors();let valid=true;
  if(!validateEmail(document.getElementById('loginEmail').value)){showError('loginEmailError');valid=false}
  if(!document.getElementById('loginPassword').value){showError('loginPasswordError');valid=false}
  if(valid){document.getElementById('loginSuccess').classList.add('show')}
}
function handleSignup(){
  clearErrors();let valid=true;
  if(!validateEmail(document.getElementById('signupEmail').value)){showError('signupEmailError');valid=false}
  const pw=document.getElementById('signupPassword').value;
  if(pw.length<8){showError('signupPasswordError');valid=false}
  if(pw!==document.getElementById('signupConfirm').value){showError('signupConfirmError');valid=false}
  if(valid)showForm('login');
}
function handleForgot(){
  clearErrors();
  if(!validateEmail(document.getElementById('forgotEmail').value)){showError('forgotEmailError');return}
  document.getElementById('forgotSuccess').classList.add('show');
}
function checkStrength(pw){
  const bar=document.getElementById('strengthBar');let score=0;
  if(pw.length>=8)score++;if(/[A-Z]/.test(pw))score++;if(/[0-9]/.test(pw))score++;if(/[^A-Za-z0-9]/.test(pw))score++;
  const colors=['#ef4444','#f59e0b','#22c55e','#6366f1'];const widths=['25%','50%','75%','100%'];
  bar.style.width=widths[score-1]||'0';bar.style.background=colors[score-1]||'transparent';
}
</script>
</body>
</html>`,
};

// ── Additional JavaScript Prebuilt Apps ───────────────────────────

const jsExpressServer: PrebuiltApp = {
  id: 'js-express-server',
  name: 'Express REST Server',
  description: 'Node.js Express server with CRUD routes, middleware & error handling',
  language: 'javascript',
  icon: '🟢',
  code: `/**
 * Express REST Server — Products API
 * ====================================
 * A production-ready Node.js server with Express,
 * CRUD endpoints, middleware, validation & error handling.
 *
 * Run: npm init -y && npm install express && node server.js
 * Test: http://localhost:3000/api/products
 */

import express from 'express';

const app = express();
const PORT = 3000;

// ── Middleware ───────────────────────────────────────────────────
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(\`\${req.method} \${req.path} \${res.statusCode} \${ms}ms\`);
  });
  next();
});

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── In-Memory Store ─────────────────────────────────────────────
let products = [
  { id: 1, name: 'Laptop Pro', price: 1299.99, category: 'Electronics', stock: 45 },
  { id: 2, name: 'Wireless Mouse', price: 29.99, category: 'Accessories', stock: 230 },
  { id: 3, name: 'Mechanical Keyboard', price: 149.99, category: 'Accessories', stock: 87 },
  { id: 4, name: 'Monitor 4K', price: 549.99, category: 'Electronics', stock: 32 },
  { id: 5, name: 'USB-C Hub', price: 59.99, category: 'Accessories', stock: 156 },
];
let nextId = 6;

// ── Validation ──────────────────────────────────────────────────
function validateProduct(data) {
  const errors = [];
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2)
    errors.push('Name is required (min 2 chars)');
  if (data.price == null || typeof data.price !== 'number' || data.price <= 0)
    errors.push('Price must be a positive number');
  if (!data.category || typeof data.category !== 'string')
    errors.push('Category is required');
  if (data.stock != null && (typeof data.stock !== 'number' || data.stock < 0))
    errors.push('Stock must be a non-negative number');
  return errors;
}

// ── Routes ──────────────────────────────────────────────────────

// List all products (with search & filter)
app.get('/api/products', (req, res) => {
  let result = [...products];
  if (req.query.category) {
    result = result.filter(p => p.category.toLowerCase() === req.query.category.toLowerCase());
  }
  if (req.query.search) {
    const q = req.query.search.toLowerCase();
    result = result.filter(p => p.name.toLowerCase().includes(q));
  }
  if (req.query.sort === 'price') result.sort((a, b) => a.price - b.price);
  if (req.query.sort === '-price') result.sort((a, b) => b.price - a.price);
  res.json({ success: true, count: result.length, data: result });
});

// Get single product
app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
  res.json({ success: true, data: product });
});

// Create product
app.post('/api/products', (req, res) => {
  const errors = validateProduct(req.body);
  if (errors.length > 0) return res.status(400).json({ success: false, errors });
  const product = { id: nextId++, name: req.body.name.trim(), price: req.body.price, category: req.body.category.trim(), stock: req.body.stock || 0 };
  products.push(product);
  res.status(201).json({ success: true, data: product });
});

// Update product
app.put('/api/products/:id', (req, res) => {
  const idx = products.findIndex(p => p.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, error: 'Product not found' });
  const errors = validateProduct({ ...products[idx], ...req.body });
  if (errors.length > 0) return res.status(400).json({ success: false, errors });
  products[idx] = { ...products[idx], ...req.body, id: products[idx].id };
  res.json({ success: true, data: products[idx] });
});

// Delete product
app.delete('/api/products/:id', (req, res) => {
  const idx = products.findIndex(p => p.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, error: 'Product not found' });
  const deleted = products.splice(idx, 1)[0];
  res.json({ success: true, data: deleted });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), products: products.length });
});

// ── Error Handler ───────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ── Start ───────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(\`Server running on http://localhost:\${PORT}\`);
  console.log(\`API: http://localhost:\${PORT}/api/products\`);
});
`,
};

// ── Additional React Prebuilt Apps ────────────────────────────────

const reactDashboard: PrebuiltApp = {
  id: 'react-dashboard-app',
  name: 'React Analytics Dashboard',
  description: 'Interactive dashboard with charts, stats cards, filters & dark theme',
  language: 'react',
  icon: '⚛️',
  code: `import React, { useState, useMemo } from 'react';

// ── Types ───────────────────────────────────────────────────────
interface MetricCard {
  title: string;
  value: string;
  change: number;
  icon: string;
}

interface DataPoint {
  month: string;
  revenue: number;
  users: number;
  orders: number;
}

interface Activity {
  id: number;
  action: string;
  user: string;
  time: string;
  type: 'success' | 'warning' | 'info' | 'error';
}

// ── Sample Data ─────────────────────────────────────────────────
const METRICS: MetricCard[] = [
  { title: 'Total Revenue', value: '$48,295', change: 12.5, icon: '💰' },
  { title: 'Active Users', value: '2,847', change: 8.3, icon: '👥' },
  { title: 'Orders', value: '1,234', change: -2.1, icon: '📦' },
  { title: 'Conversion', value: '3.42%', change: 0.8, icon: '📈' },
];

const MONTHLY_DATA: DataPoint[] = [
  { month: 'Jan', revenue: 4200, users: 180, orders: 89 },
  { month: 'Feb', revenue: 3800, users: 210, orders: 76 },
  { month: 'Mar', revenue: 5100, users: 245, orders: 102 },
  { month: 'Apr', revenue: 4800, users: 290, orders: 95 },
  { month: 'May', revenue: 6200, users: 320, orders: 124 },
  { month: 'Jun', revenue: 5900, users: 380, orders: 118 },
  { month: 'Jul', revenue: 7100, users: 410, orders: 142 },
  { month: 'Aug', revenue: 6800, users: 450, orders: 136 },
];

const ACTIVITIES: Activity[] = [
  { id: 1, action: 'New order placed', user: 'Sarah Chen', time: '2 min ago', type: 'success' },
  { id: 2, action: 'Payment failed', user: 'Mike Johnson', time: '15 min ago', type: 'error' },
  { id: 3, action: 'User signed up', user: 'Emily Park', time: '1 hour ago', type: 'info' },
  { id: 4, action: 'Low stock alert', user: 'System', time: '2 hours ago', type: 'warning' },
  { id: 5, action: 'Subscription renewed', user: 'Alex Rivera', time: '3 hours ago', type: 'success' },
];

// ── BarChart Component ──────────────────────────────────────────
const BarChart: React.FC<{ data: DataPoint[]; dataKey: keyof DataPoint; color: string }> = ({ data, dataKey, color }) => {
  const max = Math.max(...data.map(d => d[dataKey] as number));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 180, padding: '0 8px' }}>
      {data.map((d, i) => {
        const val = d[dataKey] as number;
        const h = (val / max) * 160;
        return (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div title={\`\${d.month}: \${val}\`}
              style={{ height: h, background: color, borderRadius: '6px 6px 0 0', opacity: 0.85, transition: 'opacity 0.2s', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.85')}
            />
            <div style={{ fontSize: 10, color: '#888', marginTop: 6 }}>{d.month}</div>
          </div>
        );
      })}
    </div>
  );
};

// ── Main Dashboard ──────────────────────────────────────────────
export default function Dashboard() {
  const [chartMetric, setChartMetric] = useState<'revenue' | 'users' | 'orders'>('revenue');
  const [period, setPeriod] = useState('8mo');

  const chartColor = chartMetric === 'revenue' ? '#6366f1' : chartMetric === 'users' ? '#22c55e' : '#f59e0b';

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: '#0a0a0f', color: '#e8e8ef', minHeight: '100vh', padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>📊 Analytics Dashboard</h1>
          <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>Overview of your business metrics</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['24h', '7d', '30d', '8mo'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: period === p ? '#6366f1' : 'rgba(255,255,255,0.04)',
                color: period === p ? '#fff' : '#888' }}>
              {p}
            </button>
          ))}
        </div>
      </header>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {METRICS.map((m, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: '#888' }}>{m.title}</span>
              <span style={{ fontSize: 20 }}>{m.icon}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{m.value}</div>
            <div style={{ fontSize: 11, marginTop: 8, color: m.change >= 0 ? '#22c55e' : '#ef4444' }}>
              {m.change >= 0 ? '↑' : '↓'} {Math.abs(m.change)}% from last period
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Monthly Overview</h3>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['revenue', 'users', 'orders'] as const).map(k => (
                <button key={k} onClick={() => setChartMetric(k)}
                  style={{ padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
                    background: chartMetric === k ? chartColor + '22' : 'transparent',
                    color: chartMetric === k ? chartColor : '#666' }}>
                  {k}
                </button>
              ))}
            </div>
          </div>
          <BarChart data={MONTHLY_DATA} dataKey={chartMetric} color={chartColor} />
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Recent Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ACTIVITIES.map(a => {
              const colors = { success: '#22c55e', error: '#ef4444', warning: '#f59e0b', info: '#6366f1' };
              return (
                <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[a.type], marginTop: 5, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{a.action}</div>
                    <div style={{ fontSize: 10, color: '#666' }}>{a.user} · {a.time}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
`,
};

const reactFormBuilder: PrebuiltApp = {
  id: 'react-form-builder',
  name: 'React Form Builder',
  description: 'Dynamic form with validation, multi-step flow & submission handling',
  language: 'react',
  icon: '📝',
  code: `import React, { useState } from 'react';

// ── Types ───────────────────────────────────────────────────────
interface FormData {
  name: string;
  email: string;
  company: string;
  role: string;
  experience: string;
  skills: string[];
  bio: string;
  newsletter: boolean;
}

interface FormErrors {
  [key: string]: string;
}

const ROLES = ['Developer', 'Designer', 'Product Manager', 'DevOps', 'Data Scientist', 'Other'];
const SKILLS = ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Go', 'Rust', 'SQL', 'Docker', 'AWS'];
const EXPERIENCE = ['0-1 years', '1-3 years', '3-5 years', '5-10 years', '10+ years'];

// ── Validation ──────────────────────────────────────────────────
function validate(data: FormData, step: number): FormErrors {
  const errors: FormErrors = {};
  if (step === 0) {
    if (!data.name.trim()) errors.name = 'Name is required';
    if (!data.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(data.email)) errors.email = 'Invalid email format';
    if (!data.company.trim()) errors.company = 'Company is required';
  }
  if (step === 1) {
    if (!data.role) errors.role = 'Please select a role';
    if (!data.experience) errors.experience = 'Please select experience level';
    if (data.skills.length === 0) errors.skills = 'Select at least one skill';
  }
  if (step === 2) {
    if (data.bio.trim().length < 20) errors.bio = 'Bio must be at least 20 characters';
  }
  return errors;
}

// ── Component ───────────────────────────────────────────────────
export default function FormBuilder() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState<FormData>({
    name: '', email: '', company: '', role: '', experience: '', skills: [], bio: '', newsletter: true,
  });

  const steps = ['Personal Info', 'Professional', 'About You'];

  const update = (field: keyof FormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
  };

  const toggleSkill = (skill: string) => {
    setForm(prev => ({
      ...prev,
      skills: prev.skills.includes(skill) ? prev.skills.filter(s => s !== skill) : [...prev.skills, skill],
    }));
    setErrors(prev => { const e = { ...prev }; delete e.skills; return e; });
  };

  const nextStep = () => {
    const errs = validate(form, step);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    if (step < 2) setStep(step + 1);
    else setSubmitted(true);
  };

  const s: React.CSSProperties = { fontFamily: "'Segoe UI', system-ui, sans-serif", background: '#0a0a0f', color: '#e8e8ef', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 };
  const card: React.CSSProperties = { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 520 };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#e8e8ef', fontSize: 13, outline: 'none' };
  const errStyle: React.CSSProperties = { fontSize: 11, color: '#ef4444', marginTop: 4 };

  if (submitted) {
    return (
      <div style={s}>
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Application Submitted!</h2>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>Thanks {form.name}, we'll review your application and get back to you at {form.email}.</p>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, textAlign: 'left', fontSize: 12 }}>
            <div style={{ color: '#888', marginBottom: 4 }}>Role: <span style={{ color: '#e8e8ef' }}>{form.role}</span></div>
            <div style={{ color: '#888', marginBottom: 4 }}>Experience: <span style={{ color: '#e8e8ef' }}>{form.experience}</span></div>
            <div style={{ color: '#888' }}>Skills: <span style={{ color: '#6366f1' }}>{form.skills.join(', ')}</span></div>
          </div>
          <button onClick={() => { setSubmitted(false); setStep(0); setForm({ name: '', email: '', company: '', role: '', experience: '', skills: [], bio: '', newsletter: true }); }}
            style={{ marginTop: 24, padding: '10px 24px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={s}>
      <div style={card}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>📝 Application Form</h2>
        <p style={{ fontSize: 12, color: '#888', marginBottom: 24 }}>Step {step + 1} of 3 — {steps[step]}</p>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? '#6366f1' : 'rgba(255,255,255,0.06)', transition: 'background 0.3s' }} />
          ))}
        </div>

        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Full Name *</label>
              <input style={{ ...inputStyle, borderColor: errors.name ? '#ef4444' : undefined }} value={form.name} onChange={e => update('name', e.target.value)} placeholder="John Doe" />
              {errors.name && <div style={errStyle}>{errors.name}</div>}
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Email *</label>
              <input style={{ ...inputStyle, borderColor: errors.email ? '#ef4444' : undefined }} type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="john@company.com" />
              {errors.email && <div style={errStyle}>{errors.email}</div>}
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Company *</label>
              <input style={{ ...inputStyle, borderColor: errors.company ? '#ef4444' : undefined }} value={form.company} onChange={e => update('company', e.target.value)} placeholder="Acme Inc." />
              {errors.company && <div style={errStyle}>{errors.company}</div>}
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Role *</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ROLES.map(r => (
                  <button key={r} onClick={() => update('role', r)}
                    style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid', cursor: 'pointer', fontSize: 12,
                      borderColor: form.role === r ? '#6366f1' : 'rgba(255,255,255,0.1)',
                      background: form.role === r ? 'rgba(99,102,241,0.15)' : 'transparent',
                      color: form.role === r ? '#a5b4fc' : '#888' }}>
                    {r}
                  </button>
                ))}
              </div>
              {errors.role && <div style={errStyle}>{errors.role}</div>}
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Experience *</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.experience} onChange={e => update('experience', e.target.value)}>
                <option value="">Select...</option>
                {EXPERIENCE.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              {errors.experience && <div style={errStyle}>{errors.experience}</div>}
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Skills * (select multiple)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {SKILLS.map(sk => (
                  <button key={sk} onClick={() => toggleSkill(sk)}
                    style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid', cursor: 'pointer', fontSize: 11,
                      borderColor: form.skills.includes(sk) ? '#22c55e' : 'rgba(255,255,255,0.1)',
                      background: form.skills.includes(sk) ? 'rgba(34,197,94,0.15)' : 'transparent',
                      color: form.skills.includes(sk) ? '#86efac' : '#888' }}>
                    {form.skills.includes(sk) ? '✓ ' : ''}{sk}
                  </button>
                ))}
              </div>
              {errors.skills && <div style={errStyle}>{errors.skills}</div>}
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Bio * (min 20 chars)</label>
              <textarea style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }} value={form.bio} onChange={e => update('bio', e.target.value)}
                placeholder="Tell us about yourself, your experience, and what you're passionate about..." />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                {errors.bio ? <div style={errStyle}>{errors.bio}</div> : <div />}
                <span style={{ fontSize: 10, color: form.bio.length >= 20 ? '#22c55e' : '#888' }}>{form.bio.length}/20+</span>
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: '#888' }}>
              <input type="checkbox" checked={form.newsletter} onChange={e => update('newsletter', e.target.checked)} />
              Subscribe to newsletter
            </label>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
          <button onClick={() => step > 0 && setStep(step - 1)} disabled={step === 0}
            style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: step > 0 ? '#ccc' : '#444', cursor: step > 0 ? 'pointer' : 'default', fontSize: 13 }}>
            ← Back
          </button>
          <button onClick={nextStep}
            style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            {step < 2 ? 'Next →' : 'Submit ✓'}
          </button>
        </div>
      </div>
    </div>
  );
}
`,
};

// ── Additional TypeScript Prebuilt Apps ────────────────────────────

const tsTaskManager: PrebuiltApp = {
  id: 'ts-task-manager',
  name: 'TypeScript Task Engine',
  description: 'Type-safe task management system with generics, decorators & event emitter',
  language: 'typescript',
  icon: '⚙️',
  code: `/**
 * TypeScript Task Engine
 * ======================
 * A fully typed task management system demonstrating
 * generics, enums, discriminated unions, event emitting,
 * and advanced TypeScript patterns.
 *
 * Run: npx ts-node task-engine.ts
 */

// ── Enums & Types ───────────────────────────────────────────────

enum Priority {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical',
}

enum TaskStatus {
  Todo = 'todo',
  InProgress = 'in-progress',
  Review = 'review',
  Done = 'done',
  Cancelled = 'cancelled',
}

interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  assignee: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  dueDate: Date | null;
  subtasks: SubTask[];
}

interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

// ── Event System ────────────────────────────────────────────────

type TaskEvent =
  | { type: 'created'; task: Task }
  | { type: 'updated'; task: Task; changes: Partial<Task> }
  | { type: 'deleted'; taskId: string }
  | { type: 'statusChanged'; task: Task; from: TaskStatus; to: TaskStatus };

type EventHandler = (event: TaskEvent) => void;

class EventEmitter {
  private handlers: Map<string, EventHandler[]> = new Map();

  on(eventType: TaskEvent['type'] | '*', handler: EventHandler): () => void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);
    return () => {
      const idx = handlers.indexOf(handler);
      if (idx !== -1) handlers.splice(idx, 1);
    };
  }

  emit(event: TaskEvent): void {
    const handlers = [
      ...(this.handlers.get(event.type) || []),
      ...(this.handlers.get('*') || []),
    ];
    handlers.forEach(h => h(event));
  }
}

// ── Task Manager ────────────────────────────────────────────────

class TaskManager {
  private tasks: Map<string, Task> = new Map();
  private events = new EventEmitter();
  private idCounter = 0;

  private generateId(): string {
    return \`task-\${++this.idCounter}-\${Date.now().toString(36)}\`;
  }

  create(input: Pick<Task, 'title' | 'description' | 'priority'> & Partial<Pick<Task, 'assignee' | 'tags' | 'dueDate'>>): Task {
    const task: Task = {
      id: this.generateId(),
      title: input.title,
      description: input.description,
      priority: input.priority,
      status: TaskStatus.Todo,
      assignee: input.assignee ?? null,
      tags: input.tags ?? [],
      createdAt: new Date(),
      updatedAt: new Date(),
      dueDate: input.dueDate ?? null,
      subtasks: [],
    };
    this.tasks.set(task.id, task);
    this.events.emit({ type: 'created', task });
    return task;
  }

  update(id: string, changes: Partial<Omit<Task, 'id' | 'createdAt'>>): Task {
    const task = this.tasks.get(id);
    if (!task) throw new Error(\`Task \${id} not found\`);

    const oldStatus = task.status;
    Object.assign(task, changes, { updatedAt: new Date() });

    if (changes.status && changes.status !== oldStatus) {
      this.events.emit({ type: 'statusChanged', task, from: oldStatus, to: changes.status });
    }
    this.events.emit({ type: 'updated', task, changes });
    return task;
  }

  delete(id: string): boolean {
    const existed = this.tasks.delete(id);
    if (existed) this.events.emit({ type: 'deleted', taskId: id });
    return existed;
  }

  addSubtask(taskId: string, title: string): SubTask {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(\`Task \${taskId} not found\`);
    const subtask: SubTask = { id: \`sub-\${++this.idCounter}\`, title, completed: false };
    task.subtasks.push(subtask);
    task.updatedAt = new Date();
    return subtask;
  }

  // Query methods
  getAll(): Task[] { return Array.from(this.tasks.values()); }

  getByStatus(status: TaskStatus): Task[] {
    return this.getAll().filter(t => t.status === status);
  }

  getByPriority(priority: Priority): Task[] {
    return this.getAll().filter(t => t.priority === priority);
  }

  search(query: string): Task[] {
    const q = query.toLowerCase();
    return this.getAll().filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some(tag => tag.toLowerCase().includes(q))
    );
  }

  getOverdue(): Task[] {
    const now = new Date();
    return this.getAll().filter(t =>
      t.dueDate && t.dueDate < now && t.status !== TaskStatus.Done && t.status !== TaskStatus.Cancelled
    );
  }

  getStats(): { total: number; byStatus: Record<TaskStatus, number>; byPriority: Record<Priority, number>; completionRate: number } {
    const all = this.getAll();
    const byStatus = {} as Record<TaskStatus, number>;
    const byPriority = {} as Record<Priority, number>;

    Object.values(TaskStatus).forEach(s => byStatus[s] = 0);
    Object.values(Priority).forEach(p => byPriority[p] = 0);

    all.forEach(t => { byStatus[t.status]++; byPriority[t.priority]++; });

    return {
      total: all.length,
      byStatus,
      byPriority,
      completionRate: all.length ? (byStatus[TaskStatus.Done] / all.length) * 100 : 0,
    };
  }

  onEvent(type: TaskEvent['type'] | '*', handler: EventHandler): () => void {
    return this.events.on(type, handler);
  }
}

// ── Demo Usage ──────────────────────────────────────────────────

const manager = new TaskManager();

// Listen for events
manager.onEvent('*', (event) => {
  console.log(\`[Event] \${event.type}:\`, event.type === 'deleted' ? event.taskId : (event as any).task?.title);
});

// Create tasks
const task1 = manager.create({ title: 'Setup CI/CD Pipeline', description: 'Configure GitHub Actions for automated testing and deployment', priority: Priority.High, assignee: 'Alice', tags: ['devops', 'automation'] });
const task2 = manager.create({ title: 'Design System Components', description: 'Build reusable UI component library with Storybook', priority: Priority.Medium, tags: ['frontend', 'design'] });
const task3 = manager.create({ title: 'Database Migration', description: 'Migrate from PostgreSQL 14 to 16 with zero downtime', priority: Priority.Critical, assignee: 'Bob', dueDate: new Date('2025-03-01') });

// Add subtasks
manager.addSubtask(task1.id, 'Setup test runner');
manager.addSubtask(task1.id, 'Configure deployment stages');
manager.addSubtask(task1.id, 'Add Slack notifications');

// Update tasks
manager.update(task1.id, { status: TaskStatus.InProgress });
manager.update(task2.id, { status: TaskStatus.InProgress, assignee: 'Charlie' });

// Get stats
const stats = manager.getStats();
console.log('\\n=== Task Statistics ===');
console.log(\`Total: \${stats.total}\`);
console.log(\`Completion: \${stats.completionRate.toFixed(1)}%\`);
console.log('By Status:', stats.byStatus);
console.log('By Priority:', stats.byPriority);

// Search
console.log('\\n=== Search "pipeline" ===');
manager.search('pipeline').forEach(t => console.log(\`  - [\${t.priority}] \${t.title}\`));

console.log('\\n=== Critical Tasks ===');
manager.getByPriority(Priority.Critical).forEach(t => console.log(\`  - \${t.title} (assigned: \${t.assignee})\`));
`,
};

// ── Additional Python Prebuilt Apps ───────────────────────────────

const pythonWebScraper: PrebuiltApp = {
  id: 'python-web-scraper',
  name: 'Python Web Scraper',
  description: 'Async web scraper with rate limiting, retry logic & CSV export',
  language: 'python',
  icon: '🕷️',
  code: `"""
Async Web Scraper
=================
A production-ready web scraper demonstrating:
- Async HTTP requests with aiohttp
- Rate limiting with semaphore
- Retry logic with exponential backoff
- Data parsing and CSV export
- Error handling and logging

Run: pip install aiohttp beautifulsoup4 && python scraper.py
"""

import asyncio
import csv
import json
import logging
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin, urlparse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


@dataclass
class ScrapedPage:
    """Represents a scraped web page."""
    url: str
    title: str = ""
    status_code: int = 0
    content_length: int = 0
    links: list[str] = field(default_factory=list)
    headings: list[str] = field(default_factory=list)
    meta_description: str = ""
    scraped_at: str = field(default_factory=lambda: datetime.now().isoformat())
    error: Optional[str] = None


class RateLimiter:
    """Token bucket rate limiter."""

    def __init__(self, max_concurrent: int = 5, delay: float = 0.5):
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.delay = delay

    async def acquire(self):
        await self.semaphore.acquire()
        await asyncio.sleep(self.delay)

    def release(self):
        self.semaphore.release()


class WebScraper:
    """Async web scraper with rate limiting and retry."""

    def __init__(
        self,
        max_concurrent: int = 5,
        delay: float = 0.5,
        max_retries: int = 3,
        timeout: int = 30,
    ):
        self.rate_limiter = RateLimiter(max_concurrent, delay)
        self.max_retries = max_retries
        self.timeout = timeout
        self.results: list[ScrapedPage] = []
        self.stats = {"success": 0, "failed": 0, "retried": 0}

    async def _fetch(self, session, url: str) -> tuple[int, str]:
        """Fetch URL with retry logic."""
        for attempt in range(self.max_retries):
            try:
                await self.rate_limiter.acquire()
                try:
                    async with session.get(url, timeout=self.timeout) as resp:
                        text = await resp.text()
                        return resp.status, text
                finally:
                    self.rate_limiter.release()
            except Exception as e:
                if attempt < self.max_retries - 1:
                    wait = 2 ** attempt
                    logger.warning(f"Retry {attempt + 1}/{self.max_retries} for {url} in {wait}s: {e}")
                    self.stats["retried"] += 1
                    await asyncio.sleep(wait)
                else:
                    raise

    def _parse(self, url: str, status: int, html: str) -> ScrapedPage:
        """Parse HTML content (simplified without BeautifulSoup dependency)."""
        page = ScrapedPage(url=url, status_code=status, content_length=len(html))

        # Simple title extraction
        import re
        title_match = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
        page.title = title_match.group(1).strip() if title_match else "No Title"

        # Extract headings
        for match in re.finditer(r"<h[1-3][^>]*>(.*?)</h[1-3]>", html, re.IGNORECASE | re.DOTALL):
            text = re.sub(r"<[^>]+>", "", match.group(1)).strip()
            if text:
                page.headings.append(text)

        # Extract links
        for match in re.finditer(r'href=["\\'](https?://[^"\\'>]+)', html):
            page.links.append(match.group(1))

        # Extract meta description
        meta_match = re.search(r'<meta[^>]*name=["\\']*description["\\']*[^>]*content=["\\']([^"\\'>]*)', html, re.IGNORECASE)
        page.meta_description = meta_match.group(1) if meta_match else ""

        return page

    async def scrape(self, urls: list[str]) -> list[ScrapedPage]:
        """Scrape multiple URLs concurrently."""
        logger.info(f"Starting scrape of {len(urls)} URLs")
        start = time.time()

        try:
            import aiohttp
            async with aiohttp.ClientSession(
                headers={"User-Agent": "Mozilla/5.0 (compatible; PyScraper/1.0)"}
            ) as session:
                tasks = [self._scrape_one(session, url) for url in urls]
                self.results = await asyncio.gather(*tasks)
        except ImportError:
            logger.warning("aiohttp not installed, using mock data for demo")
            self.results = [
                ScrapedPage(url=url, title=f"Page: {urlparse(url).netloc}",
                            status_code=200, content_length=15000,
                            links=[f"https://{urlparse(url).netloc}/page{i}" for i in range(5)],
                            headings=["Welcome", "About", "Features", "Contact"])
                for url in urls
            ]
            self.stats["success"] = len(urls)

        elapsed = time.time() - start
        logger.info(f"Scraping complete in {elapsed:.1f}s — Success: {self.stats['success']}, Failed: {self.stats['failed']}")
        return self.results

    async def _scrape_one(self, session, url: str) -> ScrapedPage:
        """Scrape a single URL."""
        try:
            status, html = await self._fetch(session, url)
            page = self._parse(url, status, html)
            self.stats["success"] += 1
            logger.info(f"✓ {url} ({status}, {page.content_length} bytes, {len(page.links)} links)")
            return page
        except Exception as e:
            self.stats["failed"] += 1
            logger.error(f"✗ {url}: {e}")
            return ScrapedPage(url=url, error=str(e))

    def export_csv(self, filename: str = "scraped_data.csv"):
        """Export results to CSV."""
        if not self.results:
            logger.warning("No results to export")
            return

        fields = ["url", "title", "status_code", "content_length", "meta_description", "scraped_at", "error"]
        with open(filename, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fields)
            writer.writeheader()
            for page in self.results:
                row = asdict(page)
                row.pop("links", None)
                row.pop("headings", None)
                writer.writerow(row)
        logger.info(f"Exported {len(self.results)} results to {filename}")

    def export_json(self, filename: str = "scraped_data.json"):
        """Export results to JSON."""
        with open(filename, "w", encoding="utf-8") as f:
            json.dump([asdict(p) for p in self.results], f, indent=2, default=str)
        logger.info(f"Exported {len(self.results)} results to {filename}")

    def summary(self) -> str:
        """Generate a text summary of scraping results."""
        lines = [
            "=" * 60,
            "SCRAPING SUMMARY",
            "=" * 60,
            f"Total URLs: {len(self.results)}",
            f"Successful: {self.stats['success']}",
            f"Failed: {self.stats['failed']}",
            f"Retries: {self.stats['retried']}",
            "",
        ]

        for page in self.results:
            status = "✓" if not page.error else "✗"
            lines.append(f"  {status} {page.title[:50]:50s} | {page.url}")
            if page.headings:
                lines.append(f"    Headings: {', '.join(page.headings[:5])}")
            if page.links:
                lines.append(f"    Links found: {len(page.links)}")
            if page.error:
                lines.append(f"    Error: {page.error}")

        lines.append("\\n" + "=" * 60)
        return "\\n".join(lines)


# ── Main ─────────────────────────────────────────────────────────

async def main():
    urls = [
        "https://example.com",
        "https://httpbin.org/html",
        "https://jsonplaceholder.typicode.com",
        "https://httpbin.org/status/404",
        "https://httpbin.org/delay/2",
    ]

    scraper = WebScraper(max_concurrent=3, delay=0.3, max_retries=2)
    results = await scraper.scrape(urls)
    print(scraper.summary())

    # Export
    scraper.export_csv("output.csv")
    scraper.export_json("output.json")


if __name__ == "__main__":
    asyncio.run(main())
`,
};

const pythonCLIApp: PrebuiltApp = {
  id: 'python-cli-app',
  name: 'Python CLI Framework',
  description: 'Feature-rich CLI app with commands, arguments, colors & progress bars',
  language: 'python',
  icon: '🖥️',
  code: `"""
CLI Framework — Project Manager
================================
A rich command-line application demonstrating:
- Argument parsing with subcommands
- Colored terminal output
- Progress bars and spinners
- File I/O with JSON persistence
- Interactive prompts

Run: python cli_app.py --help
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path


# ── ANSI Colors ──────────────────────────────────────────────────

class Colors:
    RESET = "\\033[0m"
    BOLD = "\\033[1m"
    DIM = "\\033[2m"
    RED = "\\033[91m"
    GREEN = "\\033[92m"
    YELLOW = "\\033[93m"
    BLUE = "\\033[94m"
    MAGENTA = "\\033[95m"
    CYAN = "\\033[96m"
    WHITE = "\\033[97m"
    BG_RED = "\\033[41m"
    BG_GREEN = "\\033[42m"
    BG_BLUE = "\\033[44m"

    @staticmethod
    def colorize(text: str, color: str) -> str:
        return f"{color}{text}{Colors.RESET}"

    @staticmethod
    def success(text: str) -> str:
        return Colors.colorize(f"✓ {text}", Colors.GREEN)

    @staticmethod
    def error(text: str) -> str:
        return Colors.colorize(f"✗ {text}", Colors.RED)

    @staticmethod
    def warning(text: str) -> str:
        return Colors.colorize(f"⚠ {text}", Colors.YELLOW)

    @staticmethod
    def info(text: str) -> str:
        return Colors.colorize(f"ℹ {text}", Colors.CYAN)


# ── Progress Bar ─────────────────────────────────────────────────

def progress_bar(current: int, total: int, width: int = 40, label: str = ""):
    pct = current / total
    filled = int(width * pct)
    bar = "█" * filled + "░" * (width - filled)
    sys.stdout.write(f"\\r  {label} [{bar}] {pct:.0%} ({current}/{total})")
    sys.stdout.flush()
    if current == total:
        print()


def spinner(message: str, duration: float = 2.0):
    frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
    end = time.time() + duration
    i = 0
    while time.time() < end:
        sys.stdout.write(f"\\r  {Colors.CYAN}{frames[i % len(frames)]}{Colors.RESET} {message}")
        sys.stdout.flush()
        time.sleep(0.08)
        i += 1
    sys.stdout.write(f"\\r  {Colors.GREEN}✓{Colors.RESET} {message}\\n")


# ── Data Store ───────────────────────────────────────────────────

DATA_FILE = Path.home() / ".pm_projects.json"


def load_projects() -> list[dict]:
    if DATA_FILE.exists():
        return json.loads(DATA_FILE.read_text())
    return []


def save_projects(projects: list[dict]):
    DATA_FILE.write_text(json.dumps(projects, indent=2, default=str))


# ── Commands ─────────────────────────────────────────────────────

def cmd_init(args):
    """Initialize a new project."""
    name = args.name
    projects = load_projects()

    if any(p["name"] == name for p in projects):
        print(Colors.error(f"Project '{name}' already exists"))
        return

    spinner(f"Initializing project '{name}'...")

    project = {
        "name": name,
        "description": args.description or "",
        "created_at": datetime.now().isoformat(),
        "status": "active",
        "tasks": [],
        "tags": args.tags.split(",") if args.tags else [],
    }
    projects.append(project)
    save_projects(projects)

    print(Colors.success(f"Project '{name}' created successfully"))
    if project["tags"]:
        print(f"  Tags: {', '.join(project['tags'])}")


def cmd_list(args):
    """List all projects."""
    projects = load_projects()

    if not projects:
        print(Colors.warning("No projects found. Use 'init' to create one."))
        return

    status_filter = args.status
    if status_filter:
        projects = [p for p in projects if p["status"] == status_filter]

    print(f"\\n  {Colors.BOLD}{'Name':<20} {'Status':<12} {'Tasks':<8} {'Created':<12}{Colors.RESET}")
    print(f"  {'─' * 52}")

    status_colors = {"active": Colors.GREEN, "paused": Colors.YELLOW, "completed": Colors.BLUE, "archived": Colors.DIM}

    for p in projects:
        color = status_colors.get(p["status"], Colors.WHITE)
        status = Colors.colorize(p["status"].upper(), color)
        created = p["created_at"][:10]
        task_count = len(p.get("tasks", []))
        done = sum(1 for t in p.get("tasks", []) if t.get("done"))
        print(f"  {p['name']:<20} {status:<22} {done}/{task_count:<5} {created}")

    print(f"\\n  Total: {len(projects)} project(s)\\n")


def cmd_add_task(args):
    """Add a task to a project."""
    projects = load_projects()
    project = next((p for p in projects if p["name"] == args.project), None)

    if not project:
        print(Colors.error(f"Project '{args.project}' not found"))
        return

    task = {
        "title": args.title,
        "priority": args.priority or "medium",
        "done": False,
        "created_at": datetime.now().isoformat(),
    }
    project["tasks"].append(task)
    save_projects(projects)

    priority_icons = {"low": "🟢", "medium": "🟡", "high": "🔴", "critical": "💀"}
    icon = priority_icons.get(task["priority"], "⚪")
    print(Colors.success(f"Added task: {icon} {task['title']}"))


def cmd_tasks(args):
    """Show tasks for a project."""
    projects = load_projects()
    project = next((p for p in projects if p["name"] == args.project), None)

    if not project:
        print(Colors.error(f"Project '{args.project}' not found"))
        return

    tasks = project.get("tasks", [])
    if not tasks:
        print(Colors.warning(f"No tasks in '{args.project}'"))
        return

    priority_icons = {"low": "🟢", "medium": "🟡", "high": "🔴", "critical": "💀"}

    print(f"\\n  {Colors.BOLD}Tasks for '{project['name']}'{Colors.RESET}\\n")
    for i, t in enumerate(tasks, 1):
        icon = priority_icons.get(t["priority"], "⚪")
        check = Colors.colorize("✓", Colors.GREEN) if t["done"] else Colors.colorize("○", Colors.DIM)
        title = Colors.colorize(t["title"], Colors.DIM if t["done"] else Colors.WHITE)
        print(f"  {check} {icon} {i}. {title}")

    done = sum(1 for t in tasks if t["done"])
    print(f"\\n  Progress: {done}/{len(tasks)} completed")
    progress_bar(done, len(tasks), label="")


def cmd_complete(args):
    """Mark a task as complete."""
    projects = load_projects()
    project = next((p for p in projects if p["name"] == args.project), None)

    if not project:
        print(Colors.error(f"Project '{args.project}' not found"))
        return

    tasks = project.get("tasks", [])
    idx = args.task_number - 1
    if idx < 0 or idx >= len(tasks):
        print(Colors.error(f"Task #{args.task_number} not found"))
        return

    tasks[idx]["done"] = True
    save_projects(projects)
    print(Colors.success(f"Completed: {tasks[idx]['title']}"))


def cmd_stats(args):
    """Show global statistics."""
    projects = load_projects()

    total_projects = len(projects)
    total_tasks = sum(len(p.get("tasks", [])) for p in projects)
    done_tasks = sum(sum(1 for t in p.get("tasks", []) if t.get("done")) for p in projects)

    print(f"\\n  {Colors.BOLD}📊 Global Statistics{Colors.RESET}")
    print(f"  {'─' * 30}")
    print(f"  Projects:        {total_projects}")
    print(f"  Total Tasks:     {total_tasks}")
    print(f"  Completed:       {done_tasks}")
    print(f"  Pending:         {total_tasks - done_tasks}")
    if total_tasks:
        print(f"  Completion Rate: {done_tasks/total_tasks:.0%}")
        progress_bar(done_tasks, total_tasks, label="Overall")
    print()


# ── CLI Setup ────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        prog="pm",
        description=f"{Colors.BOLD}🚀 Project Manager CLI{Colors.RESET}",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest="command", help="Available commands")

    # init
    p_init = sub.add_parser("init", help="Create a new project")
    p_init.add_argument("name", help="Project name")
    p_init.add_argument("-d", "--description", help="Project description")
    p_init.add_argument("-t", "--tags", help="Comma-separated tags")

    # list
    p_list = sub.add_parser("list", help="List projects")
    p_list.add_argument("-s", "--status", choices=["active", "paused", "completed", "archived"])

    # add
    p_add = sub.add_parser("add", help="Add a task")
    p_add.add_argument("project", help="Project name")
    p_add.add_argument("title", help="Task title")
    p_add.add_argument("-p", "--priority", choices=["low", "medium", "high", "critical"])

    # tasks
    p_tasks = sub.add_parser("tasks", help="Show project tasks")
    p_tasks.add_argument("project", help="Project name")

    # complete
    p_complete = sub.add_parser("complete", help="Complete a task")
    p_complete.add_argument("project", help="Project name")
    p_complete.add_argument("task_number", type=int, help="Task number")

    # stats
    sub.add_parser("stats", help="Show statistics")

    args = parser.parse_args()

    commands = {
        "init": cmd_init,
        "list": cmd_list,
        "add": cmd_add_task,
        "tasks": cmd_tasks,
        "complete": cmd_complete,
        "stats": cmd_stats,
    }

    if args.command in commands:
        commands[args.command](args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
`,
};

// ── Additional Next.js Prebuilt App ───────────────────────────────

const nextjsBlog: PrebuiltApp = {
  id: 'nextjs-blog-app',
  name: 'Next.js Blog',
  description: 'Full blog with SSR, dynamic routes, MDX support & dark theme',
  language: 'nextjs',
  icon: '📰',
  code: `/**
 * Next.js Blog Application
 * ========================
 * A complete blog system with:
 * - Server-side rendering
 * - Dynamic routes with [slug]
 * - Markdown/MDX content
 * - Dark theme with CSS variables
 * - Search and filtering
 * - Responsive layout
 *
 * Structure:
 * app/
 *   layout.tsx        — Root layout with dark theme
 *   page.tsx          — Blog listing page
 *   blog/[slug]/page.tsx — Individual post
 *   api/posts/route.ts   — API endpoint
 */

// ── app/layout.tsx ──────────────────────────────────────────────

// import type { Metadata } from 'next';
// import './globals.css';

export const metadata = {
  title: 'DevBlog — Engineering Insights',
  description: 'Technical articles on web development, AI, and software engineering',
};

function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: '#0a0a0f', color: '#e8e8ef', margin: 0 }}>
        {children}
      </body>
    </html>
  );
}

// ── Blog Post Data ──────────────────────────────────────────────

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  readTime: string;
  tags: string[];
  featured: boolean;
}

const POSTS: BlogPost[] = [
  {
    slug: 'building-ai-agents',
    title: 'Building AI Agents with TypeScript',
    excerpt: 'A deep dive into creating autonomous AI agents using TypeScript, LangChain, and function calling.',
    content: \`
# Building AI Agents with TypeScript

AI agents are autonomous systems that can plan, execute, and adapt to accomplish goals.
In this guide, we'll build a production-ready AI agent framework.

## Architecture

The agent follows a simple loop:
1. **Observe** — Gather context from the environment
2. **Think** — Use an LLM to decide the next action
3. **Act** — Execute tools and functions
4. **Reflect** — Evaluate results and adjust

## Implementation

\\\`\\\`\\\`typescript
interface Agent {
  name: string;
  tools: Tool[];
  memory: Memory;
  plan(goal: string): Promise<Step[]>;
  execute(step: Step): Promise<Result>;
}
\\\`\\\`\\\`

The key insight is making tools composable and letting the LLM chain them together dynamically.

## Best Practices

- Keep tool descriptions clear and specific
- Implement retry logic with exponential backoff
- Use structured outputs for reliable parsing
- Add guardrails to prevent infinite loops
    \`.trim(),
    author: 'Sarah Chen',
    date: '2026-03-05',
    readTime: '8 min',
    tags: ['AI', 'TypeScript', 'Agents'],
    featured: true,
  },
  {
    slug: 'nextjs-performance',
    title: 'Next.js Performance Optimization Guide',
    excerpt: 'Practical tips for making your Next.js app blazing fast with RSC, streaming, and edge computing.',
    content: \`
# Next.js Performance Optimization

Performance is a feature. Here's how to make your Next.js app fast.

## Server Components

React Server Components (RSC) reduce client bundle size by rendering on the server.
Only interactive parts need client JavaScript.

## Streaming SSR

Stream HTML as it's generated instead of waiting for the full page:

\\\`\\\`\\\`tsx
import { Suspense } from 'react';

export default function Page() {
  return (
    <main>
      <h1>Dashboard</h1>
      <Suspense fallback={<Skeleton />}>
        <SlowDataComponent />
      </Suspense>
    </main>
  );
}
\\\`\\\`\\\`

## Edge Runtime

Deploy API routes to the edge for <50ms latency worldwide.

## Image Optimization

Always use next/image with proper width/height to avoid layout shift.
    \`.trim(),
    author: 'Alex Rivera',
    date: '2026-02-28',
    readTime: '6 min',
    tags: ['Next.js', 'Performance', 'React'],
    featured: false,
  },
  {
    slug: 'rust-for-web-devs',
    title: 'Rust for Web Developers',
    excerpt: 'Why JavaScript developers should learn Rust and how it improves your thinking about code.',
    content: \`
# Rust for Web Developers

Rust is reshaping web tooling — from bundlers (SWC, Turbopack) to runtimes.

## Why Rust?

- **Memory safety** without garbage collection
- **Fearless concurrency** — no data races
- **Zero-cost abstractions** — fast as C, safe as Haskell
- **WASM support** — run in browsers at near-native speed

## Key Concepts

### Ownership
Every value has exactly one owner. When the owner goes out of scope, the value is dropped.

### Borrowing
References let you use values without taking ownership. The borrow checker ensures safety.

### Pattern Matching
Exhaustive match expressions replace complex if-else chains.

## Web Tools Built in Rust

- **SWC** — 20x faster than Babel
- **Turbopack** — Next.js bundler
- **Deno** — Runtime built on V8 + Rust
    \`.trim(),
    author: 'Jordan Kim',
    date: '2026-02-15',
    readTime: '10 min',
    tags: ['Rust', 'WebAssembly', 'Tooling'],
    featured: true,
  },
];

// ── Blog List Page (app/page.tsx) ───────────────────────────────

// 'use client';
import React, { useState } from 'react';

function BlogPost({ post, onClick }: { post: BlogPost; onClick: () => void }) {
  return (
    <article onClick={onClick} style={{
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 16, padding: 24, cursor: 'pointer', transition: 'all 0.2s',
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'none'; }}>
      {post.featured && (
        <span style={{ display: 'inline-block', padding: '2px 10px', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', borderRadius: 12, fontSize: 10, fontWeight: 600, marginBottom: 12 }}>
          ⭐ Featured
        </span>
      )}
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>{post.title}</h2>
      <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6, marginBottom: 16 }}>{post.excerpt}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {post.tags.map(t => (
            <span key={t} style={{ padding: '3px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 6, fontSize: 11, color: '#666' }}>
              {t}
            </span>
          ))}
        </div>
        <span style={{ fontSize: 11, color: '#555' }}>{post.readTime} · {post.date}</span>
      </div>
    </article>
  );
}

export default function BlogApp() {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const allTags = Array.from(new Set(POSTS.flatMap(p => p.tags)));

  const filtered = POSTS.filter(p => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.excerpt.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedTag && !p.tags.includes(selectedTag)) return false;
    return true;
  });

  if (selectedPost) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
        <button onClick={() => setSelectedPost(null)}
          style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 13, marginBottom: 24, padding: 0 }}>
          ← Back to posts
        </button>
        <article>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {selectedPost.tags.map(t => (
              <span key={t} style={{ padding: '3px 10px', background: 'rgba(99,102,241,0.15)', borderRadius: 6, fontSize: 11, color: '#a5b4fc' }}>{t}</span>
            ))}
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.2, marginBottom: 16 }}>{selectedPost.title}</h1>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 32 }}>
            By {selectedPost.author} · {selectedPost.date} · {selectedPost.readTime} read
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.8, color: '#ccc', whiteSpace: 'pre-wrap' }}>
            {selectedPost.content}
          </div>
        </article>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
      <header style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>📰 DevBlog</h1>
        <p style={{ fontSize: 14, color: '#888' }}>Technical articles on web development, AI, and engineering</p>
      </header>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search posts..."
          style={{ flex: 1, minWidth: 200, padding: '8px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#e8e8ef', fontSize: 13, outline: 'none' }} />
        {allTags.map(t => (
          <button key={t} onClick={() => setSelectedTag(selectedTag === t ? null : t)}
            style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              borderColor: selectedTag === t ? '#6366f1' : 'rgba(255,255,255,0.1)',
              background: selectedTag === t ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: selectedTag === t ? '#a5b4fc' : '#888' }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filtered.map(post => <BlogPost key={post.slug} post={post} onClick={() => setSelectedPost(post)} />)}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#555' }}>No posts found</div>
        )}
      </div>
    </div>
  );
}
`,
};

// ── Export all prebuilt apps ─────────────────────────────────────

export const PREBUILT_APPS: PrebuiltApp[] = [
  // HTML
  htmlPortfolio,
  htmlDashboard,
  htmlEcommerce,
  // JavaScript
  jsTodoApp,
  jsWeatherApp,
  jsGameApp,
  jsExpressServer,
  // React
  reactChatApp,
  reactMusicPlayer,
  reactDashboard,
  reactFormBuilder,
  // Python
  pythonFlaskApi,
  pythonDataViz,
  pythonWebScraper,
  pythonCLIApp,
  // TypeScript
  tsUtilityLib,
  tsTaskManager,
  // Next.js
  nextjsSaaS,
  nextjsBlog,
  // Auth
  htmlAuthPages,
];
