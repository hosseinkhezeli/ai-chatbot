import { tool } from 'ai';
import { z } from 'zod';
import { createMemoryTools } from './memory';

const calculatorSchema = z.object({
  expression: z
    .string()
    .describe('Mathematical expression to evaluate (e.g., "2 + 2", "10 * 5", "(15 + 5) / 4")'),
});

export const calculatorTool = tool({
  description: 'Perform basic arithmetic calculations. Use for math operations.',
  inputSchema: calculatorSchema,
  execute: async ({ expression }: { expression: string }) => {
    try {
      // Safe evaluation: only allow numbers, operators, parentheses, and spaces
      const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
      if (sanitized !== expression) {
        return {
          error:
            'Expression contains invalid characters. Only numbers, +, -, *, /, (, ), and spaces allowed.',
        };
      }

      // Use Function constructor for safe evaluation (no eval)
      const result = new Function(`return ${sanitized}`)();

      if (typeof result !== 'number' || !Number.isFinite(result)) {
        return { error: 'Invalid expression or result is not a finite number.' };
      }

      return { result, expression: sanitized };
    } catch {
      return { error: 'Failed to evaluate expression. Check syntax.' };
    }
  },
});

const dateTimeSchema = z.object({
  operation: z.enum(['now', 'format', 'add', 'diff']).describe('Operation to perform'),
  format: z.string().optional().describe('Output format (e.g., "ISO", "locale", "unix")'),
  date: z.string().optional().describe('Input date (ISO 8601) for format/add/diff operations'),
  amount: z.number().optional().describe('Amount to add (for add operation)'),
  unit: z
    .enum(['seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years'])
    .optional()
    .describe('Time unit for add operation'),
  compareWith: z.string().optional().describe('Second date (ISO 8601) for diff operation'),
});

export const dateTimeTool = tool({
  description:
    'Get current date/time, format dates, add time intervals, or calculate differences between dates.',
  inputSchema: dateTimeSchema,
  execute: async (params: z.infer<typeof dateTimeSchema>) => {
    try {
      const { operation, format = 'ISO', date, amount, unit, compareWith } = params;

      switch (operation) {
        case 'now': {
          const now = new Date();
          return { result: formatDate(now, format), timestamp: now.toISOString() };
        }

        case 'format': {
          if (!date) return { error: 'date parameter required for format operation' };
          const parsed = new Date(date);
          if (isNaN(parsed.getTime())) return { error: 'Invalid date format. Use ISO 8601.' };
          return { result: formatDate(parsed, format) };
        }

        case 'add': {
          if (!date || amount === undefined || !unit) {
            return { error: 'date, amount, and unit required for add operation' };
          }
          const parsed = new Date(date);
          if (isNaN(parsed.getTime())) return { error: 'Invalid date format. Use ISO 8601.' };
          const result = addTime(parsed, amount, unit);
          return { result: formatDate(result, format), timestamp: result.toISOString() };
        }

        case 'diff': {
          if (!date || !compareWith) {
            return { error: 'date and compareWith required for diff operation' };
          }
          const a = new Date(date);
          const b = new Date(compareWith);
          if (isNaN(a.getTime()) || isNaN(b.getTime()))
            return { error: 'Invalid date format. Use ISO 8601.' };
          const diffMs = b.getTime() - a.getTime();
          return {
            milliseconds: diffMs,
            seconds: Math.floor(diffMs / 1000),
            minutes: Math.floor(diffMs / 60000),
            hours: Math.floor(diffMs / 3600000),
            days: Math.floor(diffMs / 86400000),
          };
        }

        default:
          return { error: `Unknown operation: ${operation}` };
      }
    } catch {
      return { error: 'Date/time operation failed. Check input parameters.' };
    }
  },
});

const stringUtilsSchema = z.object({
  operation: z
    .enum(['uppercase', 'lowercase', 'reverse', 'length', 'trim', 'count_words', 'replace'])
    .describe('String operation to perform'),
  text: z.string().describe('Input text to process'),
  search: z.string().optional().describe('Search string for replace operation'),
  replacement: z.string().optional().describe('Replacement string for replace operation'),
});

export const stringUtilsTool = tool({
  description:
    'Perform text transformations: case conversion, reversal, length, word count, or string replacement.',
  inputSchema: stringUtilsSchema,
  execute: async (params: z.infer<typeof stringUtilsSchema>) => {
    try {
      const { operation, text, search, replacement } = params;

      switch (operation) {
        case 'uppercase':
          return { result: text.toUpperCase(), length: text.length };

        case 'lowercase':
          return { result: text.toLowerCase(), length: text.length };

        case 'reverse':
          return { result: text.split('').reverse().join(''), length: text.length };

        case 'length':
          return { result: text.length, characters: text.length };

        case 'trim':
          return { result: text.trim(), length: text.trim().length };

        case 'count_words':
          return {
            result: text.trim().split(/\s+/).filter(Boolean).length,
            words: text.trim().split(/\s+/).filter(Boolean).length,
          };

        case 'replace': {
          if (search === undefined || replacement === undefined) {
            return { error: 'search and replacement required for replace operation' };
          }
          const result = text.split(search).join(replacement);
          return { result, replacements: countOccurrences(text, search) };
        }

        default:
          return { error: `Unknown operation: ${operation}` };
      }
    } catch {
      return { error: 'String operation failed. Check input parameters.' };
    }
  },
});

