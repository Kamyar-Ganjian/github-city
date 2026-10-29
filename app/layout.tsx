import './globals.css';
export const metadata = { title: 'GitHub City — Understand the repository', description: 'A practical GitHub repository explorer with a searchable file tree, accurate metadata, and an architectural map.' };
const themeScript = "try{var t=localStorage.getItem('github-city-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}";
export default function RootLayout({ children }: {
    children: React.ReactNode;
}) {
    return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeScript }}/></head><body>{children}</body></html>;
}
