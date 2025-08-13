import { v4 as uuid } from 'uuid';
import { useEffect, useMemo, useState } from 'react';

import './App.css'

type Stock = {
  [key: string]: string | number;
};

type SortDirection = 'asc' | 'desc';

function App() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    fetch('https://fundamentus-parser.deno.dev/')
      .then(r => r.json())
      .then(r => setStocks(r));
  }, []);


  const handleSort = (column: string) => {
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
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const sortStocks = (stocks: Stock[], sortColumn: string, sortDirection: SortDirection): Stock[] => {
    if (!sortColumn || !sortDirection) return stocks;
  
    const directionFactor = sortDirection === 'asc' ? -1 : 1;
  
    return [...stocks].sort((a, b) => {
      const valueA = a[sortColumn];
      const valueB = b[sortColumn];
  
      if (valueA < valueB) return directionFactor;
      if (valueA > valueB) return -directionFactor;
      return 0;
    });
  };

 const sortedStocks = useMemo(() => 
  sortStocks(stocks, sortColumn, sortDirection),
  [stocks, sortColumn, sortDirection]);

  return (
    <div className='App'>
      <header className='py-3'>
        <h1 className='is-size-3 has-text-weight-semibold has-text-light'>
          Ações filtradas do fundamentus
        </h1>
      </header>
      <div className='table-container'>
        {sortedStocks.length > 0 && (
          <table className='table is-striped is-bordered is-hoverable is-narrow'>
            <thead>
              {Object.keys(sortedStocks[0]).map((key: string) => (
                <th key={uuid()} onClick={() => handleSort(key)} className='is-clickable'>
                  {key}
                  {sortColumn === key && (
                    <span>{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>
                  )}
                </th>
              ))}
            </thead>
            <tbody>
              {sortedStocks.map((stock: Stock) => (
                <tr
                  key={uuid()}
                  onClick={() => {
                    window.location.href = `https://fundamentus.com.br/detalhes.php?papel=${Object.values(stock)[0]}`;
                  }}
                  className='is-clickable'
                >
                  {Object.values(stock).map((value: string | number) => (
                    <td key={uuid()}>{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default App
