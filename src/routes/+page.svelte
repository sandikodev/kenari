<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import AppShell from '$lib/components/AppShell.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const user = $derived(data.user as unknown as { name: string; role: string });
	const stats = $derived(data.stats);

	const actionColor: Record<string, string> = {
		login: 'text-green-400', logout: 'text-white/30',
		access: 'text-sky-400', admin: 'text-amber-400'
	};

	onMount(() => {
		const t = setInterval(() => invalidateAll(), 10000);
		return () => clearInterval(t);
	});
</script>

<svelte:head><title>Kenari — Dashboard</title></svelte:head>

<AppShell {user}>
<div class="max-w-4xl mx-auto px-6 py-10">

	<!-- Summary widgets -->
	<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
		<a href="/registry?tab=agents" class="bg-white/3 border border-white/8 hover:border-white/15 rounded-xl p-4 transition">
			<div class="text-xs text-white/30 mb-1">Agents</div>
			<div class="text-2xl font-bold">{stats.agentsOnline}<span class="text-sm text-white/30">/{stats.agentsTotal}</span></div>
			<div class="text-xs text-white/20 mt-1">{stats.agentsOnline === stats.agentsTotal && stats.agentsTotal > 0 ? 'all online' : stats.agentsOnline > 0 ? 'online' : 'offline'}</div>
		</a>
		<a href="/registry?tab=services" class="bg-white/3 border border-white/8 hover:border-white/15 rounded-xl p-4 transition">
			<div class="text-xs text-white/30 mb-1">Services</div>
			<div class="text-2xl font-bold">{stats.servicesOnline}<span class="text-sm text-white/30">/{stats.servicesTotal}</span></div>
			<div class="text-xs text-white/20 mt-1">{stats.servicesOnline === stats.servicesTotal && stats.servicesTotal > 0 ? 'all healthy' : stats.servicesOnline > 0 ? 'healthy' : 'degraded'}</div>
		</a>
		<a href="/console?tab=timeline" class="bg-white/3 border border-white/8 hover:border-white/15 rounded-xl p-4 transition col-span-2">
			<div class="text-xs text-white/30 mb-2">Recent activity (24h)</div>
			{#if stats.recentEvents.length === 0}
				<div class="text-xs text-white/20">No activity</div>
			{:else}
				<div class="space-y-1">
					{#each stats.recentEvents.slice(0, 3) as event}
						<div class="flex items-center gap-2 text-xs">
							<span class={`font-mono w-12 shrink-0 ${actionColor[event.action] ?? 'text-white/30'}`}>{event.action}</span>
							<span class="text-white/20 tabular-nums">{new Date(event.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
						</div>
					{/each}
				</div>
			{/if}
		</a>
	</div>

	<!-- Service shortcuts -->
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-sm font-semibold text-white/50 uppercase tracking-wider">Services</h2>
		<a href="/registry?tab=services" class="text-xs text-white/30 hover:text-white/60 transition">Manage →</a>
	</div>

	{#if data.routes.length === 0}
		<div class="text-center py-12 text-white/20 bg-white/3 border border-white/8 rounded-xl">
			<div class="text-3xl mb-2">🔗</div>
			<p class="text-sm">No services configured.</p>
			<a href="/registry?tab=services" class="text-xs text-sky-400 hover:text-sky-300 transition mt-2 block">Add a service →</a>
		</div>
	{:else}
		<div class="grid sm:grid-cols-2 gap-3">
			{#each data.routes as route}
				{@const h = data.health[route.id]}
				<a href={route.proxyPath}
					class="group bg-white/3 border border-white/8 hover:border-white/20 rounded-xl p-5 transition block">
					<div class="flex items-start justify-between mb-3">
						<span class="text-2xl">{route.icon}</span>
						<div class="flex items-center gap-1.5">
							<span class="text-xs text-white/20">{h?.latency ?? 0}ms</span>
							<span class={`w-2 h-2 rounded-full ${h?.online ? 'bg-green-400' : 'bg-red-400'}`}></span>
						</div>
					</div>
					<div class="font-semibold text-sm group-hover:text-white transition">{route.name}</div>
					<div class="text-xs text-white/30 mt-0.5">{route.description}</div>
					<div class="text-xs text-white/15 mt-3 font-mono">{route.proxyPath} →</div>
				</a>
			{/each}
		</div>
	{/if}

	<div class="mt-6 flex items-center justify-between text-xs text-white/20">
		<span>{data.routes.length} services</span>
		<a href="/status" class="hover:text-white/50 transition">Public status page →</a>
	</div>
</div>
</AppShell>
