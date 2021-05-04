import axios from 'axios';
import geoip from 'geoip-lite';

import { FireHolFile } from './interfaces';

export const getData = async () => {
	const response = await axios.get(
		`https://api.github.com/repos/firehol/blocklist-ipsets/git/trees/master?recursive=1`
	)
	//files is each filename in the git repo that ends with .ipset
	const files: [] = await response.data.tree.filter((file: any) => {
		if (file.path.endsWith('.ipset')) {
			return file.path;
		}
	});
	return files;
};

export const readData = async (file: FireHolFile) => {
	const response = await axios
		.get(`https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/${file.path}`)

	//data here is the ip address in each file
	const cleanedText: [] = await response.data.split('\n').filter((line: any) => {
		return line.includes('#') !== 0;
	});
	return cleanedText;
};

// Determine location of IP Address.
export const getIPLocationInfo = async (ip: string)=> {
	let info = await geoip.lookup(ip);

	if (info) {
		return [
			{
				region: info.region,
				country: info.country,
				timezone: info.timezone
			}
		];
	}
	return 'no data found';
};
