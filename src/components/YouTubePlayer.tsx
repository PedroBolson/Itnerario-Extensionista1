type Props = {
  url: string;
  title?: string;
  className?: string;
};

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.slice(1) || null;
    }
    if (u.hostname.includes('youtube.com')) {
      if (u.searchParams.get('v')) return u.searchParams.get('v');
      const match = u.pathname.match(/\/embed\/([\w-]+)/);
      if (match) return match[1];
    }
  } catch {
    return null;
  }
  return null;
}

export function YouTubePlayer({ url, title, className }: Props) {
  const id = extractYouTubeId(url);
  if (!id) {
    return (
      <div className={"grid place-items-center border border-theme rounded-xl bg-theme-base text-theme-secondary " + (className || '')}>
        URL inválida do YouTube
      </div>
    );
  }
  const src = `https://www.youtube-nocookie.com/embed/${id}?rel=0`; // privacy-enhanced
  return (
    <div className={"relative w-full overflow-hidden rounded-xl border border-theme bg-black " + (className || '')}>
      <div className="aspect-video w-full">
        <iframe
          className="w-full h-full"
          src={src}
          title={title || 'YouTube video player'}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </div>
  );
}

