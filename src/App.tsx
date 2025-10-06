import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Star, RefreshCcw, Search, Filter, ChevronDown, ExternalLink, CalendarClock, Code2 } from "lucide-react";

type Stock = {
  [key: string]: string | number;
};

/**
 * Modern Stock portfolio interface.
 * Fetches stocks via Fundamentus API and renders an animated, filterable gallery.
 */
export default function App() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filterKey, setFilterKey] = useState("All");
  const [sort, setSort] = useState("default");
  const [view, setView] = useState("cards");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchStocks();
    return () => abortRef.current?.abort();
  }, []);

  function fetchStocks() {
    setLoading(true);
    setError("");
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const url = "https://fundamentus-parser.deno.dev/";
    fetch(url, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`API ${r.status}`);
        return r.json();
      })
      .then((data) => setStocks(Array.isArray(data) ? data : []))
      .catch((e) => {
        setError(e.message || "Erro ao buscar ações");
        // Use mock data for development/testing when API fails
        if (process.env.NODE_ENV === 'development') {
          const mockData = [
            { "Papel": "PETR4", "Cotação": "R$ 38.50", "P/L": "5.2", "P/VP": "1.1", "Div.Yield": "12.5%", "Setor": "Petróleo" },
            { "Papel": "VALE3", "Cotação": "R$ 65.20", "P/L": "4.8", "P/VP": "0.9", "Div.Yield": "10.2%", "Setor": "Mineração" },
            { "Papel": "ITUB4", "Cotação": "R$ 28.90", "P/L": "6.5", "P/VP": "1.8", "Div.Yield": "8.5%", "Setor": "Bancos" },
            { "Papel": "BBDC4", "Cotação": "R$ 15.40", "P/L": "7.2", "P/VP": "1.5", "Div.Yield": "7.8%", "Setor": "Bancos" },
            { "Papel": "ABEV3", "Cotação": "R$ 12.30", "P/L": "15.3", "P/VP": "3.2", "Div.Yield": "6.5%", "Setor": "Bebidas" },
            { "Papel": "WEGE3", "Cotação": "R$ 42.10", "P/L": "28.5", "P/VP": "8.5", "Div.Yield": "1.2%", "Setor": "Máquinas" }
          ];
          setStocks(mockData);
        }
      })
      .finally(() => setLoading(false));
  }

  const filterKeys = useMemo(() => {
    if (stocks.length === 0) return ["All"];
    const keys = Object.keys(stocks[0]);
    return ["All", ...keys];
  }, [stocks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const arr = stocks.filter((stock) => {
      if (filterKey !== "All") {
        const value = String(stock[filterKey] || "");
        if (!value.toLowerCase().includes(q)) return false;
      } else {
        if (!q) return true;
        const hay = Object.values(stock).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return sortStocks(arr, sort);
  }, [stocks, query, filterKey, sort]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <Header onRefresh={fetchStocks} loading={loading} />
      <main className="mx-auto max-w-7xl px-4 pb-20">
        <Toolbar
          query={query}
          onQuery={setQuery}
          filterKey={filterKey}
          onFilterKey={setFilterKey}
          filterKeys={filterKeys}
          sort={sort}
          onSort={setSort}
          view={view}
          onView={setView}
          total={filtered.length}
        />

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            Ocorreu um erro ao carregar as ações: <span className="font-semibold">{error}</span>
          </div>
        )}

        {loading ? (
          <SkeletonGrid />
        ) : filtered.length === 0 ? (
          <EmptyState
            onReset={() => {
              setQuery("");
              setFilterKey("All");
              setSort("default");
            }}
          />
        ) : view === "cards" ? (
          <StockGrid stocks={filtered} />
        ) : (
          <StockList stocks={filtered} />
        )}
      </main>
      <Footer />
    </div>
  );
}

function Header({ onRefresh, loading }: { onRefresh: () => void; loading: boolean }) {
  return (
    <div className="relative overflow-hidden border-b border-white/5 bg-slate-950/50 backdrop-blur">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-6"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/5 ring-1 ring-white/10">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Ações de <span className="text-white">lucasliet</span>
            </h1>
            <p className="text-xs text-slate-400">Interface moderna com animações e filtros em tempo real</p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-medium text-slate-200 transition hover:bg-white/10 active:scale-95 disabled:opacity-50 h-10 whitespace-nowrap"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </button>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.8 }}
        className="pointer-events-none absolute inset-0 -z-10 select-none"
      >
        <div className="absolute -top-24 right-0 h-64 w-64 rotate-12 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute -left-24 top-10 h-64 w-64 -rotate-12 rounded-full bg-indigo-500/20 blur-3xl" />
      </motion.div>
    </div>
  );
}

function Toolbar({
  query,
  onQuery,
  filterKey,
  onFilterKey,
  filterKeys,
  sort,
  onSort,
  view,
  onView,
  total,
}: {
  query: string;
  onQuery: (q: string) => void;
  filterKey: string;
  onFilterKey: (k: string) => void;
  filterKeys: string[];
  sort: string;
  onSort: (s: string) => void;
  view: string;
  onView: (v: string) => void;
  total: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-10 -mx-4 mb-6 bg-slate-950/70 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full items-center gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Buscar ações..."
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-10 pr-3 text-sm outline-none ring-white/10 placeholder:text-slate-500 focus:ring"
            />
          </div>
          <div className="relative">
            <Select
              value={filterKey}
              onChange={onFilterKey}
              label={
                <span className="inline-flex items-center gap-2">
                  <Filter className="h-4 w-4" /> Campo
                </span>
              }
            >
              {filterKeys.map((k) => (
                <Option key={k} value={k} />
              ))}
            </Select>
          </div>
          <div className="relative">
            <Select
              value={sort}
              onChange={onSort}
              label={
                <span className="inline-flex items-center gap-2">
                  <Code2 className="h-4 w-4" /> Ordenar
                </span>
              }
            >
              <Option value="default" label="Padrão" />
              <Option value="name" label="Nome (A→Z)" />
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">{total} ação(ões)</span>
          <Toggle value={view} onChange={onView} />
        </div>
      </div>
    </motion.div>
  );
}

