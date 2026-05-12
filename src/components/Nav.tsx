'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import AvatarEditor from './AvatarEditor';
import SettingsModal from './SettingsModal';
import LurelitMascot from './LurelitMascot';
import ConnectionStatus from './ConnectionStatus';

function LurelitWordmark({ size = 13 }: { size?: number }) {
  return (
    <span className="mono" style={{ fontSize: size, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      <span style={{ color: 'var(--teal-bright)' }} className="glow-text-teal">LURE</span>
      <span style={{ color: 'var(--text-dim)' }}>LIT</span>
    </span>
  );
}

export { LurelitWordmark };

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [user, setUser] = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorImage, setEditorImage] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const checkStatus = useCallback(async () => {
    try {
      const [authRes, configRes, avatarRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/settings'),
        fetch('/api/avatar'),
      ]);
      const auth = await authRes.json();
      const config = await configRes.json();
      const av = await avatarRes.json();
      setUser(auth.authenticated ? auth.username : null);
      setConfigured(config.configured);
      if (av.avatar) setAvatar(av.avatar);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setEditorImage(reader.result as string);
      setEditorOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAvatarSave = async (croppedDataUrl: string) => {
    const res = await fetch('/api/avatar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataUrl: croppedDataUrl }) });
    if (res.ok) setAvatar(croppedDataUrl);
    setEditorOpen(false);
  };

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <LurelitMascot size={32} state="idle" showLure={true} />
            <LurelitWordmark size={13} />
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <div className="hidden md:flex" style={{ alignItems: 'center', gap: 28 }}>
              <Link href="/" className={`nav-link ${isActive('/') ? 'is-active' : ''}`}>
                Analyze
              </Link>
              <Link href="/history" className={`nav-link ${isActive('/history') ? 'is-active' : ''}`}>
                History
              </Link>
              <Link href="/docs" className={`nav-link ${isActive('/docs') ? 'is-active' : ''}`}>
                Docs
              </Link>
              <span style={{ color: 'var(--border-strong)' }}>|</span>
            </div>

            <button onClick={() => setSettingsOpen(true)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 3, cursor: 'pointer',
              background: 'transparent', border: `1px solid ${configured ? 'rgba(0,191,179,0.3)' : 'var(--border-strong)'}`,
              fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
              color: 'var(--text-dim)',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: configured ? 'var(--teal)' : 'var(--border-strong)', boxShadow: configured ? '0 0 8px var(--teal)' : 'none' }} />
              {configured ? 'Configured' : 'Setup'}
            </button>

            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  onClick={() => avatarInputRef.current?.click()}
                  style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: avatar ? `url(${avatar}) center/cover` : 'linear-gradient(135deg, var(--teal), var(--pink))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: 'var(--bg)',
                    boxShadow: '0 0 12px var(--teal-glow)',
                    cursor: 'pointer', border: avatar ? '2px solid var(--teal)' : 'none',
                  }}
                  title="Click to upload avatar"
                >
                  {!avatar && user.charAt(0).toUpperCase()}
                </div>
                <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
                <span className="mono hidden md:inline" style={{ fontSize: 11, color: 'var(--text-dim)' }}>{user}</span>
                <button onClick={handleLogout} className="mono" style={{
                  fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
                  color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer',
                }}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} onSaved={checkStatus} />
      <AvatarEditor open={editorOpen} imageUrl={editorImage} onSave={handleAvatarSave} onClose={() => setEditorOpen(false)} />
      <ConnectionStatus />
    </>
  );
}
