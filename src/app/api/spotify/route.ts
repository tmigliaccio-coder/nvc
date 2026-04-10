import { NextRequest, NextResponse } from "next/server";
import { searchArtist, getMultipleArtists } from "@/lib/spotify";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  const batch = req.nextUrl.searchParams.get("batch");

  if (batch) {
    const names = batch.split(",").map((n) => n.trim()).filter(Boolean);
    const results = await getMultipleArtists(names);
    return NextResponse.json({ artists: results });
  }

  if (!query) {
    return NextResponse.json({ error: "Missing q or batch parameter" }, { status: 400 });
  }

  const data = await searchArtist(query);
  if (!data) {
    return NextResponse.json({ error: "Not found or API unavailable" }, { status: 404 });
  }

  return NextResponse.json(data);
}
