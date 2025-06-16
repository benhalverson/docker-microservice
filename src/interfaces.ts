export interface FireHolFile {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size: string;
  url: string;
}

export interface BlocklistEntry {
	cidr: string;
	isIPv6: boolean;
	listUrl: string;
}

export interface BlocklistCache {
	entries: BlocklistEntry[];
	lastUpdated: Date | null;
	ready: boolean;
	error?: string;
}