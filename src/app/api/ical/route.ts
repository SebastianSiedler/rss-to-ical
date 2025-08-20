import { NextRequest, NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import ical, { ICalCalendarMethod } from "ical-generator";

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

    // Validate URL format
    try {
      new URL(rssUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid RSS URL format" },
        { status: 400 }
      );
    }

    // Fetch the RSS feed
    const response = await fetch(rssUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status}`);
    }

    const rssText = await response.text();

    // Convert RSS to iCal
    const icalContent = convertRSSToICal(rssText);

    // Return the iCal content with proper headers for calendar subscriptions
    return new NextResponse(icalContent, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("Error converting RSS to iCal:", error);
    return NextResponse.json(
      { error: "Failed to convert RSS to iCal" },
      { status: 500 }
    );
  }
}

interface RSSItem {
  title?: string;
  description?: string;
  link?: string;
  pubDate?: string;
  guid?: string | { "#text": string };
}

function convertRSSToICal(rssText: string): string {
  // Parse RSS XML using fast-xml-parser
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  let parsedXml;
  try {
    parsedXml = parser.parse(rssText);
  } catch {
    throw new Error("Invalid RSS XML format");
  }

  // Navigate to RSS items
  const rss = parsedXml.rss || parsedXml;
  const channel = rss.channel || rss;
  const items: RSSItem[] = Array.isArray(channel.item)
    ? channel.item
    : channel.item
    ? [channel.item]
    : [];
  const channelTitle = channel.title || "RSS Calendar";

  // Create iCal calendar using ical-generator
  const calendar = ical({
    name: channelTitle,
    description: "Calendar converted from RSS feed",
    method: ICalCalendarMethod.PUBLISH,
  });

  // Convert each RSS item to a VEVENT
  items.forEach((item: RSSItem, index: number) => {
    const title = item.title || "Untitled Event";
    const description = item.description || "";
    const link = item.link || "";
    const pubDate = item.pubDate;
    const guid = item.guid || `event-${index}`;

    // Parse date - try different date formats commonly found in RSS
    let eventDate = new Date();
    if (pubDate) {
      eventDate = new Date(pubDate);
      if (isNaN(eventDate.getTime())) {
        eventDate = new Date(); // fallback to current date
      }
    }

    // Create event end time (1 hour later)
    const eventEndDate = new Date(eventDate.getTime() + 3600000);

    // Generate UID
    const uid = generateUID(
      typeof guid === "string" ? guid : String(guid),
      index
    );

    try {
      const event = calendar.createEvent({
        start: eventDate,
        end: eventEndDate,
        summary: String(title).substring(0, 255), // Limit summary length
        description: String(description).substring(0, 1000), // Limit description length
        url: String(link),
      });
      event.uid(uid); // Set UID separately
    } catch (error) {
      console.warn(`Failed to create event ${index}:`, error);
      // Skip this event and continue with others
    }
  });

  return calendar.toString();
}

function generateUID(guid: string, index: number): string {
  // Create a shorter, more reliable UID
  let cleanGuid = guid.replace(/[^a-zA-Z0-9-]/g, "").substring(0, 20);
  if (!cleanGuid) {
    cleanGuid = `event-${index}`;
  }
  const timestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp
  return `${cleanGuid}-${timestamp}@rss-to-ical.local`;
}
