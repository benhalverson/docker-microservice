import IPCIDR from "ip-cidr";
import {
  BlocklistCache,
  BlocklistIndex,
} from "./interfaces";
import { getData, readData } from "./utils";
import { CIDRTrie } from "./cidrTrie";
import { IPv6Trie } from "./ipv6Trie";

const blocklistCache: BlocklistCache & {
  cidrTrie?: CIDRTrie;
  ipv6Trie?: IPv6Trie;
} = {
  indexed: {
	ipSet: new Set(),
	cidrList: [],
	ipv6List: [],
  },
  lastUpdated: null,
  ready: false,
  cidrTrie: undefined,
  ipv6Trie: undefined,
};

async function loadBlocklists(): Promise<void> {
  try {
	const lists = await getData();
	const seen = new Set<string>();
	const ipSet = new Set<string>();
	const cidrList: BlocklistIndex["cidrList"] = [];
	const ipv6List: BlocklistIndex["ipv6List"] = [];
	const cidrTrie = new CIDRTrie();
	const ipv6Trie = new IPv6Trie();

	const allLines = await Promise.all(lists.map(readData));

	lists.forEach((list, idx) => {
	  const lines = allLines[idx] || [];
	  for (const raw of lines) {
		const line = raw.trim();
		if (!line || seen.has(line)) continue;
		seen.add(line);

		const listUrl = `https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/${list.path}`;
		if (line.includes(":")) {
		  ipv6List.push({ cidr: line, listUrl });
		  // Insert into IPv6 trie
		  try {
			ipv6Trie.insert(line, listUrl);
		  } catch (e) {
			// Ignore malformed IPv6
		  }
		} else if (IPCIDR.isValidCIDR(line)) {
		  const cidrObj = new IPCIDR(line);
		  cidrList.push({ cidr: cidrObj, listUrl });
		  // Insert into IPv4 trie
		  try {
			cidrTrie.insert(cidrObj, listUrl);
		  } catch (e) {
			// Ignore malformed IPv4
		  }
		} else {
		  ipSet.add(line);
		}
	  }
	});

	blocklistCache.indexed = { ipSet, cidrList, ipv6List };
	blocklistCache.cidrTrie = cidrTrie;
	blocklistCache.ipv6Trie = ipv6Trie;
	blocklistCache.lastUpdated = new Date();
	blocklistCache.ready = true;
	blocklistCache.error = undefined;

	console.log(
	  `Blocklists loaded: ${ipSet.size + cidrList.length + ipv6List.length} entries from ${lists.length} lists.`
	);
  } catch (err) {
	blocklistCache.ready = false;
	blocklistCache.error =
	  err instanceof Error ? err.message : 'Failed to load blocklists';
	console.error('Error loading blocklists:', err);
  }
}

export { blocklistCache, loadBlocklists };
