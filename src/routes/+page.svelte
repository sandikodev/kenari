<script lang="ts">
	import AppShell from '$lib/components/AppShell.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const user = data.user as unknown as { name: string; role: string };
</script>

<svelte:head><title>Kenari — Dashboard</title></svelte:head>

<AppShell {user}>
<div class="max-w-4xl mx-auto px-6 py-10">
	<div class="mb-8">
		<h1 class="text-xl font-bold">Dashboard</h1>
		<p class="text-white/30 text-sm mt-1">All your monitoring tools in one place</p>
	</div>

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

	<div class="mt-6 flex items-center justify-between text-xs text-white/20">
		<span>{data.routes.length} services configured</span>
		<a href="/status" class="hover:text-white/50 transition">Public status page →</a>
	</div>
</div>
</AppShell>