const webSearchSchema = z.object({
  query: z.string().describe('Search query (e.g., "Next.js 16 release date")'),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe('Maximum number of results to return (default 5)'),
});

export const webSearchTool = tool({
  description:
    'Search the internet for current information, news, documentation, or facts you are unsure about. Returns titles, URLs, and snippets.',
  inputSchema: webSearchSchema,
  execute: async (params: z.infer<typeof webSearchSchema>) => {
    const { query, maxResults = 5 } = params;

    if (!query.trim()) {
      return { error: 'Query cannot be empty.' };
    }

    try {
      // DuckDuckGo's "lite" HTML endpoint — no API key required. It serves a
      // bot-challenge page unless the request looks like a browser, hence the
      // accept headers below. GET (not POST) with the query in the URL.
      const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;

      const response = await fetch(url, {
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        return { error: `Search request failed (HTTP ${response.status}).` };
      }

      const results = parseDuckDuckGoResults(await response.text(), maxResults);

      if (results.length === 0) {
        return { error: 'No results found. Try a different query.' };
      }

      return {
        source: 'external',
        authority: 'none',
        results,
      };
    } catch {
      return { error: 'Search failed. Try again later.' };
    }
  },
});

const baseTools = {
  calculator: calculatorTool,
  dateTime: dateTimeTool,
  stringUtils: stringUtilsTool,
  webSearch: webSearchTool,
} as const;

export function createTools(userId: string) {
  return {
    ...baseTools,
    ...createMemoryTools(userId),
  };
}

export type Tools = ReturnType<typeof createTools>;
export type ToolName = keyof Tools;

function formatDate(date: Date, format: string): string {
  switch (format) {
    case 'ISO':
      return date.toISOString();
    case 'locale':
      return date.toLocaleString();
    case 'unix':
      return String(Math.floor(date.getTime() / 1000));
    case 'date':
      return date.toISOString().split('T')[0];
    default:
      return date.toISOString();
  }
}

function addTime(date: Date, amount: number, unit: string): Date {
  const result = new Date(date);
  switch (unit) {
    case 'seconds':
      result.setSeconds(result.getSeconds() + amount);
      break;
    case 'minutes':
      result.setMinutes(result.getMinutes() + amount);
      break;
    case 'hours':
      result.setHours(result.getHours() + amount);
      break;
    case 'days':
      result.setDate(result.getDate() + amount);
      break;
    case 'weeks':
      result.setDate(result.getDate() + amount * 7);
      break;
    case 'months':
      result.setMonth(result.getMonth() + amount);
      break;
    case 'years':
      result.setFullYear(result.getFullYear() + amount);
      break;
  }
  return result;
}

function countOccurrences(text: string, search: string): number {
  if (!search) return 0;
  return text.split(search).length - 1;
}

type SearchResult = {
  title: string;
  url: string;
  snippet: string;
};

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, '');
}

// DuckDuckGo's lite endpoint returns results as `<a class='result-link'>` +
// `<td class='result-snippet'>` pairs. Links are redirect wrappers with the
// real URL percent-encoded in the `uddg` query param.
function parseDuckDuckGoResults(html: string, maxResults: number): SearchResult[] {
  const snippets: string[] = [];
  const snippetRe = /<td[^>]*class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/g;
  let match: RegExpExecArray | null;
  while ((match = snippetRe.exec(html)) !== null) {
    snippets.push(decodeEntities(stripTags(match[1])).replace(/\s+/g, ' ').trim());
  }

  const results: SearchResult[] = [];
  const linkRe =
    /<a[^>]*href="\/\/duckduckgo\.com\/l\/\?uddg=([^&"]+)[^"]*"[^>]*class=['"]result-link['"][^>]*>([\s\S]*?)<\/a>/g;
  let i = 0;
  while ((match = linkRe.exec(html)) !== null && results.length < maxResults) {
    const snippet = snippets[i] ?? '';
    i += 1;

    let url: string;
    try {
      url = decodeURIComponent(match[1]);
    } catch {
      continue; // malformed percent-encoding — skip this result
    }
    if (!/^https?:\/\//i.test(url)) continue;

    results.push({
      title: decodeEntities(stripTags(match[2])).replace(/\s+/g, ' ').trim(),
      url,
      snippet,
    });
  }
  return results;
}
