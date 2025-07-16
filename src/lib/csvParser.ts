import Papa from 'papaparse';

export interface OptionsFlowRecord {
  time_of_trade: string;
  ticker_symbol: string;
  premium: number;
  option_type: string;
  trade_type: string;
  score?: number;
  spot_price?: number;
  strike_price?: number;
  implied_volatility?: number;
  open_interest?: number;
}

export interface ParseResult {
  success: boolean;
  data: OptionsFlowRecord[];
  errors: string[];
  totalRecords: number;
}

// Map common CSV header variations to our standard field names
const HEADER_MAPPING: Record<string, string> = {
  // Time variations
  'time_of_trade': 'time_of_trade',
  'time': 'time_of_trade',
  'timestamp': 'time_of_trade',
  'trade_time': 'time_of_trade',
  
  // Ticker variations
  'tickersymbol': 'ticker_symbol',
  'ticker_symbol': 'ticker_symbol',
  'ticker': 'ticker_symbol',
  'symbol': 'ticker_symbol',
  
  // Premium variations
  'premium': 'premium',
  'option_premium': 'premium',
  'trade_premium': 'premium',
  
  // Option type variations
  'optiontype': 'option_type',
  'option_type': 'option_type',
  'type': 'option_type',
  'call_put': 'option_type',
  
  // Trade type variations
  'tradetype': 'trade_type',
  'trade_type': 'trade_type',
  'side': 'trade_type',
  'buy_sell': 'trade_type',
  
  // Score variations
  'score': 'score',
  'flow_score': 'score',
  'bullflow_score': 'score',
  
  // Spot price variations
  'spotprice': 'spot_price',
  'spot_price': 'spot_price',
  'underlying_price': 'spot_price',
  'stock_price': 'spot_price',
  
  // Strike price variations
  'strikeprice': 'strike_price',
  'strike_price': 'strike_price',
  'strike': 'strike_price',
  
  // IV variations
  'impliedvolatility': 'implied_volatility',
  'implied_volatility': 'implied_volatility',
  'iv': 'implied_volatility',
  'volatility': 'implied_volatility',
  
  // Open interest variations
  'openinterest': 'open_interest',
  'open_interest': 'open_interest',
  'oi': 'open_interest',
};

function normalizeHeaders(headers: string[]): string[] {
  return headers.map(header => {
    const normalized = header.toLowerCase().trim().replace(/\s+/g, '_');
    return HEADER_MAPPING[normalized] || normalized;
  });
}

function parseNumericValue(value: string | number): number | undefined {
  if (typeof value === 'number') return value;
  if (!value || value === '') return undefined;
  
  // Remove common formatting (commas, dollar signs, etc.)
  const cleanValue = value.toString().replace(/[$,\s]/g, '');
  const parsed = parseFloat(cleanValue);
  
  return isNaN(parsed) ? undefined : parsed;
}

function normalizeOptionType(value: string): string {
  const normalized = value.toLowerCase().trim();
  if (normalized.includes('call') || normalized === 'c') return 'call';
  if (normalized.includes('put') || normalized === 'p') return 'put';
  return normalized;
}

function normalizeTradeType(value: string): string {
  const normalized = value.toLowerCase().trim();
  // Handle common trade type variations
  if (normalized.includes('buy') || normalized === 'b') return 'buy';
  if (normalized.includes('sell') || normalized === 's') return 'sell';
  // For BullFlow data, BLOCK and SWEEP are valid trade types
  if (normalized === 'block' || normalized === 'sweep') return normalized;
  return normalized;
}

function parseDateTime(value: string): string {
  try {
    // Check if it's just time format (HH:MM:SS)
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(value.trim())) {
      // If it's just time, assume it's today's date
      const today = new Date();
      const [hours, minutes, seconds] = value.trim().split(':').map(Number);
      today.setHours(hours, minutes, seconds, 0);
      return today.toISOString();
    }
    
    // Try to parse various date formats
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    return date.toISOString();
  } catch {
    // If parsing fails, create a timestamp with today's date and the provided time
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(value.trim())) {
      const today = new Date();
      const [hours, minutes, seconds] = value.trim().split(':').map(Number);
      today.setHours(hours, minutes, seconds, 0);
      return today.toISOString();
    }
    // Last resort: return current timestamp
    return new Date().toISOString();
  }
}

