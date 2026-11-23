// Brand colours and logo for the current brand.
// GET  /api/assets                       -> { colors, logo: { id, url } | null }
// POST /api/assets  JSON { type: "color", label, value }   -> add a colour
// POST /api/assets  form-data logo=<image>                 -> upload / replace the logo
// DELETE /api/assets?id=...                                 -> remove a colour or logo
// Owner: Member 2
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "../../../lib/db";
import { normaliseHex } from "../../../lib/extractRules";
import { getRole } from "../../../lib/role";
import { signedUrl, uploadFile } from "../../../lib/storage";
import { getWorkspaceId } from "../../../lib/workspace";

const IMAGE_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export async function GET() {
  try {
    const ws = await getWorkspaceId();
    const { data, error } = await getDb().from("brand_assets").select("id,type,label,value").eq("workspace_id", ws).eq("status", "active").order("created_at");
    if (error) throw error;
    const logo = (data ?? []).find((a) => a.type === "logo");
    return NextResponse.json({
      colors: (data ?? []).filter((a) => a.type === "color"),
      logo: logo ? { id: logo.id, url: await signedUrl(logo.value) } : null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not load brand assets." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if ((await getRole()) !== "manager") return NextResponse.json({ error: "Only a Brand Manager can change brand assets." }, { status: 403 });
    const ws = await getWorkspaceId();
    const db = getDb();

    if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      const form = await req.formData().catch(() => null);
      const file = form?.get("logo");
      if (!(file instanceof File)) return NextResponse.json({ error: "Please choose a logo image." }, { status: 400 });
      const ext = IMAGE_TYPES[file.type];
      if (!ext) return NextResponse.json({ error: "The logo must be a PNG, JPG or WebP image." }, { status: 400 });
      if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: "The logo must be smaller than 2 MB." }, { status: 400 });

      const path = `${ws}/logo/${randomUUID()}.${ext}`;
      await uploadFile(path, Buffer.from(await file.arrayBuffer()), file.type);
      await db.from("brand_assets").update({ status: "archived" }).eq("workspace_id", ws).eq("type", "logo").eq("status", "active");
      const { data, error } = await db.from("brand_assets").insert({ workspace_id: ws, type: "logo", label: "Approved logo", value: path }).select().single();
      if (error) throw error;
      return NextResponse.json({ id: data.id, url: await signedUrl(path) });
    }

    const body = await req.json().catch(() => null);
    const hex = normaliseHex(body?.value);
    if (body?.type !== "color" || !hex) return NextResponse.json({ error: "Please enter a colour as a hex code, e.g. #1F6FEB." }, { status: 400 });
    const label = String(body?.label ?? "").trim().slice(0, 40) || hex;

    const { data: dup } = await db.from("brand_assets").select("id").eq("workspace_id", ws).eq("type", "color").eq("status", "active").eq("value", hex).maybeSingle();
    if (dup) return NextResponse.json({ error: "That colour is already in the palette." }, { status: 409 });

    const { data, error } = await db.from("brand_assets").insert({ workspace_id: ws, type: "color", label, value: hex }).select().single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not save the brand asset." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if ((await getRole()) !== "manager") return NextResponse.json({ error: "Only a Brand Manager can change brand assets." }, { status: 403 });
    const ws = await getWorkspaceId();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    const { error } = await getDb().from("brand_assets").update({ status: "archived" }).eq("id", id).eq("workspace_id", ws);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not remove it." }, { status: 500 });
  }
}
