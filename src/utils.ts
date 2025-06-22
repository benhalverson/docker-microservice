import { lookup as geoipLookup } from 'geoip-lite';
import pLimit from 'p-limit';
import { FireHolFile } from './interfaces';

const GITHUB_TREE_API =
  'https://api.github.com/repos/firehol/blocklist-ipsets/git/trees/master?recursive=1';
const RAW_BASE_URL =
  'https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/';

const limit = pLimit(10);

async function fetchJson<T>(url: string, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {

      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`);
      return await res.json();
    } catch (err: any) {
      if ((err.name === 'TypeError' || /network/i.test(err.message)) && i < retries - 1) {
        await new Promise((res) => setTimeout(res, 1000));
      } else {
        throw err;
      }
    }
  }
  throw new Error(`Failed to fetch ${url}`);
}

async function fetchText(url: string, retries = 3): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'text/plain',
        },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`);
      return await res.text();
    } catch (err: any) {
      if (err.code === 'EAI_AGAIN' && i < retries - 1) {
        await new Promise((res) => setTimeout(res, 1000));
      } else {
        throw err;
      }
    }
  }
  throw new Error(`Failed to fetch ${url}`);
}

export const getData = async (): Promise<FireHolFile[]> => {
  const data = await fetchJson<{ tree: FireHolFile[] }>(GITHUB_TREE_API);

  return data.tree.filter(
    (f) => f.path.endsWith('.ipset') || f.path.endsWith('.netset')
  );
};

export const readData = async (file: FireHolFile): Promise<string[]> => {
  try {
    const text = await limit(() =>
      fetchText(`${RAW_BASE_URL}${file.path}`)
    );

    console.log('text:', text);

    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
  } catch (err: any) {
    console.error(`Failed to read ${file.path}: ${err.message}`);
    return [];
  }
};

export const getIPLocationInfo = async (ip: string) => {
  const info = geoipLookup(ip);
  console.log('geoipLookup:', info);
  return info
    ? {
        region: info.region,
        country: info.country,
        timezone: info.timezone,
      }
    : 'no data found';
};
