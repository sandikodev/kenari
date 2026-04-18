<script lang="ts">
	import { enhance } from '$app/forms';
	let loading = $state(false);
	let error = $state('');
</script>

<svelte:head><title>Kenari — Login</title></svelte:head>

<div class="min-h-screen bg-black text-white flex items-center justify-center px-4">
	<div class="w-full max-w-sm">
		<div class="text-center mb-8">
			<img src="/favicon.svg" class="w-12 h-12 mx-auto mb-3" alt="Kenari">
			<h1 class="text-xl font-bold">Kenari</h1>
			<p class="text-white/30 text-sm mt-1">Sign in to your monitoring gateway</p>
		</div>

		<div class="bg-white/3 border border-white/8 rounded-2xl p-6 space-y-4">
			<a href="/auth/github"
				class="flex items-center justify-center gap-2.5 w-full bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2.5 rounded-xl text-sm font-medium transition">
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
					<path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.63-5.37-12-12-12z"/>
				</svg>
				Continue with GitHub
			</a>

			<div class="flex items-center gap-3">
				<div class="flex-1 h-px bg-white/8"></div>
				<span class="text-xs text-white/20">or</span>
				<div class="flex-1 h-px bg-white/8"></div>
			</div>

			<form method="POST"
				use:enhance={() => {
					loading = true; error = '';
					return async ({ result, update }) => {
						loading = false;
						if (result.type === 'failure') error = (result.data?.error as string) ?? 'Login failed';
						else update();
					};
				}}
				class="space-y-3">
				<input type="email" name="email" placeholder="Email" required
					class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/30 transition placeholder-white/20" />
				<input type="password" name="password" placeholder="Password" required
					class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/30 transition placeholder-white/20" />
				{#if error}<p class="text-red-400 text-xs">{error}</p>{/if}
				<button type="submit" disabled={loading}
					class="w-full bg-white hover:bg-white/90 disabled:opacity-50 text-black font-bold py-2.5 rounded-xl text-sm transition">
					{loading ? 'Signing in...' : 'Sign in'}
				</button>
			</form>
		</div>
	</div>
</div>
