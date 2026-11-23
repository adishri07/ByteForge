// Full-page "Ask BrandProof" assistant.
// Owner: Member 4
import ChatPanel from "../../components/ChatPanel";

export default function AssistantPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Ask BrandProof</h1>
      <p className="mt-1 text-slate-600">
        Ask anything about your brand&apos;s rules while you write. Every answer cites the rule or approved fact it&apos;s based on — and if your
        rulebook doesn&apos;t cover something, it says so instead of guessing.
      </p>
      <div className="mt-6">
        <ChatPanel />
      </div>
    </div>
  );
}
