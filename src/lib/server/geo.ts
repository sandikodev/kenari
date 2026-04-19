// IP geolocation using ip-api.com (free, no API key, 45 req/min)
// Returns null if lookup fails or IP is private

const cache = new Map<string, string | null>();

export async function getCountry(ip: string): Promise<string | null> {
	if (!ip || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) return null;
	if (cache.has(ip)) return cache.get(ip)!;

	try {
		const res = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode,status`, {
			signal: AbortSignal.timeout(2000)
		});
		const data = await res.json();
		const country = data.status === 'success' ? data.countryCode : null;
		cache.set(ip, country);
		return country;
	} catch {
		return null;
	}
}
