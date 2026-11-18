// GET /api/brand — all rules, terms and approved facts (for the Brand Rules page
// and for showing rule text on finding cards).
// Owner: Member 2
import { NextResponse } from "next/server";
import { getBrand } from "../../../lib/brand";

export async function GET() {
  try {
    return NextResponse.json(await getBrand());
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not load brand rules." }, { status: 500 });
  }
}
