import { useEffect, useState } from 'react'
import { TrendingDown } from 'lucide-react'

interface SplashScreenProps {
  ready: boolean
}

export function SplashScreen({ ready }: SplashScreenProps) {
  const [visible, setVisible] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)
  const [logoIn, setLogoIn] = useState(false)
  const [textIn, setTextIn] = useState(false)
  const [dotsIn, setDotsIn] = useState(false)

  useEffect(() => {
    // Anima entrada sequencial
    const t1 = setTimeout(() => setLogoIn(true), 100)
    const t2 = setTimeout(() => setTextIn(true), 400)
    const t3 = setTimeout(() => setDotsIn(true), 700)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  useEffect(() => {
    if (!ready) return
    // Mínimo de 1.4s de splash mesmo se o auth resolver rápido
    const t = setTimeout(() => {
      setFadeOut(true)
      // Remove do DOM depois da transição
      setTimeout(() => setVisible(false), 500)
    }, 1400)
    return () => clearTimeout(t)
  }, [ready])

  if (!visible) return null

  return (
    <div
      className={`fixed inset-0 z-100 flex flex-col items-center justify-center select-none transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}
    >
      {/* Círculos decorativos de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-125 rounded-full bg-indigo-800/5 blur-3xl" />
      </div>

      {/* Conteúdo central */}
      <div className="relative flex flex-col items-center gap-6">
        {/* Logo */}
        <div
          className={`transition-all duration-700 ${logoIn ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 translate-y-4'}`}
        >
          <div className="relative">
            {/* Anel pulsante */}
            <div className="absolute inset-0 rounded-3xl bg-indigo-500/30 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="relative w-24 h-24 rounded-3xl bg-linear-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-2xl shadow-indigo-900/60">
              <TrendingDown className="w-12 h-12 text-white" />
            </div>
          </div>
        </div>

        {/* Textos */}
        <div
          className={`flex flex-col items-center gap-1.5 transition-all duration-700 delay-100 ${textIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
        >
          <h1 className="text-3xl font-bold text-white tracking-tight">Controle</h1>
          <p className="text-lg font-semibold text-indigo-400 tracking-widest uppercase">Financeiro</p>
          <p className="text-xs text-slate-500 mt-1">Seu controle financeiro pessoal</p>
        </div>

        {/* Indicador de carregamento */}
        <div
          className={`flex gap-2 mt-4 transition-all duration-700 delay-200 ${dotsIn ? 'opacity-100' : 'opacity-0'}`}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-indigo-500"
              style={{
                animation: 'splash-dot 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Versão */}
      <p className="absolute bottom-8 text-xs text-slate-600">v1.0</p>

      <style>{`
        @keyframes splash-dot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  )
}
