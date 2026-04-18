<script lang="ts">
	import { enhance } from '$app/forms';
	import AppShell from '$lib/components/AppShell.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const user = $derived(data.user as unknown as { name: string; role: string; avatarUrl?: string | null });

	const fmt = (ts: number) => new Date(ts).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
	const actionColor: Record<string, string> = {
		login: 'text-green-400', logout: 'text-white/30',
		access: 'text-sky-400', admin: 'text-amber-400'
	};

	let activeTab = $state<'users' | 'timeline' | 'threats'>('users');
	const topThreats = $derived(
		Object.entries(data.failuresByIp)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10)
	);
</script>

<svelte:head><title>Kenari — Console</title></svelte:head>

<AppShell {user}>
<div class="max-w-5xl mx-auto px-6 py-10">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-xl font-bold">Console</h1>
			<p class="text-white/30 text-sm mt-0.5">System management & security overview</p>
		</div>
		<!-- Stats bar -->
		<div class="hidden sm:flex items-center gap-4 text-xs">
			<div class="text-center">
				<div class="text-lg font-bold">{data.users.length}</div>
				<div class="text-white/30">users</div>
			</div>
			<div class="w-px h-8 bg-white/8"></div>
			<div class="text-center">
				<div class={`text-lg font-bold ${data.totalFailures > 20 ? 'text-red-400' : 'text-white'}`}>{data.totalFailures}</div>
				<div class="text-white/30">failed logins 24h</div>
			</div>
			<div class="w-px h-8 bg-white/8"></div>
			<div class="text-center">
				<div class="text-lg font-bold">{data.logs.length}</div>
				<div class="text-white/30">events</div>
			</div>
		</div>
	</div>

	<!-- Tabs -->
	<div class="flex gap-1 mb-6 bg-white/3 border border-white/8 rounded-xl p-1 w-fit">
		{#each [['users','Users'],['timeline','Timeline'],['threats','Threats']] as [tab, label]}
			<button onclick={() => (activeTab = tab as any)}
				class={`px-4 py-1.5 text-xs font-medium rounded-lg transition ${activeTab === tab ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}>
				{label}
				{#if tab === 'threats' && data.totalFailures > 0}
					<span class="ml-1.5 bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full text-xs">{data.totalFailures}</span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Users tab -->
	{#if activeTab === 'users'}
		<div class="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
			{#each data.users as u, i}
				<div class={`flex items-center justify-between px-5 py-3.5 ${i < data.users.length - 1 ? 'border-b border-white/5' : ''}`}>
					<div class="flex items-center gap-3">
						{#if u.avatarUrl}
							<img src={u.avatarUrl} class="w-7 h-7 rounded-full" alt="">
						{:else}
							<div class="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">{u.name[0]}</div>
						{/if}
						<div>
							<div class="text-sm font-medium">{u.name}</div>
							<div class="text-xs text-white/30">{u.email}</div>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<span class={`text-xs px-2 py-0.5 rounded-full border ${u.role === 'admin' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-white/5 text-white/40 border-white/10'}`}>
							{u.role}
						</span>
						<form method="POST" action="?/setRole" use:enhance>
							<input type="hidden" name="userId" value={u.id}>
							<input type="hidden" name="role" value={u.role === 'admin' ? 'viewer' : 'admin'}>
							<button class="text-xs text-white/20 hover:text-white transition px-2 py-1 rounded hover:bg-white/5">
								→ {u.role === 'admin' ? 'viewer' : 'admin'}
							</button>
						</form>
						<form method="POST" action="?/deleteUser" use:enhance>
							<input type="hidden" name="userId" value={u.id}>
							<button class="text-xs text-red-500/40 hover:text-red-400 transition px-2 py-1 rounded hover:bg-red-500/5">Remove</button>
						</form>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Timeline tab -->
	{#if activeTab === 'timeline'}
		<div class="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
			{#if data.logs.length === 0}
				<p class="text-white/20 text-sm px-5 py-6">No activity yet</p>
			{:else}
				{#each data.logs as entry, i}
					<div class={`flex items-start gap-4 px-5 py-3 text-xs ${i < data.logs.length - 1 ? 'border-b border-white/5' : ''}`}>
						<span class={`font-mono font-semibold w-14 shrink-0 mt-0.5 ${actionColor[entry.action] ?? 'text-white/30'}`}>{entry.action}</span>
						<div class="flex-1 min-w-0">
							<span class="text-white/60">{entry.detail ?? '—'}</span>
							{#if entry.ip}
								<span class="text-white/20 ml-2 font-mono">{entry.ip}</span>
							{/if}
							{#if entry.userAgent}
								<div class="text-white/15 truncate mt-0.5">{entry.userAgent}</div>
							{/if}
						</div>
						<span class="text-white/20 shrink-0 tabular-nums">{fmt(entry.createdAt)}</span>
					</div>
				{/each}
			{/if}
		</div>
	{/if}

	<!-- Threats tab -->
	{#if activeTab === 'threats'}
		<div class="space-y-4">
			{#if data.totalFailures === 0}
				<div class="text-center py-12 text-white/20">
					<div class="text-3xl mb-2">🛡️</div>
					<p class="text-sm">No failed login attempts in the last 24 hours</p>
				</div>
			{:else}
				<div class="bg-red-500/5 border border-red-500/20 rounded-xl p-4 text-sm">
					<span class="text-red-400 font-semibold">{data.totalFailures}</span>
					<span class="text-white/50"> failed login attempts in the last 24 hours</span>
				</div>
				<div class="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
					<div class="px-5 py-3 border-b border-white/8 text-xs text-white/30 font-semibold uppercase tracking-wider flex justify-between">
						<span>IP Address</span><span>Attempts</span>
					</div>
					{#each topThreats as [ip, count], i}
						<div class={`flex items-center justify-between px-5 py-3 ${i < topThreats.length - 1 ? 'border-b border-white/5' : ''}`}>
							<span class="font-mono text-sm">{ip}</span>
							<div class="flex items-center gap-3">
								<div class="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
									<div class="h-full bg-red-500 rounded-full" style="width:{Math.min(count / (topThreats[0]?.[1] ?? 1) * 100, 100)}%"></div>
								</div>
								<span class={`text-sm font-bold tabular-nums ${count >= 10 ? 'text-red-400' : count >= 5 ? 'text-amber-400' : 'text-white/60'}`}>{count}</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
</AppShell>
