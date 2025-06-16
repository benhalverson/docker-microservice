import IPCIDR from "ip-cidr";
import {
	BlocklistCache,
	BlocklistIndex,
} from "./interfaces";
import { getData, readData } from "./utils";

const blocklistCache: BlocklistCache = {
	indexed: {
		ipSet: new Set(),
		cidrList: [],
		ipv6List: [],
	},
	lastUpdated: null,
	ready: false,
	entries: [],
};

async function loadBlocklists(): Promise<void> {
	try {
		const lists = await getData();
		const seen = new Set<string>();
		const ipSet = new Set<string>();
		const cidrList: BlocklistIndex["cidrList"] = [];
		const ipv6List: BlocklistIndex["ipv6List"] = [];

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
				} else if (IPCIDR.isValidCIDR(line)) {
					cidrList.push({ cidr: new IPCIDR(line), listUrl });
				} else {
					ipSet.add(line);
				}
			}
		});

		blocklistCache.indexed = { ipSet, cidrList, ipv6List };
		blocklistCache.lastUpdated = new Date();
		blocklistCache.ready = true;
		blocklistCache.error = undefined;

		console.log(
			`Blocklists loaded: ${ipSet.size} cidr: ${cidrList.length} ipv6: ${ipv6List.length} entries from ${lists.length} lists.`
		);
	} catch (err) {
		const msg =
			err instanceof Error ? err.message : "Failed to load blocklists";
		blocklistCache.ready = false;
		blocklistCache.error = msg;
		console.error("Error loading blocklists:", err);
	}
}
export { blocklistCache, loadBlocklists };
