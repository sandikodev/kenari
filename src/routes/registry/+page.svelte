<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import AppShell from '$lib/components/AppShell.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const user = $derived(data.user as unknown as { name: string; role: string; avatarUrl?: string | null });
	const isAdmin = $derived(user.role === 'admin');

	let activeTab = $state<'agents' | 'services'>('agents');
	let showAddAgent = $state(false);
	let showAddService = $state(false);
	let agentToken = $state('');

	const ago = (ts: number | null) => {
		if (!ts) return 'never';
		const s = Math.floor((Date.now() - ts) / 1000);
		if (s < 60) return `${s}s ago`;
		if (s < 3600) return `${Math.floor(s / 60)}m ago`;
		return `${Math.floor(s / 3600)}h ago`;
	};
	const online = (ts: number | null) => ts && Date.now() - ts < 90_000;

	onMount(() => {
		const t = setInterval(() => invalidateAll(), 5000);
		return () => clearInterval(t);
	});

	$effect(() => {
		if (form?.action === 'registerAgent' && form?.success) {
			agentToken = (form as any).token ?? '';
			showAddAgent = false;
		}
		if (form?.action === 'addService' && form?.success) {
			showAddService = false;
		}
	});
</script>

<svelte:head><title>Kenari — Registry</title></svelte:head>

