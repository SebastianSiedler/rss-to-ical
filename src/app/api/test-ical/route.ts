import { NextResponse } from "next/server";

export async function GET() {
  // Simple test iCal content to verify the format works
  const testIcalContent = `BEGIN:VCALENDAR\r
VERSION:2.0\r
PRODID:-//Test//Test//EN\r
CALSCALE:GREGORIAN\r
METHOD:PUBLISH\r
BEGIN:VEVENT\r
UID:test-event-123@rss-to-ical.local\r
DTSTAMP:20250820T120000Z\r
DTSTART:20250821T140000Z\r
DTEND:20250821T150000Z\r
SUMMARY:Test Event\r
DESCRIPTION:This is a test event to verify iCal format\r
STATUS:CONFIRMED\r
SEQUENCE:0\r
END:VEVENT\r
END:VCALENDAR\r\n`;

  return new NextResponse(testIcalContent, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
