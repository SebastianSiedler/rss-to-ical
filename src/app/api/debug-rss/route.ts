import { NextRequest, NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rssUrl = searchParams.get("url");

    if (!rssUrl) {
      return NextResponse.json(
        { error: "RSS URL is required" },
        { status: 400 }
      );
    }

    // Fetch the RSS feed
    const response = await fetch(rssUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status}`);
    }

    const rssText = await response.text();

    // Parse RSS XML using fast-xml-parser
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });

    let parsedXml;
    try {
      parsedXml = parser.parse(rssText);
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to parse RSS XML", details: error },
        { status: 400 }
      );
    }

    // Navigate to RSS items
    const rss = parsedXml.rss || parsedXml;
    const channel = rss.channel || rss;
    const items = Array.isArray(channel.item)
      ? channel.item
      : channel.item
      ? [channel.item]
      : [];

    return NextResponse.json({
      success: true,
      channelTitle: channel.title,
      itemCount: items.length,
      firstItem: items[0] || null,
      sampleItems: items.slice(0, 3), // Show first 3 items for debugging
    });
  } catch (error) {
    console.error("Error debugging RSS:", error);
    return NextResponse.json(
      { error: "Failed to debug RSS", details: String(error) },
      { status: 500 }
    );
  }
}
