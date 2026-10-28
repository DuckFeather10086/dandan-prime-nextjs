export async function GET(request, { params }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return Response.json({ error: '无效的作品 ID' }, { status: 400 });
  try {
    const response = await fetch(`https://api.bgm.tv/v0/subjects/${id}`, {
      headers: { 'User-Agent': 'DuckFeather10086/dandan-prime (https://github.com/DuckFeather10086/dandan-prime)' },
      next: { revalidate: 86400 }, signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return Response.json({ error: '扩展资料暂时不可用' }, { status: 502 });
    const data = await response.json();
    return Response.json({ name: data.name, summary: data.summary, infobox: data.infobox, tags: data.tags }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
  } catch { return Response.json({ error: '扩展资料暂时不可用' }, { status: 502 }); }
}
