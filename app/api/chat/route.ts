// POST /api/chat { message, history } — Ask BrandProof.
// Answers only from the current brand's approved rulebook, with validated citations.
// Owner: Member 1
import { NextResponse } from "next/server";
import { getBrand } from "../../../lib/brand";
import { answerQuestion, type ChatTurn } from "../../../lib/chat";
import { getDb } from "../../../lib/db";
import { getWorkspaceId } from "../../../lib/workspace";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const message = String(body?.message ?? "").trim();
    if (message.length < 2) return NextResponse.json({ error: "Please type a question." }, { status: 400 });
    if (message.length > 1000) return NextResponse.json({ error: "Please keep your question under 1,000 characters." }, { status: 400 });

    const history: ChatTurn[] = Array.isArray(body?.history)
      ? body.history
          .filter((t: ChatTurn) => (t?.role === "user" || t?.role === "assistant") && typeof t?.content === "string")
          .slice(-6)
      : [];

    const workspaceId = await getWorkspaceId();
    const brand = await getBrand(workspaceId);
    if (brand.rules.length === 0) {
      return NextResponse.json({
        answer: "This brand has no approved rules yet, so I can't answer from a rulebook. Ask a Brand Manager to upload and approve a guideline first.",
        covered: false,
        citations: [],
        rewrite: null,
      });
    }

    let answer;
    try {
      answer = await answerQuestion(message, history, brand);
    } catch (err) {
      console.error("Chat AI failed:", err);
      return NextResponse.json({ error: "The assistant is unavailable right now. Please try again in a minute." }, { status: 503 });
    }

    // keep a record (not critical if it fails)
    await getDb()
      .from("chat_messages")
      .insert([
        { workspace_id: workspaceId, role: "user", content: message },
        { workspace_id: workspaceId, role: "assistant", content: answer.answer, citations: answer.citations },
      ])
      .then(({ error }) => error && console.error("chat log failed:", error));

    return NextResponse.json(answer);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
