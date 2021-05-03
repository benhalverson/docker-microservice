import express, { Request, Response } from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import * as cors from 'cors';
import { FireHolFile } from './interfaces';
import { getData, getIPLocationInfo, readData } from './utils';

//module version is not available for this package
const validate = require('ip-validator');

const app = express();
const PORT = process.env.PORT || 3000;

// basic check to determine environment
if (process.env.NODE_ENV === 'development') {
	app.use(morgan('dev'));
} else {
	app.use(morgan('combined'));
}

app.use(cors.default());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(helmet());

app.get('/:ipAddress', async (req: Request, res: Response) => {
	let { ipAddress } = req.params;

	try {
		let lists: Array<FireHolFile> = await getData();
		let flagged = false;
		let count = 0;
		let foundIn: string | null = null;
		let telemetry = await getIPLocationInfo(ipAddress);
		let message = `The ip address is ${ipAddress}`;
		flagged ? (message += ` was found amoung an ipset.`) : (message += ` is ok.`);

		if (validate.ipv4(ipAddress)) {
			for (let i: number = 0, num: number = lists.length; i < num; ++i) {
				let lines: string[] = await readData(lists[i]);
				count = count + lines.length;
				if (lines.includes(ipAddress)) {
					flagged = true;
					foundIn = `https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/${lists[i].path}`;
					break;
				}
			}
		} else {
			throw new Error('Not a valid IP address.');
		}

		res.json({
			origin: req.originalUrl,
			flagged: flagged,
			message: message,
			telemetry: telemetry,
			ipset: foundIn,
			'ipsets-count': lists.length
		});
	} catch (error) {
		res.json({
			Error: error.message
		});
	}
});

app.listen(PORT, () => {
	console.log(`Listening on port ${PORT}`);
});
