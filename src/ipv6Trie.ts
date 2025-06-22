// Simple IPv6 CIDR trie using BigInt for address math
// For production, consider using a library like ip6-tree for more features

interface TrieNodeV6 {
  children: Map<number, TrieNodeV6>;
  listUrl?: string;
}

export class IPv6Trie {
  private root: TrieNodeV6 = { children: new Map() };

  insert(cidr: string, listUrl: string) {
    const [ip, prefixLength] = cidr.split("/");
    const bits = parseInt(prefixLength, 10);
    const ipBigInt = this.ipv6ToBigInt(ip);
    let node = this.root;
    for (let i = 127; i >= 128 - bits; i--) {
      const bit = Number((ipBigInt >> BigInt(i)) & 1n);
      if (!node.children.has(bit)) {
        node.children.set(bit, { children: new Map() });
      }
      node = node.children.get(bit)!;
    }
    node.listUrl = listUrl;
  }

  lookup(ip: string): string | undefined {
    const ipBigInt = this.ipv6ToBigInt(ip);
    let node = this.root;
    let foundUrl: string | undefined;
    for (let i = 127; i >= 0; i--) {
      const bit = Number((ipBigInt >> BigInt(i)) & 1n);
      if (!node.children.has(bit)) return foundUrl;
      node = node.children.get(bit)!;
      if (node.listUrl) foundUrl = node.listUrl;
    }
    return foundUrl;
  }

  private ipv6ToBigInt(ip: string): bigint {
    // Expand and parse IPv6 address
    const parts = ip.split(":");
    let full = [];
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === "") {
        // Expand ::
        const missing = 8 - parts.length + 1;
        for (let j = 0; j < missing; j++) full.push("0");
      } else {
        full.push(parts[i]);
      }
    }
    const hex = full.map((x) => x.padStart(4, "0")).join("");
    return BigInt("0x" + hex);
  }
}
