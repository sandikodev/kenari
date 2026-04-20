import { env } from '$env/dynamic/private';

export async function sendTelegram(message: string): Promise<void> {
	const token = env.TELEGRAM_BOT_TOKEN;
	const chatId = env.TELEGRAM_CHAT_ID;
	if (!token || !chatId) return;

	try {
		await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
		});
	} catch { /* non-critical */ }
}

async function sendWebhook(payload: object): Promise<void> {
	const url = env.WEBHOOK_URL;
	if (!url) return;
	try {
		await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
	} catch { /* non-critical */ }
}

async function notify(telegramMsg: string, webhookPayload: object): Promise<void> {
	await Promise.all([sendTelegram(telegramMsg), sendWebhook(webhookPayload)]);
}

export function alertFailedLoginSpike(ip: string, count: number) {
	return notify(
		`🚨 <b>Brute Force Detected</b>\n\nIP: <code>${ip}</code>\nAttempts: <b>${count}</b> in 60s\n\n<i>Kenari Gateway</i>`,
		{ event: 'brute_force', ip, count, timestamp: new Date().toISOString() }
	);
}

export function alertUpstreamDown(name: string, url: string) {
	return notify(
		`🔴 <b>Service Down</b>\n\n${name} is unreachable\nURL: <code>${url}</code>\n\n<i>Kenari Gateway</i>`,
		{ event: 'service_down', service: name, url, timestamp: new Date().toISOString() }
	);
}

export function alertUpstreamUp(name: string) {
	return notify(
		`🟢 <b>Service Recovered</b>\n\n${name} is back online\n\n<i>Kenari Gateway</i>`,
		{ event: 'service_up', service: name, timestamp: new Date().toISOString() }
	);
}

export function alertNewLogin(name: string, ip: string, method: string) {
	return notify(
		`🔐 <b>New Login</b>\n\nUser: <b>${name}</b>\nIP: <code>${ip}</code>\nMethod: ${method}\n\n<i>Kenari Gateway</i>`,
		{ event: 'login', user: name, ip, method, timestamp: new Date().toISOString() }
	);
}

export function alertAgentOffline(agentName: string, lastSeen: number) {
	const ago = Math.floor((Date.now() - lastSeen) / 60000);
	return notify(
		`📡 <b>Agent Offline</b>\n\nHost: <b>${agentName}</b>\nLast seen: ${ago} minutes ago\n\n<i>Kenari Gateway</i>`,
		{ event: 'agent_offline', agent: agentName, last_seen_minutes_ago: ago, timestamp: new Date().toISOString() }
	);
}
