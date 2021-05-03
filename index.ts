import express, { Request, Response } from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import * as cors from 'cors';
import axios from 'axios';
import { FireHolFile } from './interfaces';
import geoip from 'geoip-lite';

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

	let lists: Array<FireHolFile> = await getData();
	let flagged: boolean = false;
	let count: number = 0;
	let foundIn: string|null = null;
	// NOTE: add let n for length caching, should improve performance some
	for (let i:number = 0, n:number = lists.length; i < n; ++i) {
		let lines: string[] = await readData(lists[i]);
		count = count + lines.length; 
		if (lines.includes(ipAddress)) {
			flagged = true;
			foundIn = `https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/${lists[i].path}`;
			break;
		}
	}
	let telemetry = await getIPLocationInfo(ipAddress);
	let message = `The ip address is ${ipAddress}`;
	flagged ? (message += ` was found amoung an ipset.`) : (message += ` is ok.`);
	
		res.json({
		'flagged': flagged,
		'message': message,
		'telemetry': telemetry,
		'ipset': foundIn,
		'ipsets-count': lists.length,
	});
});
app.listen(PORT, () => {
	console.log(`Listening on port ${PORT}`);
});

const getData = async () => {
	const response = await axios.get(
		`https://api.github.com/repos/firehol/blocklist-ipsets/git/trees/master?recursive=1`
	);
	// console.log('response', response.data);
	const files: [] = await response.data.tree.filter((file: any) => {
		if (file.path.endsWith('.ipset')) {
			// console.log('file.path', file.path);
			return file.path;
		}
	});

	return files;
};

const readData = async (file: FireHolFile) => {
	const response = await axios.get(`https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/${file.path}`);

	//data here is the ip address in each file
	// console.log('response', response.data);

	const cleanedText: [] = await response.data.split('\n').filter((line: any) => {
		return line.includes('#') !== 0;
	});
	// console.log('cleaned ', cleanedText);
	return cleanedText;
};

// Determine location of IP Address.
const getIPLocationInfo = async (ip: string) => {
	let info = await geoip.lookup(ip);

	if (info) {
		// console.log('info')
		return [{
			'region': info.region,
			'country': info.country,
			'timezone': info.timezone
		}];
	}
	return JSON.stringify('no data found');
};
