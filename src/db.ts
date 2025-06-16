import { BlocklistCache, BlocklistEntry, FireHolFile } from "./interfaces";
import { getData, readData } from "./utils";

const blocklistCache: BlocklistCache = {
	entries: [],
	lastUpdated: null,
	ready: false,
};

// In-memory cache for blocklists
// replace with kv store from cloudflare
async function loadBlocklists(): Promise<void> {
	try {
		const lists = await getData(); // FireHolFile[]
		const seen = new Set<string>();
		const entries: BlocklistEntry[] = [];

		// Fetch and process each list in parallel (concurrently)
		const allEntries = await Promise.all(
			lists.map(async (list) => {
				const lines = await readData(list);
				return lines
					.map((line) => line.trim())
					.filter((line) => line && !seen.has(line))
					.map((line) => {
						seen.add(line);
						return {
							cidr: line,
							isIPv6: line.includes(':'),
							listUrl: `https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/${list.path}`,
						} satisfies BlocklistEntry;
					});
			})
		);

		blocklistCache.entries = allEntries.flat();
		blocklistCache.lastUpdated = new Date();
		blocklistCache.ready = true;
		blocklistCache.error = undefined;

		console.log(
			`Blocklists loaded: ${blocklistCache.entries.length} entries from ${lists.length} lists.`
		);
	} catch (err) {
		const message =
			err instanceof Error ? err.message : 'Unknown error loading blocklists';
		blocklistCache.ready = false;
		blocklistCache.error = message;
		console.error('Error loading blocklists:', err);
	}
}
export { blocklistCache, loadBlocklists };
