import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const script = `(function(){
  var scriptTag = document.currentScript || document.querySelector('script[data-episode]');
  if (!scriptTag) return;
  var episode = scriptTag.getAttribute('data-episode');
  if (!episode) return;
  var params = [];
  var theme = scriptTag.getAttribute('data-theme');
  var accent = scriptTag.getAttribute('data-accent');
  var radius = scriptTag.getAttribute('data-radius');
  var size = scriptTag.getAttribute('data-size');
  var chapters = scriptTag.getAttribute('data-chapters');
  var transcript = scriptTag.getAttribute('data-transcript');
  var open = scriptTag.getAttribute('data-open');
  if (theme) params.push('theme=' + encodeURIComponent(theme));
  if (accent) params.push('accent=' + encodeURIComponent(accent));
  if (radius) params.push('radius=' + encodeURIComponent(radius));
  if (size) params.push('size=' + encodeURIComponent(size));
  if (chapters) params.push('chapters=' + encodeURIComponent(chapters));
  if (transcript) params.push('transcript=' + encodeURIComponent(transcript));
  if (open) params.push('open=' + encodeURIComponent(open));
  var origin = new URL(scriptTag.src).origin;
  var iframe = document.createElement('iframe');
  iframe.src = origin + '/embed/e/' + episode + (params.length ? '?' + params.join('&') : '');
  iframe.style.width = '100%';
  var height = '160px';
  if (size === 'compact') height = '120px';
  if (size === 'tall') height = '220px';
  iframe.style.height = height;
  iframe.style.border = '0';
  iframe.loading = 'lazy';
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
