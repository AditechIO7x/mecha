import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = 'GANTI_DENGAN_GITHUB_CLIENT_ID_ANDA';
  const scopes = ['repo', 'user:email'].join(' ');
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=${encodeURIComponent(scopes)}`;
  
  return NextResponse.redirect(githubAuthUrl);
}