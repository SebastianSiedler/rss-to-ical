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
    const icalContent = convertRSSToICal(rssText, rssUrl);

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

function convertRSSToICal(rssText: string, sourceUrl: string): string {
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

  // Start building iCal content
  let icalContent = `BEGIN:VCALENDAR\r
VERSION:2.0\r
PRODID:-//RSS to iCal Converter//EN\r
CALSCALE:GREGORIAN\r
X-WR-CALNAME:${escapeText(channelTitle)}\r
X-WR-CALDESC:Calendar converted from RSS feed\r
METHOD:PUBLISH\r
`;

  // Convert each RSS item to a VEVENT
  items.forEach((item: RSSItem, index: number) => {
    const title = item.title || "Untitled Event";
    const description = item.description || "";
    const link = item.link || "";
    const pubDate = item.pubDate;
    const guid = item.guid || `${sourceUrl}#${index}`;

    // Parse date - try different date formats commonly found in RSS
    let eventDate = new Date();
    if (pubDate) {
      eventDate = new Date(pubDate);
      if (isNaN(eventDate.getTime())) {
        eventDate = new Date(); // fallback to current date
      }
    }

    // Generate UID and timestamps
    const uid = generateUID(typeof guid === "string" ? guid : String(guid));
    const dateTimeStamp = formatDateTimeStamp(new Date());
    const eventDateFormatted = formatDateTimeStamp(eventDate);
    const eventEndFormatted = formatDateTimeStamp(
      new Date(eventDate.getTime() + 3600000)
    ); // 1 hour later

    icalContent += `BEGIN:VEVENT\r
UID:${uid}\r
DTSTAMP:${dateTimeStamp}\r
DTSTART:${eventDateFormatted}\r
DTEND:${eventEndFormatted}\r
SUMMARY:${escapeText(String(title))}\r
DESCRIPTION:${escapeText(String(description))}\r
URL:${String(link)}\r
STATUS:CONFIRMED\r
SEQUENCE:0\r
END:VEVENT\r
`;
  });

  icalContent += "END:VCALENDAR\r\n";
  return icalContent;
}

function generateUID(guid: string): string {
  // Create a more unique UID from the GUID
  const cleanGuid = guid.replace(/[^a-zA-Z0-9-]/g, "");
  const timestamp = Date.now();
  return `${cleanGuid}-${timestamp}@rss-to-ical.local`;
}

function formatDateTimeStamp(date: Date): string {
  // Format date as YYYYMMDDTHHMMSSZ
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escapeText(text: string): string {
  // Escape special characters for iCal format and handle line wrapping
  const escaped = text
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "")
    .substring(0, 1000); // Limit length to prevent issues

  // Handle line wrapping at 75 characters as per RFC 5545
  if (escaped.length > 75) {
    let wrapped = "";
    for (let i = 0; i < escaped.length; i += 75) {
      if (i > 0) {
        wrapped += "\r\n ";
      }
      wrapped += escaped.substring(i, i + 75);
    }
    return wrapped;
  }

  return escaped;
}
