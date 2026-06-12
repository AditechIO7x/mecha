import { NextResponse } from 'next/server';

export async function GET(request) {
  const clientId = 'GANTI_DENGAN_GITHUB_CLIENT_ID_ANDA';
  const clientSecret = 'GANTI_DENGAN_GITHUB_CLIENT_SECRET_ANDA';
  
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', request.url));
  }

  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  const data = await res.json();

  if (data.access_token) {
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.set('gh_token', data.access_token, {
      httpOnly: true,
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  }

  return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
}