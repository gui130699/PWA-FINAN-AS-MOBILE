import { useState, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  ChevronDown,
  HelpCircle,
  ArrowRight,
  X,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/Loading'
import { helpSections, quickAccessIds, type HelpSection } from '../data/helpContent'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function sectionMatchesQuery(section: HelpSection, q: string): HelpSection | null {
  if (!q) return section
  const headerMatch =
    normalize(section.title).includes(q) || normalize(section.description).includes(q)
  const filteredItems = section.items.filter(
    item =>
      normalize(item.title).includes(q) ||
      item.content.some(line => normalize(line).includes(q)),
  )
  if (headerMatch) return section
  if (filteredItems.length > 0) return { ...section, items: filteredItems }
  return null
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface QuickCardProps {
  section: HelpSection
  onClick: () => void
}

function QuickCard({ section, onClick }: QuickCardProps) {
  const Icon = section.icon
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-sm transition-all active:scale-95 text-center"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${section.iconBg}`}>
        <Icon className={`w-5 h-5 ${section.iconColor}`} />
      </div>
      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-tight">
        {section.title}
      </span>
    </button>
  )
}

interface SectionCardProps {
  section: HelpSection
  isOpen: boolean
  onToggle: () => void
  sectionRef: (el: HTMLDivElement | null) => void
  navigate: ReturnType<typeof useNavigate>
}

function SectionCard({ section, isOpen, onToggle, sectionRef, navigate }: SectionCardProps) {
  const Icon = section.icon
  return (
    <div
      ref={sectionRef}
      className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${section.iconBg}`}>
          <Icon className={`w-5 h-5 ${section.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 dark:text-white text-sm">{section.title}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{section.description}</p>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Content */}
      {isOpen && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-4 pb-4 pt-3 flex flex-col gap-4">
          {section.items.map((item, i) => (
            <div key={i} className="flex gap-3">
              <div className="mt-1 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 dark:text-indigo-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  {item.title}
                </p>
                <ul className="flex flex-col gap-1">
                  {item.content.map((line, j) => (
                    <li key={j} className="flex gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Circle className="w-1.5 h-1.5 shrink-0 mt-2 fill-slate-400 dark:fill-slate-500 text-slate-400 dark:text-slate-500" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}

          {section.route && (
            <div className="pt-1">
              <Button
                variant="ghost"
                size="sm"
                icon={<ArrowRight className="w-4 h-4" />}
                onClick={() => navigate(section.route!)}
                className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
              >
                {section.routeLabel}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function HelpPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'primeiros-passos': true,
  })
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const normalizedQuery = normalize(query.trim())

  const filtered = useMemo(() => {
    return helpSections
      .map(s => sectionMatchesQuery(s, normalizedQuery))
      .filter((s): s is HelpSection => s !== null)
  }, [normalizedQuery])

  // When search is active, expand all matching sections
  const effectiveOpen = useMemo(() => {
    if (!normalizedQuery) return openSections
    const expanded: Record<string, boolean> = {}
    filtered.forEach(s => { expanded[s.id] = true })
    return expanded
  }, [normalizedQuery, filtered, openSections])

  const handleQuickAccess = useCallback((id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: true }))
    setTimeout(() => {
      sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }, [])

  const toggleSection = useCallback((id: string) => {
    if (normalizedQuery) return // busca ativa — sempre expandido
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }))
  }, [normalizedQuery])

  const quickSections = helpSections.filter(s => quickAccessIds.includes(s.id))

  return (
    <div className="flex flex-col gap-5">
      {/* ---- Header ---- */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Central de Ajuda</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Aprenda como usar todas as funções do seu Controle Financeiro.
        </p>
      </div>

      {/* ---- Search ---- */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar ajuda..."
          className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* ---- Quick Access (only when not searching) ---- */}
      {!normalizedQuery && (
        <section>
          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Atalhos rápidos
          </h2>
          <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {quickSections.map(s => (
              <QuickCard
                key={s.id}
                section={s}
                onClick={() => handleQuickAccess(s.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ---- Sections ---- */}
      {filtered.length > 0 ? (
        <section className="flex flex-col gap-3">
          {normalizedQuery && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {filtered.length === 1
                ? '1 seção encontrada'
                : `${filtered.length} seções encontradas`}
            </p>
          )}
          {filtered.map(section => (
            <SectionCard
              key={section.id}
              section={section}
              isOpen={effectiveOpen[section.id] ?? false}
              onToggle={() => toggleSection(section.id)}
              sectionRef={el => { sectionRefs.current[section.id] = el }}
              navigate={navigate}
            />
          ))}
        </section>
      ) : (
        <EmptyState
          icon={<HelpCircle className="w-12 h-12" />}
          title="Nenhum tópico encontrado"
          description="Tente buscar por lançamento, categoria, relatório, offline..."
        />
      )}
    </div>
  )
}
