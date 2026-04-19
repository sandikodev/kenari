<script lang="ts">
	import { enhance } from '$app/forms';
	import AppShell from '$lib/components/AppShell.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const user = $derived(data.user as unknown as { name: string; role: string; avatarUrl?: string | null });

	let loadingPw = $state(false);
	let loadingDel = $state(false);
	let deleteConfirm = $state('');

	const fmt = (ts: number) => new Date(ts).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
</script>

<svelte:head><title>Kenari — Settings</title></svelte:head>

<AppShell {user}>
<div class="max-w-xl mx-auto px-6 py-10">
	<h1 class="text-xl font-bold mb-1">Settings</h1>
	<p class="text-white/30 text-sm mb-8">Manage your account</p>

	<!-- Profile info -->
	<div class="bg-white/3 border border-white/8 rounded-xl px-5 py-4 mb-6 flex items-center gap-4">
		<div class="w-10 h-10 rounded-full overflow-hidden bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-lg">
			{#if user.avatarUrl}
				<img src={user.avatarUrl} alt={user.name} class="w-full h-full object-cover">
			{:else}
				{user.name[0].toUpperCase()}
			{/if}
		</div>
		<div>
			<div class="font-semibold text-sm">{user.name}</div>
			<div class="text-xs text-white/30 capitalize mt-0.5">{user.role}</div>
		</div>
	</div>

	<!-- Sessions -->
	<section class="bg-white/3 border border-white/8 rounded-xl p-5 mb-4">
		<h2 class="text-sm font-semibold mb-4">Active Sessions</h2>
		<div class="space-y-2">
			{#each data.sessions as s}
				<div class="flex items-center justify-between text-xs">
					<div>
						<span class="font-mono text-white/50">{s.id.slice(0, 16)}...</span>
						{#if s.isCurrent}<span class="ml-2 text-green-400">current</span>{/if}
						<div class="text-white/30 mt-0.5">expires {fmt(s.expiresAt)}</div>
					</div>
					{#if !s.isCurrent}
						<form method="POST" action="?/revokeSession" use:enhance>
							<input type="hidden" name="sessionId" value={s.id}>
							<button class="text-red-400/60 hover:text-red-400 transition px-2 py-1 rounded hover:bg-red-500/5">
								Revoke
							</button>
						</form>
					{/if}
				</div>
			{/each}
		</div>
	</section>

	<!-- Change password -->
	<section class="bg-white/3 border border-white/8 rounded-xl p-5 mb-4">
		<h2 class="text-sm font-semibold mb-4">Change Password</h2>
		<form method="POST" action="?/changePassword"
			use:enhance={() => {
				loadingPw = true;
				return async ({ update }) => { loadingPw = false; update(); };
			}}
			class="space-y-3">
			{#if data.hasPassword}
				<input type="password" name="current" placeholder="Current password" required
					class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/30 transition placeholder-white/20" />
			{/if}
			<input type="password" name="new" placeholder="New password" required minlength="8"
				class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/30 transition placeholder-white/20" />
			<input type="password" name="confirm" placeholder="Confirm new password" required
				class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/30 transition placeholder-white/20" />

			{#if form?.action === 'password' && form?.error}
				<p class="text-red-400 text-xs">{form.error}</p>
			{/if}
			{#if form?.action === 'password' && form?.success}
				<p class="text-green-400 text-xs">Password updated successfully.</p>
			{/if}

			<button type="submit" disabled={loadingPw}
				class="bg-white hover:bg-white/90 disabled:opacity-50 text-black font-bold px-5 py-2 rounded-xl text-sm transition">
				{loadingPw ? 'Saving...' : 'Update Password'}
			</button>
		</form>
	</section>

	<!-- Delete account -->
	<section class="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
		<h2 class="text-sm font-semibold text-red-400 mb-1">Delete Account</h2>
		<p class="text-xs text-white/30 mb-4">This action is permanent and cannot be undone. All your sessions will be invalidated.</p>
		<form method="POST" action="?/deleteAccount"
			use:enhance={() => {
				loadingDel = true;
				return async ({ update }) => { loadingDel = false; update(); };
			}}
			class="space-y-3">
			<input bind:value={deleteConfirm} name="confirm" placeholder='Type DELETE to confirm'
				class="w-full bg-white/5 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-500/50 transition placeholder-white/20" />

			{#if form?.action === 'delete' && form?.error}
				<p class="text-red-400 text-xs">{form.error}</p>
			{/if}

			<button type="submit" disabled={loadingDel || deleteConfirm !== 'DELETE'}
				class="bg-red-500/80 hover:bg-red-500 disabled:opacity-30 text-white font-bold px-5 py-2 rounded-xl text-sm transition">
				{loadingDel ? 'Deleting...' : 'Delete My Account'}
			</button>
		</form>
	</section>
</div>
</AppShell>