<AppShell {user}>
<div class="max-w-4xl mx-auto px-6 py-10">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-xl font-bold">Registry</h1>
			<p class="text-white/30 text-sm mt-0.5">Agents and services monitored by Kenari</p>
		</div>
	</div>

	<!-- Tabs -->
	<div class="flex gap-1 mb-6 bg-white/3 border border-white/8 rounded-xl p-1 w-fit">
		{#each [['agents','Agents'],['services','Services']] as [tab, label]}
			<button onclick={() => (activeTab = tab as any)}
				class={`px-4 py-1.5 text-xs font-medium rounded-lg transition ${activeTab === tab ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}>
				{label}
				{#if tab === 'agents'}
					<span class="ml-1.5 text-white/20">{data.agents.length}</span>
				{:else}
					<span class="ml-1.5 text-white/20">{data.services.length}</span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Agents tab -->
	{#if activeTab === 'agents'}
		<div class="flex justify-between items-center mb-4">
			<p class="text-xs text-white/30">Hosts running kenari-cli</p>
			{#if isAdmin}
				<button onclick={() => (showAddAgent = !showAddAgent)}
					class="text-xs bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg transition">
					+ Register agent
				</button>
			{/if}
		</div>

		{#if agentToken}
			<div class="bg-white/3 border border-white/8 rounded-xl p-4 mb-4">
				<p class="text-xs text-white/50 mb-2">Copy this token — shown only once:</p>
				<code class="block bg-black border border-white/10 rounded-lg px-4 py-3 text-xs text-amber-400 break-all mb-2">{agentToken}</code>
				<p class="text-xs text-white/30">Run: <code class="text-white/50">kenari register --gateway https://your-domain.com --token {agentToken.slice(0,8)}...</code></p>
				<button onclick={() => (agentToken = '')} class="mt-2 text-xs text-white/30 hover:text-white transition">Done</button>
			</div>
		{/if}

		{#if showAddAgent && isAdmin}
			<div class="bg-white/3 border border-white/8 rounded-xl p-4 mb-4">
				<form method="POST" action="?/registerAgent" use:enhance class="flex gap-2">
					<input name="name" placeholder="Host name (e.g. prod-server-1)" required
						class="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30 transition placeholder-white/20" />
					<button class="bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">Register</button>
				</form>
			</div>
		{/if}

		{#if data.agents.length === 0}
			<div class="text-center py-12 text-white/20">
				<div class="text-3xl mb-2">🖥️</div>
				<p class="text-sm">No agents registered yet.</p>
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
										<div class="h-full bg-sky-500 rounded-full transition-all duration-700" style="width:{Math.min(m.cpuPercent,100)}%"></div>
									</div>
								</div>
								<div class="bg-black/30 rounded-lg p-3">
									<div class="text-xs text-white/30 mb-1">Memory</div>
									<div class="text-lg font-bold">{(m.memoryUsedMb/1024).toFixed(1)}<span class="text-xs text-white/30"> GB</span></div>
									<div class="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
										<div class="h-full bg-violet-500 rounded-full transition-all duration-700" style="width:{Math.min(m.memoryUsedMb/m.memoryTotalMb*100,100)}%"></div>
									</div>
								</div>
								<div class="bg-black/30 rounded-lg p-3">
									<div class="text-xs text-white/30 mb-1">Disk</div>
									<div class="text-lg font-bold">{m.diskUsedGb.toFixed(0)}<span class="text-xs text-white/30"> GB</span></div>
									<div class="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
										<div class="h-full bg-amber-500 rounded-full transition-all duration-700" style="width:{Math.min(m.diskUsedGb/m.diskTotalGb*100,100)}%"></div>
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
	{/if}

	<!-- Services tab -->
	{#if activeTab === 'services'}
		<div class="flex justify-between items-center mb-4">
			<p class="text-xs text-white/30">Proxy routes to web services</p>
			{#if isAdmin}
				<button onclick={() => (showAddService = !showAddService)}
					class="text-xs bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg transition">
					+ Add service
				</button>
			{/if}
		</div>

		{#if showAddService && isAdmin}
			<div class="bg-white/3 border border-white/8 rounded-xl p-5 mb-4">
				<form method="POST" action="?/addService" use:enhance class="space-y-3">
					<div class="grid grid-cols-2 gap-3">
						<input name="name" placeholder="Service name" required
							class="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30 transition placeholder-white/20" />
						<input name="icon" placeholder="Icon (emoji)" value="🔗"
							class="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30 transition placeholder-white/20" />
					</div>
					<input name="description" placeholder="Description (optional)"
						class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30 transition placeholder-white/20" />
					<div class="grid grid-cols-2 gap-3">
						<input name="proxyPath" placeholder="Proxy path (e.g. /myapp)" required
							class="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30 transition placeholder-white/20" />
						<input name="upstreamUrl" placeholder="Upstream URL (e.g. http://myapp:8080)" required
							class="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30 transition placeholder-white/20" />
					</div>
					<div class="grid grid-cols-2 gap-3">
						<input name="authHeaderKey" placeholder="Auth header key (optional)"
							class="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30 transition placeholder-white/20" />
						<input name="authHeaderValue" placeholder="Auth header value (optional)"
							class="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30 transition placeholder-white/20" />
					</div>
					{#if form?.error}<p class="text-red-400 text-xs">{form.error}</p>{/if}
					<div class="flex gap-2">
						<button class="bg-white hover:bg-white/90 text-black font-bold px-4 py-2 rounded-lg text-sm transition">Add service</button>
						<button type="button" onclick={() => (showAddService = false)} class="text-white/40 hover:text-white text-sm transition px-3">Cancel</button>
					</div>
				</form>
			</div>
		{/if}

		{#if data.services.length === 0}
			<div class="text-center py-12 text-white/20">
				<div class="text-3xl mb-2">🔗</div>
				<p class="text-sm">No services registered yet.</p>
				<p class="text-xs mt-1">Add a service to proxy it through Kenari.</p>
			</div>
		{:else}
			<div class="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
				{#each data.services as svc, i}
					<div class={`flex items-center justify-between px-5 py-4 ${i < data.services.length - 1 ? 'border-b border-white/5' : ''}`}>
						<div class="flex items-center gap-3">
							<span class="text-xl">{svc.icon}</span>
							<div>
								<div class="flex items-center gap-2">
									<span class="font-medium text-sm">{svc.name}</span>
									{#if !svc.enabled}
										<span class="text-xs bg-white/5 text-white/30 px-1.5 py-0.5 rounded">disabled</span>
									{/if}
								</div>
								<div class="text-xs text-white/30 font-mono mt-0.5">{svc.proxyPath} → {svc.upstreamUrl}</div>
							</div>
						</div>
						{#if isAdmin}
							<div class="flex items-center gap-2">
								<form method="POST" action="?/toggleService" use:enhance>
									<input type="hidden" name="id" value={svc.id}>
									<input type="hidden" name="enabled" value={svc.enabled}>
									<button class="text-xs text-white/30 hover:text-white transition px-2 py-1 rounded hover:bg-white/5">
										{svc.enabled ? 'Disable' : 'Enable'}
									</button>
								</form>
								<form method="POST" action="?/deleteService" use:enhance>
									<input type="hidden" name="id" value={svc.id}>
									<button class="text-xs text-red-400/50 hover:text-red-400 transition px-2 py-1 rounded hover:bg-red-500/5">Remove</button>
								</form>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>
</AppShell>
