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

//CORs should not be * in a real app we would define which domains are allowed to use this service
app.use(cors.default());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(helmet());

/** Default address to give the user a hint on how to use this service. */
app.get('/', (req: Request, res: Response) => {
	res.send('You need to provide an ip address to use this service')
});

/**
 * Basic healthcheck to see if the API service is running.
 */
app.get('/healthcheck', (req: Request, res: Response) => {
	res.send({
		message: 'api works',
		hostname: req.hostname
	});
});

/**
 * @type string
 * @param ipaddress is an ipv4 number 
 */
app.get('/:ipAddress', async (req: Request, res: Response) => {
	const { ipAddress } = req.params;

	try {
		const lists: Array<FireHolFile> = await getData();
		const telemetry = await getIPLocationInfo(ipAddress);
		let flagged = false;
		let count = 0;
		let foundIn = '';
		let message = `The IP Address is ${ipAddress}`;
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
			flagged ? (message += ` was found in an ipset.`) : (message += ` is ok.`);
		} else {
			throw new Error('Not a valid IP address.');
		}

		res.json({
			success: true,
			hostname: req.hostname,
			flagged,
			message,
			location: telemetry,
			ipset: foundIn,
			'ipsets-count': lists.length
		});
	} catch (error: any) {
		res.json({
			success: false,
			Error: error.message
		});
	}
});

app.listen(PORT, () => {
	console.log(`Listening on port ${PORT}`);
});
