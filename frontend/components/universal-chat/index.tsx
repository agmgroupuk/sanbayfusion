
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import AgentPage from './AgentPage';
import App from './App';
import { AGENTS, getAgentFromHostname } from './agentRegistry';

// ── Subdomain detection ───────────────────────────────────────────────────────
// If visited via a standalone agent subdomain (e.g. ben-sega-chat.maula.ai),
// render that agent directly — no URL routing needed.
// If on the main chat host (or localhost dev), use the normal /agents/:agentId routes.
const standaloneSlug = getAgentFromHostname(window.location.hostname);

// Redirect component — sends non-agent routes to maula.ai/agents
const RedirectToAgents: React.FC = () => {
  window.location.href = 'https://maula.ai/agents';
  return null;
};

// Redirect /subscribe to the main maula.ai subscribe page
const RedirectToSubscribe: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  window.location.href = `https://maula.ai/subscribe?${params.toString()}`;
  return null;
};

// Redirect /subscription-success to the main maula.ai page
const RedirectToSuccess: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  window.location.href = `https://maula.ai/subscription-success?${params.toString()}`;
  return null;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// ── Standalone agent subdomain: render agent directly ────────────────────────
if (standaloneSlug) {
  const agent = AGENTS[standaloneSlug];
  root.render(
    <div className="universal-agent-chat" style={{ height: '100vh' }}>
      <App
        initialAgentId={standaloneSlug}
        initialAgentName={agent.name}
        agentIcon={agent.icon}
        agentSpecialty={agent.specialty}
        agentColor={agent.color}
        agentCategory={agent.category}
      />
    </div>
  );
} else {
  // ── Normal main-host routing ─────────────────────────────────────────
  root.render(
    <BrowserRouter>
      <Routes>
        <Route path="/agents/:agentId" element={<AgentPage />} />
        <Route path="/subscribe" element={<RedirectToSubscribe />} />
        <Route path="/subscription-success" element={<RedirectToSuccess />} />
        <Route path="/*" element={<RedirectToAgents />} />
      </Routes>
    </BrowserRouter>
  );
}
