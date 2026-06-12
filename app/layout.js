import './global.css';

export const metadata = {
  title: 'Repository Architecture Analyzer & Prompt Engine',
  description: 'A structured repository analysis system for transforming codebase context into LLM master prompts.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <meta name="theme-color" content="#0b0c0e" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}