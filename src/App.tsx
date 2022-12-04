import { v4 as uuid } from 'uuid';
import { useEffect, useState } from 'react';

import './App.css'

function App() {
  const [stocks, setStocks] = useState([]);

  useEffect(() => {
   fetch('https://fundamentus-parser.deno.dev/')
      .then(r => r.json())
      .then(r => setStocks(r));
  }, []);

  return (
    <div className="App">
      <div className="table-container">
        {stocks.length > 0 && (
          <table className='table is-striped is-bordered is-hoverable is-narrow'>
            <thead>
              {Object.keys(stocks[0]).map((key: string) => (
                <th key={uuid()}>{key}</th>
              ))}
            </thead>
            <tbody>
              {stocks.map((stock: any) => (
                <tr 
                  key={uuid()} 
                  onClick={() => {window.location.href = `https://fundamentus.com.br/detalhes.php?papel=${Object.values(stock)[0]}`}}
                  className='is-clickable'
                >
                  {Object.values(stock).map((value: any) => (
                    <td key={uuid()}>{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default App
