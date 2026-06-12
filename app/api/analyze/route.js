import { getRepoData } from '@/lib/github';
import { ClaudeClient } from '@/lib/claude-client';
import { cookies } from 'next/headers';

export const runtime = 'edge';

export async function POST(request) {
  try {
    const { repoUrl, email, sessionCode } = await request.json();
    const cookieStore = await cookies();
    const ghToken = cookieStore.get('gh_token')?.value;

    const repoContext = await getRepoData(repoUrl, ghToken);

    const systemPrompt = `Kamu adalah Agen AI Senior Software Architect. Tugasmu adalah menganalisis repositori kode yang diberikan secara mendalam dan menyeluruh, kemudian menyusun "Master Prompt" terstruktur. Format Output yang Harus Kamu Hasilkan:\n# 1. DEEP ARCHITECTURAL ANALYSIS\n(Berikan analisis mendalam mengenai arsitektur, pola desain, teknologi, kelemahan sistem, serta kesiapan deploy ke Vercel).\n\n---\n# 2. MASTER PROMPT GENERATION\n(Tulis instruksi dalam blok kutipan/markdown block khusus yang siap disalin oleh user. Isi prompt harus merangkum seluruh state aplikasi saat ini, struktur data, dan konteks codebase, sehingga jika prompt tersebut ditempel di AI lain, AI tersebut langsung paham struktur proyek secara instan untuk melanjutkan development).`;

    const finalPrompt = `${systemPrompt}\n\nBerikut adalah data repositori objek analisis:\n${repoContext}`;

    const claude = new ClaudeClient();
    
    if (email && sessionCode) {
      await claude.verifyMagicLink(email, sessionCode);
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await claude.chat(finalPrompt, {
            onChunk: (textChunk) => {
              controller.enqueue(encoder.encode(textChunk));
            }
          });
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}