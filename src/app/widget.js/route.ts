import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const height = "96px";
  const script = `(function(){
  var scriptTag = document.currentScript || document.querySelector('script[data-episode]');
  if (!scriptTag) return;
  var episode = scriptTag.getAttribute('data-episode');
  if (!episode) return;
  var origin = new URL(scriptTag.src).origin;
  var iframe = document.createElement('iframe');
  iframe.src = origin + '/embed/e/' + episode;
  iframe.style.width = '100%';
  iframe.style.height = '${height}';
  iframe.style.border = '0';
  iframe.style.background = 'transparent';
  iframe.loading = 'lazy';
  iframe.allow = 'autoplay';
  iframe.setAttribute('title', 'ListenLayer Embed');
  scriptTag.parentNode.insertBefore(iframe, scriptTag);
})();`;

  return new NextResponse(script, {
    status: 200,
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
