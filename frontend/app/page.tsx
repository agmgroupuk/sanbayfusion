'use client';

/* ═══════════════════════════════════════════════════════
   ROOT PAGE — Maula AI Chat Interface
   
  Embeds the Universal Chat (maula.ai/chat) at the root
   Home page moved to /home
   ═══════════════════════════════════════════════════════ */

export default function ChatPage() {
  return (
    <div className="fixed inset-0 w-full h-full bg-[#030304]">
      <iframe
        src="https://demo.maula.ai"
        className="w-full h-full border-0"
        title="Maula AI Demo Chat"
        allow="microphone; clipboard-write; clipboard-read"
        style={{ background: '#030304' }}
      />
    </div>
  );
}
