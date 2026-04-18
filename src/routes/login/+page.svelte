<script lang="ts">
	import { enhance } from '$app/forms';
	let loading = $state(false);
	let error = $state('');
</script>

<div class="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center px-4">
	<div class="w-full max-w-sm">
		<div class="text-center mb-8">
			<span class="text-blue-400 text-4xl">⬡</span>
			<h1 class="text-xl font-bold mt-3">Monitor Gateway</h1>
			<p class="text-gray-500 text-sm mt-1">***REMOVED*** Lab</p>
		</div>

		<div class="bg-gray-900 border border-gray-800 rounded-2xl p-6">
			<form
				method="POST"
				use:enhance={() => {
					loading = true;
					error = '';
					return async ({ result, update }) => {
						loading = false;
						if (result.type === 'failure') error = (result.data?.error as string) ?? 'Login gagal';
						else update();
					};
				}}
				class="space-y-3"
			>
				<input
					type="email"
					name="email"
					placeholder="Email"
					required
					class="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition placeholder-gray-600"
				/>
				<input
					type="password"
					name="password"
					placeholder="Password"
					required
					class="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition placeholder-gray-600"
				/>
				{#if error}<p class="text-red-400 text-xs">{error}</p>{/if}
				<button
					type="submit"
					disabled={loading}
					class="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-semibold text-sm transition"
				>
					{loading ? 'Memproses...' : 'Masuk'}
				</button>
			</form>
		</div>
	</div>
</div>
