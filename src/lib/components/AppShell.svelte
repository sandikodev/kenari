<script lang="ts">
	let { user, children }: { user: { name: string; role: string } | null; children: any } = $props();
	let open = $state(false);
</script>

<svelte:window on:click={() => (open = false)} />

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
			<div class="relative">
				<button
					on:click|stopPropagation={() => (open = !open)}
					class="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition"
				>
					<div class="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
						{user.name[0].toUpperCase()}
					</div>
					<span class="text-sm hidden sm:block">{user.name}</span>
					{#if user.role === 'admin'}
						<span class="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-full hidden sm:block">admin</span>
					{/if}
					<svg class={`w-3.5 h-3.5 text-white/30 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
					</svg>
				</button>

				{#if open}
					<div class="absolute right-0 top-full mt-2 w-52 bg-[#111] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
						<div class="px-4 py-3 border-b border-white/8">
							<div class="text-sm font-medium">{user.name}</div>
							<div class="text-xs text-white/30 mt-0.5 capitalize">{user.role}</div>
						</div>
						<div class="p-1">
							<a href="/status" class="flex items-center gap-2.5 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition">
								<span class="text-base">🟢</span> Status Page
							</a>
							{#if user.role === 'admin'}
								<a href="/admin" class="flex items-center gap-2.5 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition">
									<span class="text-base">⚙️</span> Admin
								</a>
							{/if}
							<a href="https://github.com/sandikodev/kenari" target="_blank" class="flex items-center gap-2.5 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition">
								<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>
								GitHub
							</a>
						</div>
						<div class="p-1 border-t border-white/8">
							<form method="POST" action="/logout">
								<button class="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-400/70 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition">
									<span class="text-base">↩</span> Sign out
								</button>
							</form>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</nav>
	<main class="flex-1">
		{@render children()}
	</main>
</div>
