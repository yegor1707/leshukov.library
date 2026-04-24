import { Router, type IRouter } from "express";

const router: IRouter = Router();

const ALLOWED_HOSTS = new Set([
  "drive.google.com",
  "drive.usercontent.google.com",
  "docs.google.com",
  "www.dropbox.com",
  "dl.dropboxusercontent.com",
  "dropbox.com",
]);

function extractDriveFileId(url: string): string | null {
  const m =
    url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/) ||
    url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

function buildUpstreamUrl(raw: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (!ALLOWED_HOSTS.has(parsed.hostname)) return null;

  if (parsed.hostname.endsWith("google.com")) {
    const id = extractDriveFileId(raw);
    if (!id) return null;
    return `https://drive.usercontent.google.com/download?id=${id}&export=download&authuser=0`;
  }

  if (parsed.hostname.endsWith("dropbox.com")) {
    const u = new URL(raw);
    u.searchParams.delete("dl");
    u.searchParams.set("dl", "1");
    return u.toString();
  }

  return raw;
}

router.get("/", async (req, res) => {
  const raw = typeof req.query.url === "string" ? req.query.url : "";
  if (!raw) {
    res.status(400).json({ error: "url query parameter is required" });
    return;
  }

  const upstream = buildUpstreamUrl(raw);
  if (!upstream) {
    res.status(400).json({ error: "URL host not allowed" });
    return;
  }

  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (compatible; LeshukovLibrary/1.0) AppleWebKit/537.36",
    Accept: "*/*",
  };
  if (req.headers.range) headers["Range"] = String(req.headers.range);
  if (req.headers["if-range"])
    headers["If-Range"] = String(req.headers["if-range"]);
  if (req.headers["if-modified-since"])
    headers["If-Modified-Since"] = String(req.headers["if-modified-since"]);

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(upstream, {
      headers,
      redirect: "follow",
    });
  } catch (err) {
    req.log.error({ err, upstream }, "audio proxy upstream fetch failed");
    res.status(502).json({ error: "Failed to reach audio source" });
    return;
  }

  res.status(upstreamRes.status);

  const passHeaders = [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "last-modified",
    "etag",
    "cache-control",
  ];
  for (const h of passHeaders) {
    const v = upstreamRes.headers.get(h);
    if (v) res.setHeader(h, v);
  }

  if (!upstreamRes.headers.get("accept-ranges")) {
    res.setHeader("Accept-Ranges", "bytes");
  }
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (!upstreamRes.body) {
    res.end();
    return;
  }

  const reader = upstreamRes.body.getReader();
  const onClose = () => {
    reader.cancel().catch(() => {});
  };
  res.on("close", onClose);

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value && !res.writableEnded) {
        const ok = res.write(Buffer.from(value));
        if (!ok) {
          await new Promise<void>((resolve) => res.once("drain", () => resolve()));
        }
      }
    }
  } catch (err) {
    req.log.warn({ err }, "audio proxy stream interrupted");
  } finally {
    res.off("close", onClose);
    if (!res.writableEnded) res.end();
  }
});

export default router;
