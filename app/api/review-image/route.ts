// POST /api/review-image (form-data: image, title, channel, alt_text) — check a poster/banner/social image.
// Text in the image goes through the normal rule + claim + AI checks; colours, contrast, logo and
// alt text are checked too. Same response shape as /api/review.
// Owner: Member 2
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getBrand } from "../../../lib/brand";
import { runImageReview } from "../../../lib/orchestrator";
import { saveCheckedDraft } from "../../../lib/saveDraft";
import { uploadFile } from "../../../lib/storage";
import { getWorkspaceId } from "../../../lib/workspace";

export const maxDuration = 90;

const IMAGE_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const form = await req.formData().catch(() => null);
    const image = form?.get("image");
    if (!(image instanceof File)) return NextResponse.json({ error: "Please choose an image to check." }, { status: 400 });
    const ext = IMAGE_TYPES[image.type];
    if (!ext) return NextResponse.json({ error: "Please upload a PNG, JPG or WebP image." }, { status: 400 });
    if (image.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "The image is larger than 4 MB. Please use a smaller image." }, { status: 400 });
    if (image.size < 100) return NextResponse.json({ error: "This image looks empty or damaged." }, { status: 400 });

    const title = String(form?.get("title") ?? "").slice(0, 120);
    const channel = String(form?.get("channel") ?? "General").slice(0, 40);
    const altText = String(form?.get("alt_text") ?? "").trim().slice(0, 500);

    const workspaceId = await getWorkspaceId();
    const brand = await getBrand(workspaceId);
    if (brand.rules.length === 0) {
      return NextResponse.json(
        { error: "This brand has no approved rules yet. A Brand Manager needs to upload and approve a guideline first." },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await image.arrayBuffer());

    let imagePath: string | null = null;
    try {
      imagePath = await uploadFile(`${workspaceId}/images/${randomUUID()}.${ext}`, bytes, image.type);
    } catch (err) {
      console.error("image storage failed:", err);
    }

    let result;
    try {
      result = await runImageReview(bytes, image.type, channel, altText, brand);
    } catch (err) {
      console.error("image review failed:", err);
      return NextResponse.json({ error: "We couldn't read this image. Please try a different PNG or JPG." }, { status: 400 });
    }

    const draft = await saveCheckedDraft({
      workspaceId,
      title: title || image.name.replace(/\.[^.]+$/, ""),
      channel,
      content: result.textInImage || "(No text found in this image)",
      findings: result.findings,
      riskLevel: result.riskLevel,
      riskReasons: result.riskReasons,
      aiNote: result.aiNote,
      kind: "image",
      imagePath,
      altText: altText || null,
    });

    return NextResponse.json({ draftId: draft.id, ...result });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong while checking the image. Please try again." }, { status: 500 });
  }
}
