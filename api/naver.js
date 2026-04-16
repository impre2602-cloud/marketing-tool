/**
 * Vercel API Route — 네이버 검색 API 프록시
 *
 * 환경변수 설정 (Vercel 대시보드 → Settings → Environment Variables):
 *   NAVER_CLIENT_ID     = 네이버 Client ID
 *   NAVER_CLIENT_SECRET = 네이버 Client Secret
 */

const ALLOWED_TYPES = ['blog', 'local', 'news', 'cafearticle', 'webkr'];

export default async function handler(req, res) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // GET 이외 거부
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: '허용되지 않는 메서드입니다.' });
  }

  const { type = 'blog', query = '', display = '10', start = '1', sort = 'sim' } = req.query;

  // 필수 파라미터 검증
  if (!query.trim()) {
    return res.status(400).json({ ok: false, error: '검색어(query)가 비어 있습니다.' });
  }
  if (!ALLOWED_TYPES.includes(type)) {
    return res.status(400).json({ ok: false, error: `허용되지 않는 검색 타입: ${type}` });
  }

  // 환경변수 확인
  const clientId     = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({
      ok: false,
      error: 'Vercel 환경변수(NAVER_CLIENT_ID / NAVER_CLIENT_SECRET)가 설정되지 않았습니다.'
    });
  }

  // 네이버 API 호출
  const naverUrl = new URL(`https://openapi.naver.com/v1/search/${type}.json`);
  naverUrl.searchParams.set('query',   query);
  naverUrl.searchParams.set('display', String(Math.min(Math.max(parseInt(display) || 10, 1), 100)));
  naverUrl.searchParams.set('start',   String(Math.min(Math.max(parseInt(start)   || 1,  1), 1000)));
  naverUrl.searchParams.set('sort',    ['sim', 'date'].includes(sort) ? sort : 'sim');

  try {
    const naverRes = await fetch(naverUrl.toString(), {
      headers: {
        'X-Naver-Client-Id':     clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    if (!naverRes.ok) {
      const err = await naverRes.json().catch(() => ({}));
      return res.status(naverRes.status).json({
        ok: false,
        error: err.errorMessage || err.message || `네이버 API 오류 (HTTP ${naverRes.status})`
      });
    }

    const data = await naverRes.json();
    return res.status(200).json(data);

  } catch (e) {
    return res.status(502).json({ ok: false, error: `네이버 API 연결 실패: ${e.message}` });
  }
}
