import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Unlock,
  ShieldAlert,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertTriangle,
  KeyRound,
  Loader2,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import { authenticateWithPassword, getAuthStatus, AuthStatus } from '../utils/spcAuth';

interface SecurityLoginGateProps {
  onAuthenticated: () => void;
}

export const SecurityLoginGate: React.FC<SecurityLoginGateProps> = ({ onAuthenticated }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>(getAuthStatus());
  const [countdown, setCountdown] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Sync auth status on mount and handle lockout timer
  useEffect(() => {
    const status = getAuthStatus();
    setAuthStatus(status);
    if (status.isLocked && status.remainingLockSeconds > 0) {
      setCountdown(status.remainingLockSeconds);
    }
  }, []);

  // Countdown timer when locked
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setAuthStatus(getAuthStatus());
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  useEffect(() => {
    if (!authStatus.isLocked && inputRef.current) {
      inputRef.current.focus();
    }
  }, [authStatus.isLocked]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isLoading || countdown > 0) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await authenticateWithPassword(password.trim());
      if (res.success) {
        setIsLoading(false);
        onAuthenticated();
      } else {
        setIsLoading(false);
        setPassword('');
        setErrorMsg(res.error || 'Credencial não reconhecida pelo sistema.');
        if (res.remainingLockSeconds && res.remainingLockSeconds > 0) {
          setCountdown(res.remainingLockSeconds);
          setAuthStatus((prev) => ({
            ...prev,
            isLocked: true,
            remainingLockSeconds: res.remainingLockSeconds || 0
          }));
        } else {
          setAuthStatus(getAuthStatus());
        }
      }
    } catch {
      setIsLoading(false);
      setErrorMsg('Falha na verificação de integridade da credencial.');
    }
  };

  const isLocked = countdown > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-radial from-slate-900 via-slate-950 to-black p-4 select-none animate-in fade-in duration-300">
      {/* Decorative backdrop mesh */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />

      <div className="relative w-full max-w-md bg-slate-900/90 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden text-slate-100">
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-red-950 via-slate-900 to-red-950 px-6 py-5 border-b border-slate-800 text-center relative">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center shadow-lg ring-4 ring-red-500/20 mb-3">
            {isLocked ? (
              <ShieldAlert className="w-7 h-7 text-white animate-pulse" />
            ) : (
              <Lock className="w-7 h-7 text-white" />
            )}
          </div>
          <div className="inline-block px-2.5 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800 text-[10px] font-mono font-bold uppercase tracking-wider mb-1">
            PTP • Acesso Restrito & Protegido
          </div>
          <h1 className="text-xl font-serif font-bold text-white tracking-wide">
            Controle Estatístico de Processo
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Módulo Industrial Petropol • Autenticação Mandatória
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-7 space-y-5">
          {/* Lockout Notice Banner */}
          {isLocked && (
            <div className="p-3.5 bg-red-950/70 border border-red-700/80 rounded-xl text-xs text-red-200 flex items-start gap-3 shadow-sm animate-pulse">
              <Clock className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block text-red-100">
                  Bloqueio Temporário Ativado
                </strong>
                <span>
                  Múltiplas tentativas incorretas foram registradas. Por segurança industrial, novas
                  tentativas estão suspensas por <strong>{countdown} segundos</strong>.
                </span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {!isLocked && errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-200 flex items-start gap-2.5 shadow-sm animate-shake">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-red-400" />
                  <span>Chave / Senha de Acesso</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {authStatus.failedAttempts > 0 && !isLocked
                    ? `${authStatus.failedAttempts}/5 tentativas`
                    : 'Proteção Criptográfica'}
                </span>
              </label>

              <div className="relative">
                <input
                  ref={inputRef}
                  type={showPassword ? 'text' : 'password'}
                  inputMode="numeric"
                  autoComplete="current-password"
                  disabled={isLocked || isLoading}
                  placeholder="Digite a senha de liberação..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600 text-sm font-mono tracking-wider focus:outline-hidden focus:border-red-600 focus:ring-2 focus:ring-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  disabled={isLocked || isLoading}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-slate-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLocked || isLoading || !password.trim()}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 disabled:from-slate-800 disabled:to-slate-800 text-white rounded-xl font-bold text-xs tracking-wide shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-red-600/30"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Validando Credencial Criptográfica...</span>
                </>
              ) : isLocked ? (
                <>
                  <Clock className="w-4 h-4 text-red-300" />
                  <span>Aguarde {countdown}s para tentar novamente</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Desbloquear e Acessar o Sistema</span>
                </>
              )}
            </button>
          </form>

          {/* Security details footer */}
          <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-300 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Segurança Industrial e Integridade de Dados</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              O acesso aos módulos de cartas Shewhart, histogramas, laudos e banco de relatórios é
              protegido contra tentativas não autorizadas com validação criptográfica one-way PBKDF2 e
              bloqueio progressivo de taxa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
