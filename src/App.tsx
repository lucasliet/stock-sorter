import axios from 'axios'
import { v4 as uuid } from 'uuid';
import { useEffect, useState } from 'react';

import './App.css'

function App() {
  const [stocks, setStocks] = useState([]);

  useEffect(() => {
    axios.get('https://fundamentus-parser-86qx4n52wqvg.deno.dev/')
      .then(res => setStocks(res.data));
  }, []);

  return (
    <div className="App">
      <div className="table-container">
        {stocks.length > 0 && (
          <table className='table is-striped is-bordered is-hoverable'>
            <thead>
              {Object.keys(stocks[0]).map((key: string) => (
                <th key={uuid()}>{key}</th>
              ))}
            </thead>
            <tbody>
              {stocks.map((stock: any) => (
                <tr key={uuid()}>
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
