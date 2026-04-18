<script lang="ts">
	let { user, children }: { user: { name: string; role: string } | null; children: any } = $props();
</script>

<div class="min-h-screen bg-black text-white flex flex-col">
	<nav class="border-b border-white/8 px-6 h-14 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur z-50">
		<div class="flex items-center gap-6">
			<a href="/" class="flex items-center gap-2 font-semibold text-sm">
				<span>🐦</span> Kenari
			</a>
			{#if user}
				<div class="hidden sm:flex items-center gap-1">
					<a href="/" class="text-xs text-white/50 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition">Dashboard</a>
					<a href="/status" class="text-xs text-white/50 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition">Status</a>
					{#if user.role === 'admin'}
						<a href="/admin" class="text-xs text-white/50 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition">Admin</a>
					{/if}
				</div>
			{/if}
		</div>
		{#if user}
			<div class="flex items-center gap-3">
				<span class="text-xs text-white/40 hidden sm:block">{user.name}</span>
				{#if user.role === 'admin'}
					<span class="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">admin</span>
				{/if}
				<form method="POST" action="/logout">
					<button class="text-xs text-white/40 hover:text-white transition">Logout</button>
				</form>
			</div>
		{/if}
	</nav>
	<main class="flex-1">
		{@render children()}
	</main>
</div>
