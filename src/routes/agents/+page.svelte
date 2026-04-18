<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import AppShell from '$lib/components/AppShell.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const user = $derived(data.user as unknown as { name: string; role: string });
	const isAdmin = $derived(user.role === 'admin');

	let newName = $state('');
	let newToken = $state('');
	let adding = $state(false);

	onMount(() => {
		const t = setInterval(() => invalidateAll(), 5000);
		return () => clearInterval(t);
	});

	async function registerAgent() {
		adding = true;
		const res = await fetch('/api/agent/register', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: newName })
		});
		const data = await res.json();
		newToken = data.token;
		adding = false;
	}

	const ago = (ts: number | null) => {
		if (!ts) return 'never';
		const s = Math.floor((Date.now() - ts) / 1000);
		if (s < 60) return `${s}s ago`;
		if (s < 3600) return `${Math.floor(s/60)}m ago`;
		return `${Math.floor(s/3600)}h ago`;
	};

	const online = (ts: number | null) => ts && Date.now() - ts < 90_000;
</script>

<svelte:head><title>Kenari — Agents</title></svelte:head>

<AppShell {user}>
<div class="max-w-4xl mx-auto px-6 py-10">
	<div class="flex items-center justify-between mb-8">
		<div>
			<h1 class="text-xl font-bold">Agents</h1>
			<p class="text-white/30 text-sm mt-1">Hosts running kenari-cli</p>
		</div>
		{#if isAdmin}
			<button onclick={() => (newName = newName ? '' : ' ')}
				class="text-sm bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg transition">
				+ Add agent
			</button>
		{/if}
	</div>

	{#if isAdmin && newName !== ''}
		<div class="bg-white/3 border border-white/10 rounded-xl p-5 mb-6">
			{#if newToken}
				<p class="text-xs text-white/50 mb-2">Copy this token — it won't be shown again:</p>
				<code class="block bg-black border border-white/10 rounded-lg px-4 py-3 text-xs text-amber-400 break-all mb-3">{newToken}</code>
				<p class="text-xs text-white/30">Run: <code class="text-white/60">kenari register --gateway https://monitor.yourdomain.com --token {newToken.slice(0,8)}... --name "{newName.trim()}"</code></p>
				<button onclick={() => { newName = ''; newToken = ''; }} class="mt-3 text-xs text-white/40 hover:text-white transition">Done</button>
			{:else}
				<div class="flex gap-2">
					<input bind:value={newName} placeholder="Host name (e.g. prod-server-1)"
						class="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30 transition placeholder-white/20" />
					<button onclick={registerAgent} disabled={adding || !newName.trim()}
						class="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
						{adding ? '...' : 'Register'}
					</button>
				</div>
			{/if}
		</div>
	{/if}

	{#if data.agents.length === 0}
		<div class="text-center py-16 text-white/20">
			<div class="text-4xl mb-3">🖥️</div>
			<p class="text-sm">No agents registered yet.</p>
			<p class="text-xs mt-1">Install kenari-cli on a host and register it here.</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each data.agents as agent}
				{@const m = agent.latest}
				{@const isOnline = online(agent.lastSeen)}
				<div class="bg-white/3 border border-white/8 rounded-xl p-5">
					<div class="flex items-start justify-between mb-4">
						<div class="flex items-center gap-3">
							<span class={`w-2 h-2 rounded-full mt-1 ${isOnline ? 'bg-green-400' : 'bg-white/20'}`}></span>
							<div>
								<div class="font-semibold text-sm">{agent.name}</div>
								<div class="text-xs text-white/30">Last seen {ago(agent.lastSeen)}</div>
							</div>
						</div>
						<span class={`text-xs px-2 py-0.5 rounded-full ${isOnline ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/30'}`}>
							{isOnline ? 'online' : 'offline'}
						</span>
					</div>

					{#if m}
						<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
							<div class="bg-black/30 rounded-lg p-3">
								<div class="text-xs text-white/30 mb-1">CPU</div>
								<div class="text-lg font-bold">{m.cpuPercent.toFixed(1)}<span class="text-xs text-white/30">%</span></div>
								<div class="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
									<div class="h-full bg-sky-500 rounded-full" style="width:{Math.min(m.cpuPercent,100)}%"></div>
								</div>
							</div>
							<div class="bg-black/30 rounded-lg p-3">
								<div class="text-xs text-white/30 mb-1">Memory</div>
								<div class="text-lg font-bold">{(m.memoryUsedMb/1024).toFixed(1)}<span class="text-xs text-white/30"> GB</span></div>
								<div class="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
									<div class="h-full bg-violet-500 rounded-full" style="width:{Math.min(m.memoryUsedMb/m.memoryTotalMb*100,100)}%"></div>
								</div>
							</div>
							<div class="bg-black/30 rounded-lg p-3">
								<div class="text-xs text-white/30 mb-1">Disk</div>
								<div class="text-lg font-bold">{m.diskUsedGb.toFixed(0)}<span class="text-xs text-white/30"> GB</span></div>
								<div class="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
									<div class="h-full bg-amber-500 rounded-full" style="width:{Math.min(m.diskUsedGb/m.diskTotalGb*100,100)}%"></div>
								</div>
							</div>
							<div class="bg-black/30 rounded-lg p-3">
								<div class="text-xs text-white/30 mb-1">Uptime</div>
								<div class="text-lg font-bold">{Math.floor(m.uptimeSecs/3600)}<span class="text-xs text-white/30">h</span></div>
							</div>
						</div>
					{:else}
						<p class="text-xs text-white/20">No metrics yet — waiting for first push.</p>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
</AppShell>
