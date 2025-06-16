import express, { Request, Response } from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import { getIPLocationInfo } from "./utils";
import { blocklistCache, loadBlocklists } from "./db";
const IPCIDR = require("ip-cidr").default;
const ip6 = require("ip6");
const validate = require("ip-validator");

const app = express();
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV === "development") {
	app.use(morgan("dev"));
} else {
	app.use(morgan("combined"));
}

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(helmet());

loadBlocklists();
setInterval(loadBlocklists, 6 * 60 * 60 * 1000); // refresh every 6 hours

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
			Error:
				blocklistCache.error ||
				"Blocklists are still loading. Try again later.",
		});
	}

	try {
		const isCIDR = IPCIDR.isValidCIDR(ipAddress);
		const isIPv4 = validate.ipv4(ipAddress);
		const isIPv6 = validate.ipv6(ipAddress);

		if (!(isCIDR || isIPv4 || isIPv6)) {
			throw new Error("Not a valid IP address or CIDR.");
		}

		const telemetry = await getIPLocationInfo(ipAddress);
		let flagged = false;
		let foundIn = "";

		for (const { cidr, isIPv6, listUrl } of blocklistCache.entries) {
			const target = cidr.trim();

			if (isIPv6) {
				if (validate.ipv6(ipAddress) && ip6.isInSubnet(ipAddress, target)) {
					flagged = true;
					foundIn = listUrl;
					break;
				}
				continue;
			}

			// At this point, assume IPv4
			const isTargetCIDR = IPCIDR.isValidCIDR(target);

			if (isCIDR && isTargetCIDR) {
				if (
					new IPCIDR(ipAddress).toString() === new IPCIDR(target).toString()
				) {
					flagged = true;
					foundIn = listUrl;
					break;
				}
			}

			if (!isCIDR && isTargetCIDR) {
				if (new IPCIDR(target).contains(ipAddress)) {
					flagged = true;
					foundIn = listUrl;
					break;
				}
			}

			if (!isCIDR && !isTargetCIDR && ipAddress === target) {
				flagged = true;
				foundIn = listUrl;
				break;
			}
		}

		const message = `The IP Address ${ipAddress} ${
			flagged ? "was found in an ipset." : "is ok."
		}`;

		res.json({
			success: true,
			hostname: req.hostname,
			flagged,
			message,
			location: telemetry,
			ipset: foundIn,
			"ipsets-count": blocklistCache.entries.length,
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
