// POST /api/guidelines (form-data: file, brandName) — upload a brand guideline.
//   Creates a new brand (workspace), reads the file, lets the AI extract rules / words / facts / colours,
//   saves them as PENDING (nothing is enforced yet), and checks the rules for contradictions.
// GET /api/guidelines — list past uploads.
// Owner: Member 2
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "../../../lib/db";
import { extractRules } from "../../../lib/extractRules";
import { findConflicts } from "../../../lib/conflicts";
import { MAX_GUIDELINE_BYTES, parseDocument, UserFacingError } from "../../../lib/parseDocument";
import { getRole } from "../../../lib/role";
import { safeName, uploadFile } from "../../../lib/storage";

export const maxDuration = 120;

export async function GET() {
  const { data, error } = await getDb()
    .from("guideline_uploads")
    .select("id,workspace_id,filename,status,error,created_at,workspaces(name)")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not load uploads." }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  if ((await getRole()) !== "manager") {
    return NextResponse.json({ error: "Only a Brand Manager can upload guidelines. Switch to Manager at the top." }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const brandName = String(form?.get("brandName") ?? "").trim().slice(0, 60);
  if (!(file instanceof File)) return NextResponse.json({ error: "Please choose a guideline file to upload." }, { status: 400 });
  if (brandName.length < 2) return NextResponse.json({ error: "Please enter the brand's name." }, { status: 400 });
  if (file.size > MAX_GUIDELINE_BYTES) return NextResponse.json({ error: "The file is larger than 4 MB. Please upload a smaller file." }, { status: 400 });

  const db = getDb();
  const bytes = Buffer.from(await file.arrayBuffer());

  // 1. new brand + upload record
  const { data: ws, error: wsErr } = await db.from("workspaces").insert({ name: brandName }).select().single();
  if (wsErr) {
    console.error(wsErr);
    return NextResponse.json({ error: "Could not create the brand. Please try again." }, { status: 500 });
  }
  const { data: upload, error: upErr } = await db
    .from("guideline_uploads")
    .insert({ workspace_id: ws.id, filename: file.name.slice(0, 120), status: "processing" })
    .select()
    .single();
  if (upErr) {
    console.error(upErr);
    return NextResponse.json({ error: "Could not start the upload. Please try again." }, { status: 500 });
  }

  const fail = async (message: string, status = 400) => {
    await db.from("guideline_uploads").update({ status: "failed", error: message }).eq("id", upload.id);
    return NextResponse.json({ error: message, uploadId: upload.id }, { status });
  };

  try {
    // keep the original file (not critical if storage fails)
    try {
      const path = `${ws.id}/guidelines/${randomUUID()}-${safeName(file.name)}`;
      await uploadFile(path, bytes, file.type || "application/octet-stream");
      await db.from("guideline_uploads").update({ file_path: path }).eq("id", upload.id);
    } catch (err) {
      console.error("guideline file storage failed:", err);
    }

    // 2. read the file
    const text = await parseDocument(bytes, file.name);

    // 3. AI extraction (pending until approved)
    let ruleset;
    try {
      ruleset = await extractRules(text, brandName);
    } catch (err) {
      console.error("extraction failed:", err);
      return fail("The AI couldn't read the rules from this file right now. Please try again in a minute.", 503);
    }
    if (ruleset.rules.length === 0) {
      return fail("We couldn't find any clear brand rules in this file. Please check it's a brand or style guideline.");
    }

    const base = { workspace_id: ws.id, upload_id: upload.id, status: "pending" };
    const writes = await Promise.all([
      db.from("rules").insert(ruleset.rules.map((r) => ({ ...base, ...r }))),
      ruleset.terms.length ? db.from("terms").insert(ruleset.terms.map((t) => ({ ...base, ...t }))) : Promise.resolve({ error: null }),
      ruleset.facts.length ? db.from("facts").insert(ruleset.facts.map((f) => ({ ...base, ...f }))) : Promise.resolve({ error: null }),
      ruleset.colors.length
        ? db.from("brand_assets").insert(ruleset.colors.map((c) => ({ ...base, type: "color", label: c.label, value: c.hex })))
        : Promise.resolve({ error: null }),
    ]);
    const writeErr = writes.find((w) => w.error)?.error;
    if (writeErr) throw writeErr;

    // 4. contradictions between rules
    let conflicts: Awaited<ReturnType<typeof findConflicts>> = [];
    try {
      conflicts = await findConflicts(ruleset.rules);
    } catch (err) {
      console.error("conflict check failed:", err);
    }
    if (conflicts.length) {
      await db.from("rule_conflicts").insert(conflicts.map((c) => ({ workspace_id: ws.id, upload_id: upload.id, ...c })));
    }

    await db.from("guideline_uploads").update({ status: "review", extracted_chars: text.length }).eq("id", upload.id);

    return NextResponse.json({
      uploadId: upload.id,
      workspaceId: ws.id,
      counts: { rules: ruleset.rules.length, terms: ruleset.terms.length, facts: ruleset.facts.length, colors: ruleset.colors.length, conflicts: conflicts.length },
    });
  } catch (err) {
    if (err instanceof UserFacingError) return fail(err.message);
    console.error(err);
    return fail("Something went wrong while processing the guideline. Please try again.", 500);
  }
}
