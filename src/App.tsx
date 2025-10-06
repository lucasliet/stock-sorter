import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ExternalLink,
  LayoutGrid,
  RefreshCcw,
  Search,
  Sparkles,
  Table,
  TrendingUp
} from 'lucide-react';

type Stock = Record<string, string | number>;

type SortDirection = 'asc' | 'desc';

type ViewMode = 'cards' | 'table';

const STOCKS_CACHE_KEY = 'stock-sorter:stocks';
const STOCKS_CACHE_TTL = 5 * 60 * 1000;

/**
 * Modern stock explorer dashboard that fetches fundamentals and renders animated layouts.
 * Maintains sorting, filtering, and navigation to Fundamentus while offering multiple views.
 */
export default function App(): JSX.Element {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [view, setView] = useState<ViewMode>('table');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchStocks();
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const filteredStocks = useMemo(
    () => filterStocks(stocks, query),
    [stocks, query]
  );

  const sortedStocks = useMemo(
    () => sortStocks(filteredStocks, sortColumn, sortDirection),
    [filteredStocks, sortColumn, sortDirection]
  );

  const columns = useMemo(
    () => getColumns(sortedStocks),
    [sortedStocks]
  );

  const skeletonColumns = useMemo(
    () => getSkeletonColumns(columns),
    [columns]
  );

  /**
   * Requests fundamentals data, reusing sessionStorage cache unless explicitly bypassed.
   * Aborts any inflight request before starting a new one to avoid race conditions.
   * @param bypassCache Indicates whether the cache should be ignored.
   */
  const fetchStocks = (bypassCache = false): void => {
    if (!bypassCache) {
      const cachedStocks = readStocksCache();
      if (cachedStocks) {
        setError('');
        setStocks(cachedStocks);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    setError('');
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    fetch('https://fundamentus-parser.deno.dev/', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Fundamentus API ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          const stocksPayload = data as Stock[];
          setStocks(stocksPayload);
          writeStocksCache(stocksPayload);
        } else {
          setStocks([]);
          removeStocksCache();
        }
      })
      .catch((cause) => {
        if ((cause as { name?: string }).name === 'AbortError') {
          return;
        }
        const message = cause instanceof Error ? cause.message : 'Não foi possível carregar os dados';
        setError(message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  /**
   * Updates sorting preferences based on a selected column, supporting toggle and clear.
   * @param column Column key selected by the user.
   */
  const handleSort = (column: string): void => {
    if (column !== sortColumn) {
      setSortColumn(column);
      setSortDirection('asc');
      return;
    }
    if (sortDirection === 'desc') {
      setSortColumn('');
      setSortDirection('asc');
      return;
    }
    setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
  };

  /**
   * Resets filters and sorting to their initial state.
   */
  const handleReset = (): void => {
    setQuery('');
    setSortColumn('');
    setSortDirection('asc');
  };

  return (
    <div className="relative min-h-screen text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10 select-none">
        <div className="absolute -top-24 right-0 h-64 w-64 rotate-12 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute -left-24 top-10 h-64 w-64 -rotate-12 rounded-full bg-indigo-500/20 blur-3xl" />
      </div>
      <Header onRefresh={() => fetchStocks(true)} loading={loading} />
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10">
        <Toolbar
          query={query}
          total={sortedStocks.length}
          onQuery={setQuery}
          view={view}
          onView={setView}
        />
        <AnimatePresence>{error ? <ErrorBanner message={error} /> : null}</AnimatePresence>
        {loading ? (
          view === 'cards' ? (
            <SkeletonGrid />
          ) : (
            <SkeletonTable columns={skeletonColumns} />
          )
        ) : sortedStocks.length === 0 ? (
          <EmptyState onReset={handleReset} />
        ) : view === 'cards' ? (
          <StocksGrid stocks={sortedStocks} />
        ) : (
          <StocksTable
            stocks={sortedStocks}
            columns={columns}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        )}
      </main>
      <FooterSection />
    </div>
  );
}

/**
 * Displays header with branding, intro copy, and a refresh action.
 * @param props.loading Indicates whether the data is being fetched.
 * @param props.onRefresh Callback triggered when the user requests a refresh.
 */
function Header(props: { loading: boolean; onRefresh: () => void }): JSX.Element {
  const { loading, onRefresh } = props;
  return (
    <div className="relative border-b border-white/5 backdrop-blur">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-4">
          <img src="vite.svg" alt="Stock Sorter" className="h-16 w-16 sm:h-20 sm:w-20" />
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
              <Sparkles className="h-3.5 w-3.5" />
              Radar de oportunidades
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Stock Sorter
            </h1>
            <p className="max-w-2xl text-sm text-slate-400">
              Explore indicadores do Fundamentus com filtros em tempo real, animações suaves e uma experiência focada em desempenho.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar dados
        </button>
      </motion.div>
    </div>
  );
}

/**
 * Renders the toolbar with search field, view toggle, and summary.
 * @param props.query Current text filter value.
 * @param props.total Number of items after filtering.
 * @param props.onQuery Handler to update search input.
 * @param props.view Selected visualization mode.
 * @param props.onView Handler to switch visualization mode.
 */
function Toolbar(props: {
  query: string;
  total: number;
  onQuery: (value: string) => void;
  view: ViewMode;
  onView: (mode: ViewMode) => void;
}): JSX.Element {
  const { query, total, onQuery, view, onView } = props;
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-10 -mx-4 mb-8 px-4 py-4 backdrop-blur"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-lg">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Buscar por papel, indicador ou valor"
            className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-white/20 focus:bg-white/10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300">
            <TrendingUp className="h-4 w-4" />
            {total} resultado(s)
          </span>
          <ViewToggle value={view} onChange={onView} />
        </div>
      </div>
    </motion.section>
  );
}

/**
 * Switches between cards and table visualizations.
 * @param props.value Current selected mode.
 * @param props.onChange Callback to update mode.
 */
function ViewToggle(props: { value: ViewMode; onChange: (mode: ViewMode) => void }): JSX.Element {
  const { value, onChange } = props;
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
      <button
        type="button"
        onClick={() => onChange('cards')}
        className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
          value === 'cards' ? 'bg-white/15 text-white' : 'text-slate-300'
        }`}
      >
        <LayoutGrid className="h-4 w-4" />
        Cards
      </button>
      <button
        type="button"
        onClick={() => onChange('table')}
        className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
          value === 'table' ? 'bg-white/15 text-white' : 'text-slate-300'
        }`}
      >
        <Table className="h-4 w-4" />
        Tabela
      </button>
    </div>
  );
}

