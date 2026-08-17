// Vercel serverless function — proxies the YouTube Data API server-side so the
// API key never reaches the browser, and returns just what the Archive grid needs.
//
// GET /api/playlist -> { videos: [{ id, title, thumbnail, position }], updatedAt }

const PLAYLIST_ID = 'PLDFf_ivfkt3sz1c3-cFQjh1uiiLH9BtiQ';

export default async function handler(req, res) {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    res.status(500).json({ error: 'YOUTUBE_API_KEY is not configured' });
    return;
  }

  try {
    const videos = [];
    let pageToken = '';

    do {
      const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
      url.searchParams.set('part', 'snippet');
      url.searchParams.set('maxResults', '50');
      url.searchParams.set('playlistId', PLAYLIST_ID);
      url.searchParams.set('key', apiKey);
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const ytRes = await fetch(url);
      const data = await ytRes.json();

      if (!ytRes.ok) {
        throw new Error(data?.error?.message || `YouTube API error (${ytRes.status})`);
      }

      for (const item of data.items || []) {
        const videoId = item.snippet?.resourceId?.videoId;
        if (!videoId) continue;

        videos.push({
          id: videoId,
          title: item.snippet.title,
          position: item.snippet.position,
          thumbnail:
            item.snippet.thumbnails?.high?.url ||
            item.snippet.thumbnails?.medium?.url ||
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        });
      }

      pageToken = data.nextPageToken || '';
    } while (pageToken);

    // Playlist order (position ascending) mirrors whatever order the playlist
    // owner has arranged in YouTube Studio — newest goes on top if kept that way.
    videos.sort((a, b) => a.position - b.position);

    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
    res.status(200).json({ videos, updatedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