export function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const errors: string[] = [];
    let totalRecords = 0;

    console.log('Starting CSV parse for file:', file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // Keep everything as strings initially
      transform: (value: string) => {
        // Clean up values
        return value ? value.toString().trim() : '';
      },
      complete: (results) => {
        console.log('CSV parsing complete. Raw results:', results);
        console.log('Headers found:', results.meta?.fields);
        
        totalRecords = results.data.length;
        const validRecords: OptionsFlowRecord[] = [];

        // First, let's map the headers properly
        const headerMapping: Record<string, string> = {};
        if (results.meta?.fields) {
          results.meta.fields.forEach(header => {
            const normalized = header.toLowerCase().trim().replace(/\s+/g, '_');
            const mappedHeader = HEADER_MAPPING[normalized] || normalized;
            headerMapping[header] = mappedHeader;
            console.log(`Header mapping: "${header}" -> "${mappedHeader}"`);
          });
        }

        results.data.forEach((rawRow: Record<string, unknown>, index: number) => {
          try {
            // Map the raw row to our normalized field names
            const row: Record<string, unknown> = {};
            Object.keys(rawRow).forEach(originalHeader => {
              const mappedHeader = headerMapping[originalHeader] || originalHeader;
              row[mappedHeader] = rawRow[originalHeader];
            });

            console.log(`Row ${index + 1} mapped data:`, row);

            // Check for required fields
            if (!row.time_of_trade || !row.ticker_symbol || !row.premium || !row.option_type || !row.trade_type) {
              const missingFields = [];
              if (!row.time_of_trade) missingFields.push('time_of_trade');
              if (!row.ticker_symbol) missingFields.push('ticker_symbol');
              if (!row.premium) missingFields.push('premium');
              if (!row.option_type) missingFields.push('option_type');
              if (!row.trade_type) missingFields.push('trade_type');
              
              errors.push(`Row ${index + 1}: Missing required fields: ${missingFields.join(', ')}`);
              return;
            }

            const record: OptionsFlowRecord = {
              time_of_trade: parseDateTime(row.time_of_trade),
              ticker_symbol: row.ticker_symbol.toString().toUpperCase().trim(),
              premium: parseNumericValue(row.premium) || 0,
              option_type: normalizeOptionType(row.option_type),
              trade_type: normalizeTradeType(row.trade_type),
              score: parseNumericValue(row.score),
              spot_price: parseNumericValue(row.spot_price),
              strike_price: parseNumericValue(row.strike_price),
              implied_volatility: parseNumericValue(row.implied_volatility),
              open_interest: parseNumericValue(row.open_interest),
            };

            // Validate option_type and trade_type
            if (!['call', 'put', 'c', 'p'].includes(record.option_type.toLowerCase())) {
              errors.push(`Row ${index + 1}: Invalid option_type "${record.option_type}" (must be "call", "put", "c", or "p")`);
              return;
            }

            if (!['buy', 'sell', 'block', 'sweep'].includes(record.trade_type.toLowerCase())) {
              errors.push(`Row ${index + 1}: Invalid trade_type "${record.trade_type}" (must be "buy", "sell", "block", or "sweep")`);
              return;
            }

            validRecords.push(record);
          } catch (error) {
            errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : 'Unknown parsing error'}`);
          }
        });

        // Add Papa Parse errors
        if (results.errors && results.errors.length > 0) {
          results.errors.forEach(error => {
            errors.push(`Parse error: ${error.message} (row ${error.row})`);
          });
        }

        resolve({
          success: validRecords.length > 0,
          data: validRecords,
          errors,
          totalRecords,
        });
      },
      error: (error) => {
        resolve({
          success: false,
          data: [],
          errors: [`Failed to parse CSV: ${error.message}`],
          totalRecords: 0,
        });
      }
    });
  });
}