function StockGrid({ stocks }: { stocks: Stock[] }) {
  return (
    <motion.ul
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {stocks.map((stock, idx) => (
        <Card key={idx} stock={stock} />
      ))}
    </motion.ul>
  );
}

function StockList({ stocks }: { stocks: Stock[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <ul className="divide-y divide-white/5">
        {stocks.map((stock, idx) => (
          <Row key={idx} stock={stock} />
        ))}
      </ul>
    </div>
  );
}

function Row({ stock }: { stock: Stock }) {
  const keys = Object.keys(stock);
  const values = Object.values(stock);
  const ticker = values[0];

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="group grid grid-cols-12 items-center gap-3 bg-white/[0.02] px-4 py-4 hover:bg-white/[0.04]"
    >
      <div className="col-span-3 flex min-w-0 items-center gap-3">
        <span className="truncate font-medium tracking-tight">{ticker}</span>
      </div>
      <div className="col-span-7 grid grid-cols-3 gap-2 text-xs text-slate-300">
        {values.slice(1, 4).map((val, i) => (
          <div key={i} className="truncate">
            <span className="text-slate-500">{keys[i + 1]}: </span>
            {val}
          </div>
        ))}
      </div>
      <div className="col-span-2 flex justify-end">
        <a
          href={`https://fundamentus.com.br/detalhes.php?papel=${ticker}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm text-sky-300 hover:underline"
        >
          Abrir <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </motion.li>
  );
}

function Card({ stock }: { stock: Stock }) {
  const keys = Object.keys(stock);
  const values = Object.values(stock);
  const ticker = values[0];

  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      whileHover={{ y: -3 }}
      className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-5 shadow-2xl shadow-black/40 ring-1 ring-white/5"
    >
      <a
        href={`https://fundamentus.com.br/detalhes.php?papel=${ticker}`}
        target="_blank"
        rel="noreferrer"
        className="absolute inset-0"
        aria-label={`Abrir ${ticker}`}
      />
      <div className="mb-3 flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 ring-1 ring-white/10">
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold tracking-tight text-white/90 group-hover:text-white">
            {ticker}
          </h3>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" /> Ação
            </span>
          </div>
        </div>
      </div>
      <div className="space-y-1 text-sm text-slate-300/90">
        {keys.slice(1, 6).map((key, i) => (
          <p key={i} className="truncate">
            <span className="text-slate-500">{key}:</span> {values[i + 1]}
          </p>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {keys.slice(0, 3).map((key) => (
          <Badge key={key}>{key}</Badge>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-fuchsia-500/10 via-indigo-500/0 to-sky-500/10"
      />
    </motion.li>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="break-words rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
      {children}
    </span>
  );
}

function Select({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const selected = React.Children.toArray(children).find(
    (c: any) => c.props.value === value
  ) as any;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-slate-200 hover:bg-white/10 whitespace-nowrap"
      >
        {label}
        <span className="text-slate-400 truncate max-w-[140px]">
          {selected?.props?.label || value}
        </span>
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.ul
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-20 mt-2 min-w-[220px] max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-slate-900/95 p-1 shadow-2xl backdrop-blur"
          >
            {React.Children.map(children, (child: any) => (
              <li>
                <button
                  onClick={() => {
                    onChange(child.props.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-white/5 ${
                    value === child.props.value ? "text-white" : "text-slate-300"
                  }`}
                >
                  <span>{child.props.label || child.props.value}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Option({ value, label }: { value: string; label?: string }) {
  return <span data-value={value} data-label={label} className="hidden" />;
}

function Toggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
      <button
        onClick={() => onChange("cards")}
        className={`rounded-lg px-3 py-1.5 text-xs ${
          value === "cards" ? "bg-white/10 text-white" : "text-slate-300"
        }`}
      >
        Cards
      </button>
      <button
        onClick={() => onChange("list")}
        className={`rounded-lg px-3 py-1.5 text-xs ${
          value === "list" ? "bg-white/10 text-white" : "text-slate-300"
        }`}
      >
        Lista
      </button>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="h-40 animate-pulse rounded-2xl bg-white/5" />
      ))}
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="mt-10 grid place-items-center rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
      <p className="mb-4 text-sm text-slate-300">Nenhuma ação encontrada com os filtros atuais.</p>
      <button
        onClick={onReset}
        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
      >
        Limpar filtros
      </button>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mx-auto mt-12 max-w-7xl px-4 pb-10 text-xs text-slate-500">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2">
          <TrendingUp className="h-4 w-4" /> Dados em tempo real da API do Fundamentus
        </span>
        <a
          href="https://fundamentus.com.br"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-slate-300 hover:underline"
        >
          Ver site <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </footer>
  );
}

function sortStocks(stocks: Stock[], key: string): Stock[] {
  if (key === "name") {
    return [...stocks].sort((a, b) => {
      const nameA = String(Object.values(a)[0] || "");
      const nameB = String(Object.values(b)[0] || "");
      return nameA.localeCompare(nameB);
    });
  }
  return stocks;
}
