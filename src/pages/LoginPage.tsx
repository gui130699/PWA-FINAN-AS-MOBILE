import { useState } from 'react'
import { TrendingDown, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { toast } from '../components/ui/Toast'

type Mode = 'login' | 'register' | 'reset'

export function LoginPage() {
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { toast.error('Informe o e-mail'); return }
    if (mode !== 'reset' && !password) { toast.error('Informe a senha'); return }
    if (mode === 'register' && password !== confirm) { toast.error('Senhas não conferem'); return }
    if (mode !== 'reset' && password.length < 6) { toast.error('Senha deve ter ao menos 6 caracteres'); return }

    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else if (mode === 'register') {
        await signUp(email, password)
        toast.success('Conta criada com sucesso!')
      } else {
        await resetPassword(email)
        toast.success('E-mail de recuperação enviado!')
        setMode('login')
      }
    } catch (err: any) {
      const msg = firebaseErrorMessage(err.code)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const titles = {
    login: 'Entrar na conta',
    register: 'Criar conta',
    reset: 'Recuperar senha',
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center">
            <TrendingDown className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Controle Financeiro</h1>
            <p className="text-indigo-200 text-sm">Gerencie suas finanças pessoais</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col gap-5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{titles[mode]}</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-4 h-4" />}
              autoComplete="email"
            />

            {mode !== 'reset' && (
              <div className="relative">
                <Input
                  label="Senha"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock className="w-4 h-4" />}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}

            {mode === 'register' && (
              <Input
                label="Confirmar senha"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                autoComplete="new-password"
              />
            )}

            <Button type="submit" fullWidth loading={loading} size="lg">
              {mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar conta' : 'Enviar e-mail'}
            </Button>
          </form>

          {/* Links */}
          <div className="flex flex-col gap-2 text-center text-sm">
            {mode === 'login' && (
              <>
                <button onClick={() => setMode('reset')} className="text-indigo-600 hover:underline">
                  Esqueceu sua senha?
                </button>
                <button onClick={() => setMode('register')} className="text-slate-600 dark:text-slate-400 hover:underline">
                  Não tem conta? <span className="text-indigo-600 font-semibold">Cadastre-se</span>
                </button>
              </>
            )}
            {mode !== 'login' && (
              <button onClick={() => setMode('login')} className="text-slate-600 dark:text-slate-400 hover:underline">
                Já tem conta? <span className="text-indigo-600 font-semibold">Entrar</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function firebaseErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    'auth/invalid-email': 'E-mail inválido',
    'auth/user-not-found': 'Usuário não encontrado',
    'auth/wrong-password': 'Senha incorreta',
    'auth/email-already-in-use': 'E-mail já cadastrado',
    'auth/weak-password': 'Senha muito fraca',
    'auth/too-many-requests': 'Muitas tentativas. Tente mais tarde',
    'auth/invalid-credential': 'Credenciais inválidas',
  }
  return messages[code] ?? 'Erro ao autenticar. Tente novamente'
}

import React from 'react'
