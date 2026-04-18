<script lang="ts">
	import { enhance } from '$app/forms';
	import AppShell from '$lib/components/AppShell.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const fmt = (ts: number) => new Date(ts).toLocaleString();
	const actionColor: Record<string, string> = {
		login: 'text-green-400', logout: 'text-white/40',
		access: 'text-blue-400', admin: 'text-amber-400'
	};
</script>

<svelte:head><title>Kenari — Admin</title></svelte:head>

<AppShell user={data.user as any}>
<div class="max-w-4xl mx-auto px-6 py-10">
	<h1 class="text-xl font-bold mb-1">Admin</h1>
	<p class="text-white/30 text-sm mb-8">Manage users and review activity</p>

	<!-- Users -->
	<section class="mb-10">
		<h2 class="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Users ({data.users.length})</h2>
		<div class="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
			{#each data.users as u, i}
				<div class={`flex items-center justify-between px-5 py-3.5 ${i < data.users.length - 1 ? 'border-b border-white/5' : ''}`}>
					<div>
						<div class="text-sm font-medium">{u.name}</div>
						<div class="text-xs text-white/30">{u.email} · joined {fmt(u.createdAt)}</div>
					</div>
					<div class="flex items-center gap-2">
						<span class={`text-xs px-2 py-0.5 rounded-full border ${u.role === 'admin' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-white/5 text-white/40 border-white/10'}`}>
							{u.role}
						</span>
						<form method="POST" action="?/setRole" use:enhance>
							<input type="hidden" name="userId" value={u.id} />
							<input type="hidden" name="role" value={u.role === 'admin' ? 'viewer' : 'admin'} />
							<button class="text-xs text-white/30 hover:text-white transition px-2 py-1 rounded hover:bg-white/5">
								→ {u.role === 'admin' ? 'viewer' : 'admin'}
							</button>
						</form>
						<form method="POST" action="?/deleteUser" use:enhance>
							<input type="hidden" name="userId" value={u.id} />
							<button class="text-xs text-red-500/50 hover:text-red-400 transition px-2 py-1 rounded hover:bg-red-500/5">
								Remove
							</button>
						</form>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Audit log -->
	<section>
		<h2 class="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Audit Log</h2>
		<div class="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
			{#if data.logs.length === 0}
				<p class="text-white/30 text-sm px-5 py-4">No activity yet</p>
			{:else}
				{#each data.logs as entry, i}
					<div class={`flex items-center justify-between px-5 py-3 text-xs ${i < data.logs.length - 1 ? 'border-b border-white/5' : ''}`}>
						<div class="flex items-center gap-3">
							<span class={`font-mono font-semibold w-14 ${actionColor[entry.action] ?? 'text-white/40'}`}>{entry.action}</span>
							<span class="text-white/50">{entry.detail ?? '—'}</span>
						</div>
						<span class="text-white/20">{fmt(entry.createdAt)}</span>
					</div>
				{/each}
			{/if}
		</div>
	</section>
</div>
</AppShell>
