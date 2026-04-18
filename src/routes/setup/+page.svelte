<script lang="ts">
	import { enhance } from '$app/forms';
	let loading = $state(false);
	let error = $state('');
</script>

<div class="min-h-screen bg-black text-white flex items-center justify-center px-4">
	<div class="w-full max-w-sm">
		<div class="text-center mb-8">
			<div class="text-4xl mb-3">🐦</div>
			<h1 class="text-xl font-bold">Welcome to Kenari</h1>
			<p class="text-white/40 text-sm mt-1">Create your admin account to get started</p>
		</div>

		<div class="bg-white/3 border border-white/8 rounded-2xl p-6">
			<div class="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-5">
				<span>⚡</span> First-run setup — this page disappears after setup
			</div>

			<form
				method="POST"
				use:enhance={() => {
					loading = true; error = '';
					return async ({ result, update }) => {
						loading = false;
						if (result.type === 'failure') error = (result.data?.error as string) ?? 'Setup failed';
						else update();
					};
				}}
				class="space-y-3"
			>
				<input name="name" placeholder="Your name" required
					class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/30 transition placeholder-white/20" />
				<input name="email" type="email" placeholder="Email" required
					class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/30 transition placeholder-white/20" />
				<input name="password" type="password" placeholder="Password (min 8 chars)" required
					class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/30 transition placeholder-white/20" />
				{#if error}<p class="text-red-400 text-xs">{error}</p>{/if}
				<button type="submit" disabled={loading}
					class="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-2.5 rounded-xl text-sm transition">
					{loading ? 'Creating...' : 'Create Admin Account →'}
				</button>
			</form>
		</div>
	</div>
</div>
