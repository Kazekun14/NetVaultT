import React, { useState, useEffect } from 'react';
import { KeyRound, Eye, EyeOff, Copy, Clock, ShieldCheck, X } from 'lucide-react';
import { useToast } from '../common/Toast.js';

interface RevealModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentialName: string;
  username: string;
  deviceName: string;
  plaintextPassword: string | null;
  autoHideSeconds: number;
}

export const RevealModal: React.FC<RevealModalProps> = ({
  isOpen,
  onClose,
  credentialName,
  username,
  deviceName,
  plaintextPassword,
  autoHideSeconds,
}) => {
  const [showPlain, setShowPlain] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(autoHideSeconds);
  const { showToast } = useToast();

  useEffect(() => {
    if (!isOpen || !plaintextPassword) return;

    setSecondsLeft(autoHideSeconds);
    setShowPlain(true);

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose(); // Automatically close modal when timer expires
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, plaintextPassword, autoHideSeconds, onClose]);

  if (!isOpen || !plaintextPassword) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(plaintextPassword);
    showToast('Password copied to clipboard.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Credential Revealed</h3>
              <p className="text-xs text-slate-400 font-mono">{deviceName}</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Credential:</span>
              <span className="text-slate-200 font-semibold">{credentialName}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Username:</span>
              <span className="text-cyan-400 font-mono font-semibold">{username}</span>
            </div>
          </div>

          {/* Password Box */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Decrypted Password
            </label>
            <div className="relative flex items-center">
              <input
                type={showPlain ? 'text' : 'password'}
                readOnly
                value={plaintextPassword}
                className="w-full bg-slate-950 border border-emerald-500/30 rounded-xl px-4 py-3 text-sm text-emerald-400 font-mono font-bold tracking-wide focus:outline-none pr-24 shadow-inner"
              />
              <div className="absolute right-2 flex items-center gap-1">
                <button
                  onClick={() => setShowPlain(!showPlain)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  title={showPlain ? 'Hide' : 'Show'}
                >
                  {showPlain ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleCopy}
                  className="p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors"
                  title="Copy password"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Auto Hide Countdown Bar */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Auto-hiding in {secondsLeft}s</span>
            </div>
            <span className="text-[10px] font-mono bg-amber-500/20 px-2 py-0.5 rounded text-amber-200">
              AUDITED ACTION
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            AES-256 Decrypted
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
          >
            Hide & Close
          </button>
        </div>
      </div>
    </div>
  );
};

