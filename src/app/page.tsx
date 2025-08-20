"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [rssUrl, setRssUrl] = useState("");
  const [icalUrl, setIcalUrl] = useState("");
  const [copied, setCopied] = useState(false);

  // Generate iCal URL whenever RSS URL changes
  useEffect(() => {
    if (rssUrl.trim()) {
      try {
        // Validate URL format
        new URL(rssUrl.trim());
        const baseUrl =
          process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
        const generatedIcalUrl = `${baseUrl}/api/ical?url=${encodeURIComponent(
          rssUrl.trim()
        )}`;
        setIcalUrl(generatedIcalUrl);
      } catch {
        setIcalUrl("");
      }
    } else {
      setIcalUrl("");
    }
  }, [rssUrl]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(icalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  return (
    <div className="light">
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-2 sm:px-20 md:py-6 bg-white text-gray-900">
        <section className="">
          <h1 className="pb-2 text-4xl font-bold text-gray-900">rss to cal</h1>

          <p className="py-6">
            <b>Convert your RSS event stream to the ical format.</b> The vast
            majority of the world works in the tried-and-true{" "}
            <a href="https://datatracker.ietf.org/doc/html/rfc5545">ical</a>{" "}
            format. Unfortunately, there&apos;s a handful of places that have
            gone and used good &apos;ole RSS as an event stream. This tool
            attempts to take the RSS data and stretch it into the ical format
            and serve it out for use in web calendars. No guarantees of working,
            or that this site will stay upright! If something doesn&apos;t seem
            to be working right, feel free to reach out.
          </p>
        </section>

        <section className="py-2 text-gray-600 md:py-6">
          <div className="container mx-auto flex">
            <div className="flex w-full flex-wrap">
              <div className="relative flex w-full pb-6 md:pb-12">
                <div className="relative z-10 hidden h-10 w-10 max-w-full flex-shrink-0 items-center justify-center rounded-full bg-stone-500 text-white sm:inline-flex">
                  1
                </div>
                <div className="flex-grow sm:pl-4">
                  <h2 className="title-font mb-1 text-sm font-medium tracking-wider text-gray-900">
                    <span className="sm:hidden">1. </span>ENTER YOUR RSS FEED
                    URL
                  </h2>
                  <p className="leading-relaxed">
                    The direct link to an RSS feed being used as an event stream
                  </p>
                  <div className="relative my-3 flex w-full flex-wrap items-stretch">
                    <input
                      type="text"
                      placeholder="https://api.calendar.moderncampus.net/pubcalendar/..."
                      value={rssUrl}
                      onChange={(e) => setRssUrl(e.target.value)}
                      className="placeholder-blueGray-300 text-blueGray-600 border-blueGray-300 relative w-full rounded border bg-white px-3 py-3 text-sm outline-none focus:outline-none focus:ring"
                    />
                  </div>
                </div>
              </div>

              <div className="relative flex w-full">
                <div className="relative z-10 hidden h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-stone-500 text-white sm:inline-flex">
                  2
                </div>
                <div className="flex-grow sm:pl-4">
                  <h2 className="title-font mb-1 text-sm font-medium tracking-wider text-gray-900">
                    <span className="sm:hidden">2. </span>COPY THE ASSEMBLED
                    LINK
                  </h2>
                  <p className="leading-relaxed">
                    This URL should go in the &quot;Add Other Calendar from
                    URL&quot; section (
                    <a
                      href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl?pli=1&sf=true&output=xml"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      link
                    </a>
                    )
                  </p>
                  <div className="my-3 bg-stone-100 p-3 text-stone-900 rounded">
                    {icalUrl ? (
                      <div className="flex items-center justify-between">
                        <div className="flex-1 mr-4 break-all">{icalUrl}</div>
                        <button
                          onClick={copyToClipboard}
                          className="px-3 py-1 bg-stone-500 text-white text-sm rounded hover:bg-stone-600 flex-shrink-0"
                        >
                          {copied ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    ) : (
                      <div className="text-gray-500 italic">
                        Enter an RSS URL above to generate your iCal link
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
