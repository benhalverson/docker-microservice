import IPCIDR from 'ip-cidr';

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
  indexed: BlocklistIndex;
	lastUpdated: Date | null;
	ready: boolean;
	error?: string;
}

export interface BlocklistIndex {
	ipSet: Set<string>;
	cidrList: Array<{ cidr: IPCIDR; listUrl: string }>;
	ipv6List: Array<{ cidr: string; listUrl: string }>;
}
