<script lang="ts">
	import { page } from '$app/stores';
	let { user, children }: { user: { name: string; role: string; avatarUrl?: string | null } | null; children: any } = $props();
	let open = $state(false);

	const isActive = (path: string) => $page.url.pathname === path;

	async function signOut() {
		await fetch('/logout', { method: 'POST' });
		window.location.href = '/login';
	}
</script>

<svelte:window onclick={() => (open = false)} />

<div class="min-h-screen bg-black text-white flex flex-col">

	<!-- Desktop nav -->
	<nav class="border-b border-white/8 px-5 h-14 hidden sm:flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur z-50">
		<div class="flex items-center gap-5">
			<a href="/" class="flex items-center gap-2 font-semibold text-sm shrink-0">
				<img src="/favicon.svg" class="w-5 h-5" alt=""> Kenari
			</a>
			{#if user}
				<div class="flex items-center gap-0.5">
					<a href="/" class={`text-xs px-3 py-1.5 rounded-lg transition ${isActive('/') ? 'text-white bg-white/8' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>Dashboard</a>
					<a href="/registry" class={`text-xs px-3 py-1.5 rounded-lg transition ${isActive('/registry') ? 'text-white bg-white/8' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>Registry</a>
					<a href="/status" class={`text-xs px-3 py-1.5 rounded-lg transition ${isActive('/status') ? 'text-white bg-white/8' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>Status</a>
					{#if user.role === 'admin'}
						<a href="/console" class={`text-xs px-3 py-1.5 rounded-lg transition ${isActive('/console') ? 'text-white bg-white/8' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>Console</a>
					{/if}
				</div>
			{/if}
		</div>

		{#if user}
			<div class="relative">
				<button onclick={(e) => { e.stopPropagation(); open = !open; }}
					class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition">
					<div class="w-6 h-6 rounded-full overflow-hidden bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">
						{#if user.avatarUrl}
							<img src={user.avatarUrl} alt={user.name} class="w-full h-full object-cover">
						{:else}
							{user.name[0].toUpperCase()}
						{/if}
					</div>
					<span class="text-sm">{user.name}</span>
					{#if user.role === 'admin'}
						<span class="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-full">admin</span>
					{/if}
					<svg class={`w-3 h-3 text-white/20 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
					</svg>
				</button>

				{#if open}
					<div class="absolute right-0 top-full mt-2 w-44 bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
						<div class="px-4 py-3 border-b border-white/8">
							<div class="text-sm font-semibold">{user.name}</div>
							<div class="text-xs text-white/30 mt-0.5 capitalize">{user.role}</div>
						</div>
						<div class="p-1.5 flex flex-col gap-0.5">
							<a href="/settings" class="px-3 py-2 text-sm text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition">Settings</a>
							<a href="https://github.com/sandikodev/kenari" target="_blank" class="px-3 py-2 text-sm text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition">GitHub</a>
						</div>
						<div class="p-1.5 border-t border-white/8">
							<button onclick={signOut} class="w-full text-left px-3 py-2 text-sm text-red-400/60 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition">Sign out</button>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</nav>

	<!-- Mobile top bar -->
	<header class="sm:hidden border-b border-white/8 px-4 h-12 flex items-center justify-between sticky top-0 bg-black/90 backdrop-blur z-50">
		<a href="/" class="flex items-center gap-2 font-semibold text-sm">
			<img src="/favicon.svg" class="w-5 h-5" alt=""> Kenari
		</a>
		{#if user}
			<div class="flex items-center gap-2">
				{#if user.role === 'admin'}
					<span class="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-full">admin</span>
				{/if}
				<a href="/settings">
					<div class="w-7 h-7 rounded-full overflow-hidden bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">
						{#if user.avatarUrl}
							<img src={user.avatarUrl} alt={user.name} class="w-full h-full object-cover">
						{:else}
							{user.name[0].toUpperCase()}
						{/if}
					</div>
				</a>
			</div>
		{/if}
	</header>

	<!-- Content -->
	<main class="flex-1 pb-20 sm:pb-0">
		{@render children()}
	</main>

	<!-- Desktop footer -->
	<footer class="hidden sm:block border-t border-white/5 py-3 text-center text-xs text-white/15">
		Powered by <a href="https://github.com/sandikodev/kenari" target="_blank" class="hover:text-white/40 transition">Kenari</a>
	</footer>

	<!-- Mobile bottom nav -->
	{#if user}
		<nav class="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-black/90 backdrop-blur border-t border-white/8"
			style="padding-bottom: env(safe-area-inset-bottom)">
			<div class="flex items-center">
				<a href="/" class={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition ${isActive('/') ? 'text-white' : 'text-white/30'}`}>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
						<path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
					</svg>
					Dashboard
				</a>
				<a href="/registry" class={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition ${isActive('/registry') ? 'text-white' : 'text-white/30'}`}>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
						<path stroke-linecap="round" stroke-linejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18"/>
					</svg>
					Agents
				</a>
				<a href="/status" class={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition ${isActive('/status') ? 'text-white' : 'text-white/30'}`}>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
						<path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
					</svg>
					Status
				</a>
				{#if user.role === 'admin'}
					<a href="/console" class={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition ${isActive('/console') ? 'text-white' : 'text-white/30'}`}>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
							<path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
							<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
						</svg>
						Console
					</a>
				{/if}
				<a href="/settings" class={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition ${isActive('/settings') ? 'text-white' : 'text-white/30'}`}>
					<div class="w-5 h-5 rounded-full overflow-hidden bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">
						{#if user.avatarUrl}
							<img src={user.avatarUrl} alt="" class="w-full h-full object-cover">
						{:else}
							{user.name[0].toUpperCase()}
						{/if}
					</div>
					You
				</a>
			</div>
		</nav>
	{/if}
</div>
