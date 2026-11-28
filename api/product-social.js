// Social crawler adapter: only public product slugs reach the existing prerender.
// No credentials, visitor parameters, cookies, or arbitrary URLs cross this boundary.
const ORIGIN = "https://emporiolelecute.com.br";
const PRERENDER = "https://xfqffqxqiuqauefrrcxn.supabase.co/functions/v1/prerender";
const MAX_BYTES = 128 * 1024;
const SOCIAL_AGENT = /facebookexternalhit|Facebot|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|Pinterestbot/i;

const headers = {
  "Cache-Control": "no-store",
  "Vary": "User-Agent",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; img-src https:; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
};

function unavailable(status, method) {
  return new Response(method === "HEAD" ? null : "Produto indisponível.", {
    status,
    headers: { ...headers, "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex" },
  });
}

async function readBounded(response) {
  if (Number(response.headers.get("content-length")) > MAX_BYTES || !response.body) {
    throw new Error("Unexpected prerender size");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let html = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return html + decoder.decode();
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) {
        await reader.cancel();
        throw new Error("Unexpected prerender size");
      }
      html += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}

export async function productSocial(request, fetchPrerender = fetch) {
  if (!["GET", "HEAD"].includes(request.method)) {
    return new Response(null, { status: 405, headers: { ...headers, Allow: "GET, HEAD", "X-Robots-Tag": "noindex" } });
  }
  if (!SOCIAL_AGENT.test(request.headers.get("user-agent") || "")) {
    return unavailable(404, request.method);
  }
  const slugs = new URL(request.url).searchParams.getAll("slug");
  const slug = slugs[0];
  if (slugs.length !== 1 || !slug || slug.length > 180 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return unavailable(404, request.method);
  }

  const path = "/produto/" + slug;
  const canonical = ORIGIN + path;
  const upstreamUrl = new URL(PRERENDER);
  upstreamUrl.searchParams.set("path", path);
  try {
    const upstream = await fetchPrerender(upstreamUrl, {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(5000),
      headers: { Accept: "text/html, text/plain" },
    });
    if (!upstream.ok || upstream.headers.get("x-prerender-error") === "1" ||
        !/^(text\/html|text\/plain)(;|$)/i.test(upstream.headers.get("content-type") || "")) {
      return unavailable(503, request.method);
    }
    const html = await readBounded(upstream);
    const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1];
    if (!head || !head.includes('<meta name="x-prerender" content="edge-bot">') ||
        !head.includes('<link rel="canonical" href="' + canonical + '">') ||
        !head.includes('<meta property="og:url" content="' + canonical + '">')) {
      return unavailable(503, request.method);
    }
    if (!head.includes('<meta property="og:type" content="product">')) {
      const notFound = head.includes('<meta name="robots" content="noindex,follow">') &&
        head.includes('<meta property="og:type" content="website">');
      return unavailable(notFound ? 404 : 503, request.method);
    }
    if (!/<meta property="og:image" content="https:\/\/[^"]+">/.test(head) ||
        !/<meta property="og:title" content="[^"]+">/.test(head)) {
      return unavailable(503, request.method);
    }
    return new Response(request.method === "HEAD" ? null : html, {
      status: 200,
      headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
    });
  } catch {
    return unavailable(503, request.method);
  }
}

export default { fetch: (request) => productSocial(request) };
