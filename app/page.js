'use client';

import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [repoUrl, setRepoUrl] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusLog, setStatusLog] = useState('IDLE');

  useEffect(() => {
    const hasToken = document.cookie.split(';').some((item) => item.trim().startsWith('gh_token='));
    setIsAuthorized(hasToken);
  }, []);

  const handleCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setOutput('');
    setStatusLog('IDLE');
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setLoading(true);
    setOutput('');
    setStatusLog('MENGHUBUNGKAN_KE_GITHUB');

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, email, sessionCode: code }),
      });

      if (!response.ok) {
        throw new Error('Aliran data terputus. Kode status respons tidak valid.');
      }

      setStatusLog('MENGEKSTRAKSI_STRUKTUR_KODE');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      setStatusLog('PROSES_STREAMING_ANALISIS');
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setOutput((prev) => prev + chunk);
      }
      setStatusLog('ANALISIS_SELESAI');
    } catch (err) {
      setOutput(`[SISTEM_ERROR]: ${err.message}`);
      setStatusLog('GAGAL_PROSES');
    } {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0c0e] text-[#e2e4e9] font-sans antialiased">
      <header className="border-b border-neutral-900 px-8 py-4 flex justify-between items-center bg-[#0e1013] sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-neutral-800" />
            <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
            <span className={`h-2.5 w-2.5 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
          </div>
          <div className="h-4 w-[1px] bg-neutral-800" />
          <span className="text-xs font-mono tracking-widest text-neutral-400 uppercase">ARCH-ENGINE // V1.0</span>
        </div>
        <div>
          {isAuthorized ? (
            <div className="flex items-center gap-2 border border-emerald-900/60 bg-emerald-950/20 px-3 py-1.5 rounded">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">Akses Penuh GitHub Aktif</span>
            </div>
          ) : (
            <a 
              href="/api/auth/login" 
              className="text-xs font-mono bg-[#161920] hover:bg-[#1f242e] text-white px-4 py-2 rounded border border-neutral-800 transition-colors uppercase tracking-wider"
            >
              Otorisasi Repositori Privat
            </a>
          )}
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-0 min-h-[calc(100vh-62px)]">
        <div className="lg:col-span-4 p-8 border-r border-neutral-900 bg-[#0e1013]/40 flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Parameter Sumber Daya</h2>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">Definisikan spesifikasi repositori eksternal serta jalur pemrosesan untuk ekstraksi konteks.</p>
            </div>

            <form onSubmit={handleAnalyze} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400">URL Repositori GitHub</label>
                <input 
                  type="url" 
                  required 
                  placeholder="https://github.com/pemilik/nama-repo"
                  className="w-full bg-[#111318] border border-neutral-800 rounded px-4 py-2.5 text-sm text-white focus:outline-none focus:border-neutral-700 transition-colors placeholder:text-neutral-700 font-mono"
                  value={repoUrl} 
                  onChange={(e) => setRepoUrl(e.target.value)}
                />
              </div>

              <div className="border-t border-neutral-900/60 pt-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400">Sesi Akun Claude (Opsional)</label>
                  <p className="text-[10px] text-neutral-600 mt-0.5 leading-normal">Gunakan bagian ini jika skrip otomasi memerlukan injeksi token atau validasi tautan login.</p>
                </div>
                
                <div className="space-y-2.5">
                  <input 
                    type="email" 
                    placeholder="alamat-email@claude.ai"
                    className="w-full bg-[#111318] border border-neutral-800 rounded px-4 py-2.5 text-sm text-white focus:outline-none focus:border-neutral-700 transition-colors placeholder:text-neutral-700 font-mono"
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <input 
                    type="text" 
                    placeholder="Kode OTP / Verifikasi Fallback"
                    className="w-full bg-[#111318] border border-neutral-800 rounded px-4 py-2.5 text-sm text-white focus:outline-none focus:border-neutral-700 transition-colors placeholder:text-neutral-700 font-mono"
                    value={code} 
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-neutral-200 hover:bg-white text-black font-mono text-xs uppercase tracking-widest py-3 rounded disabled:bg-neutral-900 disabled:text-neutral-600 transition-colors border border-transparent font-bold"
              >
                {loading ? 'MENGALIRKAN_DATA...' : 'MULAI ANALISIS KODE'}
              </button>
            </form>
          </div>

          <div className="border-t border-neutral-900/80 pt-6 mt-8 space-y-3">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-neutral-500 uppercase">Status Eksekusi</span>
              <span className="text-neutral-300 font-bold">{statusLog}</span>
            </div>
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-neutral-500 uppercase">Target Deployment</span>
              <span className="text-neutral-400">Vercel Serverless Edge</span>
            </div>
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-neutral-500 uppercase">Batas Waktu Aliran</span>
              <span className="text-neutral-400">Tanpa Batas (Bypass)</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 bg-[#08090b] flex flex-col justify-between">
          <div className="border-b border-neutral-900 px-6 py-3.5 flex justify-between items-center bg-[#0e1013]/30">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
              <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">Terminal Output Berkas</span>
            </div>
            {output && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleClear}
                  className="text-xs font-mono text-neutral-500 hover:text-neutral-300 border border-neutral-900 px-3 py-1.5 rounded bg-[#0b0c0e] transition-colors uppercase"
                >
                  Bersihkan
                </button>
                <button 
                  onClick={handleCopy}
                  className={`text-xs font-mono px-3 py-1.5 rounded transition-all uppercase tracking-wider ${copied ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-[#111318] text-neutral-300 hover:text-white border border-neutral-800'}`}
                >
                  {copied ? 'Tersalin' : 'Salin Semua'}
                </button>
              </div>
            )}
          </div>

          <div className="p-8 flex-1 font-mono text-xs leading-relaxed overflow-y-auto max-h-[calc(100vh-120px)] whitespace-pre-wrap selection:bg-neutral-800">
            {output ? (
              <div className="text-neutral-300 antialiased font-medium">{output}</div>
            ) : (
              <div className="text-neutral-700 flex flex-col items-center justify-center h-full py-32 space-y-2">
                <div className="p-2 border border-neutral-900/60 rounded bg-[#0e1013]/20">
                  <svg className="w-5 h-5 text-neutral-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 002-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-center font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">Konsol Siap Menerima Aliran Data</p>
                <p className="text-[10px] text-neutral-800 max-w-xs text-center leading-normal">Masukkan URL repositori di panel kiri kemudian jalankan proses ekstraksi untuk melihat struktur objek.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}