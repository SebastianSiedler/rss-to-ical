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

    // Return the iCal content with proper headers
    return new NextResponse(icalContent, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="calendar.ics"',
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
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
  let icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//RSS to iCal Converter//EN
CALSCALE:GREGORIAN
X-WR-CALNAME:${escapeText(channelTitle)}
X-WR-CALDESC:Calendar converted from RSS feed
X-WR-TIMEZONE:UTC
METHOD:PUBLISH
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

    icalContent += `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dateTimeStamp}
DTSTART:${eventDateFormatted}
DTEND:${eventEndFormatted}
SUMMARY:${escapeText(String(title))}
DESCRIPTION:${escapeText(String(description))}
URL:${String(link)}
STATUS:CONFIRMED
TRANSP:OPAQUE
END:VEVENT
`;
  });

  icalContent += "END:VCALENDAR\n";
  return icalContent;
}

function generateUID(guid: string): string {
  // Create a simple UID from the GUID
  return guid.replace(/[^a-zA-Z0-9-]/g, "") + "@rss-to-ical.local";
}

function formatDateTimeStamp(date: Date): string {
  // Format date as YYYYMMDDTHHMMSSZ
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escapeText(text: string): string {
  // Escape special characters for iCal format
  return text
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "")
    .substring(0, 1000); // Limit length to prevent issues
}