/**
 * Shows the grid view with animated cards for each stock.
 * @param props.stocks Collection of stocks to display.
 */
function StocksGrid(props: { stocks: Stock[] }): JSX.Element {
  const { stocks } = props;
  return (
    <motion.ul
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      {stocks.map((stock, index) => (
        <StockCard key={`${getStockId(stock)}-${index}`} stock={stock} />
      ))}
    </motion.ul>
  );
}

/**
 * Presents core stock details inside an animated glassmorphism card.
 * @param props.stock Stock entry to render.
 */
function StockCard(props: { stock: Stock }): JSX.Element {
  const { stock } = props;
  const entries = Object.entries(stock);
  const primaryEntry = entries[0];

  const metricsToShow = ['Cotação', 'P/L', 'P/VP', 'Div.Yield', 'graham', 'DY', 'upside'];
  const metrics = metricsToShow
    .map(label => [label, stock[label]])
    .filter(([_, value]) => value !== undefined);

  const detailUrl = getStockLink(stock);
  return (
    <motion.li
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.35 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/40"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400">
            {primaryEntry ? primaryEntry[0] : 'Ativo'}
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-white">
            {primaryEntry ? String(primaryEntry[1]) : '--'}
          </p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-sky-200">
          <Sparkles className="h-5 w-5" />
        </span>
      </div>
      <ul className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-300">
        {metrics.map(([label, value]) => (
          <li key={label} className="flex flex-col gap-1 rounded-xl border border-white/5 bg-white/5 px-3 py-2">
            <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
            <span className="font-semibold text-white/90">{String(value ?? '--')}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
        <span className="inline-flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Dados em tempo real
        </span>
        <a
          href={detailUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-slate-200 transition hover:bg-white/10"
        >
          Ver detalhes
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      <motion.div
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-fuchsia-500/20 via-transparent to-sky-500/20"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
    </motion.li>
  );
}

/**
 * Outputs a responsive table with sortable headers and hover interactions.
 * @param props.stocks Stock entries to render in table form.
 * @param props.columns Ordered list of column keys.
 * @param props.sortColumn Currently active column for sorting.
 * @param props.sortDirection Direction applied to the active sort column.
 * @param props.onSort Handler to change the sort column.
 */
function StocksTable(props: {
  stocks: Stock[];
  columns: string[];
  sortColumn: string;
  sortDirection: SortDirection;
  onSort: (column: string) => void;
}): JSX.Element {
  const { stocks, columns, sortColumn, sortDirection, onSort } = props;
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.04]">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/10 text-xs uppercase tracking-wide text-slate-300">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onSort(column)}
                  className="flex w-full items-center gap-2 text-left font-semibold text-white/80 transition hover:text-white"
                >
                  <span className="truncate">{column}</span>
                  {sortColumn !== column ? (
                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  ) : sortDirection === 'asc' ? (
                    <ArrowUp className="h-3.5 w-3.5 text-slate-200" />
                  ) : (
                    <ArrowDown className="h-3.5 w-3.5 text-slate-200" />
                  )}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 text-slate-200">
          {stocks.map((stock, index) => {
            const rowKey = `${getStockId(stock)}-${index}`;
            const detailUrl = getStockLink(stock);
            return (
              <tr
                key={rowKey}
                className="cursor-pointer bg-white/[0.01] transition hover:bg-white/[0.06]"
                onClick={() => {
                  window.open(detailUrl, '_blank', 'noreferrer');
                }}
              >
                {columns.map((column) => (
                  <td key={`${rowKey}-${column}`} className="px-4 py-3 text-xs text-slate-300">
                    {String(stock[column] ?? '--')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Renders a shimmer surface placeholder block.
 * @param props.className Optional tailwind classes to customize the block.
 * @returns Placeholder element with shimmer animation.
 */
function SkeletonSurface(props: { className?: string }): JSX.Element {
  const { className } = props;
  return <span className={`shimmer-surface ${className ?? ''}`} aria-hidden="true" />;
}

/**
 * Provides shimmer placeholders while data loads from the API.
 */
function SkeletonGrid(): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 9 }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <SkeletonSurface className="h-2 w-16 rounded-full opacity-70" />
              <SkeletonSurface className="h-6 w-32 rounded-lg opacity-90" />
            </div>
            <SkeletonSurface className="h-10 w-10 rounded-xl opacity-80" />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, metricIndex) => (
              <div key={metricIndex} className="rounded-xl border border-white/5 bg-white/5 px-3 py-2">
                <SkeletonSurface className="mb-2 h-2 w-16 rounded-full opacity-70" />
                <SkeletonSurface className="h-3 w-full rounded-md opacity-90" />
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <SkeletonSurface className="h-3 w-32 rounded-md opacity-90" />
            <SkeletonSurface className="h-3 w-24 rounded-md opacity-80" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Provides shimmer placeholders for the table layout while data loads from the API.
 * @param props.columns Column keys used to adapt the skeleton layout.
 * @returns Table placeholder for the loading state.
 */
function SkeletonTable(props: { columns: string[] }): JSX.Element {
  const { columns } = props;
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-white/10 text-xs uppercase tracking-wide text-slate-300">
          <tr>
            {columns.map((column, index) => (
              <th key={`${column}-${index}`} className="px-4 py-3">
                <SkeletonSurface className="h-3.5 w-3/4 rounded-md opacity-90" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 text-slate-200">
          {Array.from({ length: 8 }).map((_, rowIndex) => (
            <tr key={`skeleton-row-${rowIndex}`} className="bg-white/[0.01]">
              {columns.map((column, columnIndex) => (
                <td key={`skeleton-cell-${rowIndex}-${column}-${columnIndex}`} className="px-4 py-3">
                  <SkeletonSurface className="h-3 w-full rounded-md opacity-80" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Shows a friendly message when filters return no entries.
 * @param props.onReset Handler to clear filters and sorting.
 */
function EmptyState(props: { onReset: () => void }): JSX.Element {
  const { onReset } = props;
  return (
    <div className="mt-12 grid place-items-center rounded-2xl border border-white/10 bg-white/[0.03] p-12 text-center text-sm text-slate-300">
      <p className="max-w-md text-balance">
        Nenhum ativo corresponde aos filtros atuais. Ajuste a busca ou limpe a seleção para explorar novas oportunidades.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
      >
        Limpar filtros
      </button>
    </div>
  );
}

/**
 * Displays API error feedback with subtle animation.
 * @param props.message Error content to show the user.
 */
function ErrorBanner(props: { message: string }): JSX.Element {
  const { message } = props;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200"
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        <span>Ocorreu um erro ao carregar os dados:</span>
        <span className="font-semibold">{message}</span>
      </div>
    </motion.div>
  );
}

/**
 * Renders footer inviting users to visitar Fundamentus and revisit API source.
 */
function FooterSection(): JSX.Element {
  return (
    <footer className="mx-auto max-w-7xl px-4 pb-12 text-xs text-slate-500">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Dados fornecidos pela API pública Fundamentus Parser
        </span>
        <a
          href="https://fundamentus.com.br/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-slate-300 transition hover:text-slate-100"
        >
          Acessar Fundamentus
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </footer>
  );
}

/**
 * Retrieves cached stocks from sessionStorage respecting expiration.
 * @returns Cached stocks or null when unavailable.
 */
function readStocksCache(): Stock[] | null {
  if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(STOCKS_CACHE_KEY);
    if (!raw) {
      return null;
    }
    const payload = JSON.parse(raw) as { timestamp?: number; stocks?: Stock[] };
    if (typeof payload.timestamp !== 'number' || !Array.isArray(payload.stocks)) {
      removeStocksCache();
      return null;
    }
    if (Date.now() - payload.timestamp > STOCKS_CACHE_TTL) {
      removeStocksCache();
      return null;
    }
    return payload.stocks as Stock[];
  } catch {
    removeStocksCache();
    return null;
  }
}

/**
 * Saves stocks into sessionStorage cache alongside timestamp metadata.
 * @param stocks Stocks to persist.
 */
function writeStocksCache(stocks: Stock[]): void {
  if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') {
    return;
  }
  try {
    const payload = JSON.stringify({ timestamp: Date.now(), stocks });
    window.sessionStorage.setItem(STOCKS_CACHE_KEY, payload);
  } catch {
    removeStocksCache();
  }
}

/**
 * Removes the cached stocks entry from sessionStorage.
 */
function removeStocksCache(): void {
  if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') {
    return;
  }
  window.sessionStorage.removeItem(STOCKS_CACHE_KEY);
}

/**
 * Produces a sorted copy of stocks based on column and direction.
 * @param stocks Stocks to sort.
 * @param column Column to use as reference.
 * @param direction Direction to order by.
 * @returns Sorted stocks array.
 */
function sortStocks(stocks: Stock[], column: string, direction: SortDirection): Stock[] {
  if (!column) {
    return [...stocks];
  }
  const isAsc = direction === 'asc';
  return [...stocks].sort((left, right) => {
    const leftValue = normalizeValue(left[column]);
    const rightValue = normalizeValue(right[column]);
    if (leftValue < rightValue) {
      return isAsc ? -1 : 1;
    }
    if (leftValue > rightValue) {
      return isAsc ? 1 : -1;
    }
    return 0;
  });
}

/**
 * Filters stocks by matching query against any value.
 * @param stocks Stocks to filter.
 * @param query Text typed by the user.
 * @returns Filtered stocks respecting the query.
 */
function filterStocks(stocks: Stock[], query: string): Stock[] {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) {
    return stocks;
  }
  return stocks.filter((stock) =>
    Object.values(stock).some((value) => String(value ?? '').toLowerCase().includes(normalized))
  );
}

/**
 * Collects all keys present across stocks while preserving insertion order.
 * @param stocks Stocks to analyse.
 * @returns Array with column keys.
 */
function getColumns(stocks: Stock[]): string[] {
  const set = new Set<string>();
  stocks.forEach((stock) => {
    Object.keys(stock).forEach((key) => {
      if (!set.has(key)) {
        set.add(key);
      }
    });
  });
  return Array.from(set);
}

/**
 * Resolves columns used for the table skeleton, preserving known order when available.
 * @param columns Columns derived from the current dataset.
 * @returns Columns or fallback placeholders for the skeleton table.
 */
function getSkeletonColumns(columns: string[]): string[] {
  if (columns.length > 0) {
    return columns;
  }
  return Array.from({ length: 8 }, (_, index) => `column-${index + 1}`);
}

/**
 * Builds the Fundamentus detail URL for a given stock.
 * @param stock Stock entry to derive the URL from.
 * @returns URL pointing to Fundamentus details.
 */
function getStockLink(stock: Stock): string {
  const identifier = Object.values(stock)[0];
  if (typeof identifier === 'string' && identifier.trim().length > 0) {
    return `https://fundamentus.com.br/detalhes.php?papel=${identifier}`;
  }
  if (typeof identifier === 'number') {
    return `https://fundamentus.com.br/detalhes.php?papel=${identifier}`;
  }
  return 'https://fundamentus.com.br/';
}

/**
 * Derives a stable identifier for rendering list keys.
 * @param stock Stock entry that needs a key.
 * @returns Identifier string for React list rendering.
 */
function getStockId(stock: Stock): string {
  const identifier = Object.values(stock)[0];
  if (typeof identifier === 'string' && identifier.trim().length > 0) {
    return identifier;
  }
  if (typeof identifier === 'number') {
    return String(identifier);
  }
  return JSON.stringify(stock);
}

/**
 * Normalizes values for sorting, converting formatted numbers when possible.
 * @param value Value to normalize.
 * @returns Comparable primitive for sorting logic.
 */
function normalizeValue(value: string | number | undefined): number | string {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const numericCandidate = trimmed.replace(/[^\d,.\-]/g, '');
    if (numericCandidate.length > 0) {
      const hasComma = numericCandidate.includes(',');
      const hasDot = numericCandidate.includes('.');
      const dotCount = (numericCandidate.match(/\./g) ?? []).length;
      let normalized = numericCandidate;
      if (hasComma && hasDot) {
        normalized = normalized.replace(/\./g, '').replace(',', '.');
      } else if (hasComma) {
        normalized = normalized.replace(',', '.');
      } else if (dotCount > 1) {
        normalized = normalized.replace(/\./g, '');
      }
      const parsed = Number(normalized);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return trimmed.toLowerCase();
  }
  return '';
}
