import express, { Request, Response } from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import { getIPLocationInfo } from "./utils";
import { blocklistCache, loadBlocklists } from "./db";

const IPCIDR = require("ip-cidr").default;
const ip6 = require("ip6");
const validate = require("ip-validator");
const net = require("net");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
if (process.env.NODE_ENV === "development") {
	app.use(morgan("dev"));
} else {
	app.use(morgan("combined"));
}
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(helmet());

// Load blocklists at startup and refresh periodically
loadBlocklists();
setInterval(loadBlocklists, 6 * 60 * 60 * 1000);

// Routes
app.get("/", (_req: Request, res: Response) => {
  res.send("You need to provide an IP address or CIDR to use this service.");
});

app.get("/healthcheck", (req: Request, res: Response) => {
  res.send({
	message: "api works",
	hostname: req.hostname,
  });
});

app.get("/*", async (req: Request, res: Response) => {
  const ipAddress = decodeURIComponent(req.path.slice(1)).trim();

  if (!blocklistCache.ready) {
	return res.status(503).json({
	  success: false,
	  Error: blocklistCache.error || "Blocklists are still loading. Try again later.",
	});
  }

  try {
	const isCIDR = IPCIDR.isValidCIDR(ipAddress);
	const netType = net.isIP(ipAddress); // 0 = invalid, 4 = IPv4, 6 = IPv6
	const isIPv4 = netType === 4;
	const isIPv6 = netType === 6;

	if (!(isCIDR || isIPv4 || isIPv6)) {
	  throw new Error("Not a valid IP address or CIDR.");
	}

	const telemetry = await getIPLocationInfo(ipAddress);
	let flagged = false;
	let foundIn = "";

	// IPv6 check (trie)
	if (isIPv6 && blocklistCache.ipv6Trie) {
	  const match = blocklistCache.ipv6Trie.lookup(ipAddress);
	  if (match) {
		flagged = true;
		foundIn = match;
	  }
	}

	// IPv4 IP match
	if (!flagged && isIPv4 && blocklistCache.indexed.ipSet.has(ipAddress)) {
	  flagged = true;
	  foundIn = "Exact IP match (no CIDR)";
	}

	// CIDR match (trie)
	if (!flagged && isIPv4 && blocklistCache.cidrTrie) {
	  const match = blocklistCache.cidrTrie.lookup(ipAddress);
	  if (match) {
		flagged = true;
		foundIn = match;
	  }
	}

	// CIDR==CIDR (for direct CIDR query)
	if (!flagged && isCIDR) {
	  for (const { cidr, listUrl } of blocklistCache.indexed.cidrList) {
		if (new IPCIDR(ipAddress).toString() === cidr.toString()) {
		  flagged = true;
		  foundIn = listUrl;
		  break;
		}
	  }
	  if (!flagged) {
		for (const { cidr, listUrl } of blocklistCache.indexed.ipv6List) {
		  if (ipAddress === cidr) {
			flagged = true;
			foundIn = listUrl;
			break;
		  }
		}
	  }
	}

	const message = `The IP Address ${ipAddress} ${flagged ? "was found in an ipset." : "is ok."}`;

	res.json({
	  success: true,
	  hostname: req.hostname,
	  flagged,
	  message,
	  location: telemetry,
	  ipset: foundIn,
	  "ipsets-count":
		blocklistCache.indexed.ipSet.size +
		blocklistCache.indexed.cidrList.length +
		blocklistCache.indexed.ipv6List.length,
	  lastUpdated: blocklistCache.lastUpdated,
	});
  } catch (err: unknown) {
	if (err instanceof Error) {
	  res.json({
		success: false,
		error: err.message,
	  });
	}
  }
});

app.listen(PORT, () => {
	console.log(`Listening on port ${PORT}`);
});
