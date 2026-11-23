// GET /api/brand — the current brand's approved rules, words, facts and colours
// (for the Brand rules page and for showing rule text on issue cards).
// Owner: Member 2
import { NextResponse } from "next/server";
import { getBrand } from "../../../lib/brand";
import { getWorkspaceId } from "../../../lib/workspace";

export async function GET() {
  try {
    return NextResponse.json(await getBrand(await getWorkspaceId()));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not load brand rules." }, { status: 500 });
  }
}
