import  IPCIDR  from "ip-cidr";

// Trie node for IPv4 CIDRs
class TrieNode {
  children: Map<number, TrieNode> = new Map();
  listUrl?: string;
}

export class CIDRTrie {
  private root: TrieNode = new TrieNode();

  insert(cidr: IPCIDR, listUrl: string) {
    const [ip, prefixLength] = cidr.toString().split("/");
    const bits = parseInt(prefixLength, 10);
    const ipNum = ip.split(".").map(Number);
    let node = this.root;
    let bitIndex = 0;
    for (let i = 0; i < 4 && bitIndex < bits; i++) {
      for (let j = 7; j >= 0 && bitIndex < bits; j--, bitIndex++) {
        const bit = (ipNum[i] >> j) & 1;
        if (!node.children.has(bit)) {
          node.children.set(bit, new TrieNode());
        }
        node = node.children.get(bit)!;
      }
    }
    node.listUrl = listUrl;
  }

  lookup(ip: string): string | undefined {
    const ipNum = ip.split(".").map(Number);
    let node = this.root;
    let foundUrl: string | undefined;
    for (let i = 0; i < 4; i++) {
      for (let j = 7; j >= 0; j--) {
        const bit = (ipNum[i] >> j) & 1;
        if (!node.children.has(bit)) return foundUrl;
        node = node.children.get(bit)!;
        if (node.listUrl) foundUrl = node.listUrl;
      }
    }
    return foundUrl;
  }
}

// For IPv6, use a similar approach or a library like ip6-tree for better performance.
