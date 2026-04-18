import { env } from '$env/dynamic/private';

export async function sendTelegram(message: string): Promise<void> {
	const token = env.TELEGRAM_BOT_TOKEN;
	const chatId = env.TELEGRAM_CHAT_ID;
	if (!token || !chatId) return;

	try {
		await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chat_id: chatId,
				text: message,
				parse_mode: 'HTML'
			})
		});
	} catch {
		// non-critical — never throw
	}
}

export function alertFailedLoginSpike(ip: string, count: number) {
	return sendTelegram(
		`🚨 <b>Brute Force Detected</b>\n\nIP: <code>${ip}</code>\nAttempts: <b>${count}</b> in 60s\n\n<i>Kenari Gateway</i>`
	);
}

export function alertUpstreamDown(name: string, url: string) {
	return sendTelegram(
		`🔴 <b>Service Down</b>\n\n${name} is unreachable\nURL: <code>${url}</code>\n\n<i>Kenari Gateway</i>`
	);
}

export function alertUpstreamUp(name: string) {
	return sendTelegram(
		`🟢 <b>Service Recovered</b>\n\n${name} is back online\n\n<i>Kenari Gateway</i>`
	);
}

export function alertNewLogin(name: string, ip: string, method: string) {
	return sendTelegram(
		`🔐 <b>New Login</b>\n\nUser: <b>${name}</b>\nIP: <code>${ip}</code>\nMethod: ${method}\n\n<i>Kenari Gateway</i>`
	);
}

export function alertAgentOffline(agentName: string, lastSeen: number) {
	const ago = Math.floor((Date.now() - lastSeen) / 60000);
	return sendTelegram(
		`📡 <b>Agent Offline</b>\n\nHost: <b>${agentName}</b>\nLast seen: ${ago} minutes ago\n\n<i>Kenari Gateway</i>`
	);
}
