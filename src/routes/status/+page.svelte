<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const time = new Date(data.checkedAt).toLocaleTimeString();
</script>

<svelte:head><title>Kenari — Status</title></svelte:head>

<div class="min-h-screen bg-black text-white">
	<div class="max-w-2xl mx-auto px-6 py-16">
		<div class="text-center mb-12">
			<div class="text-3xl mb-4">🐦</div>
			<div class={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-4 ${data.allOnline ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
				<span class={`w-2 h-2 rounded-full ${data.allOnline ? 'bg-green-400' : 'bg-red-400'}`}></span>
				{data.allOnline ? 'All systems operational' : 'Degraded performance'}
			</div>
			<p class="text-white/30 text-xs">Last checked at {time}</p>
		</div>

		<div class="space-y-2">
			{#each data.checks as svc}
				<div class="flex items-center justify-between bg-white/3 border border-white/8 rounded-xl px-5 py-4">
					<div class="flex items-center gap-3">
						<span class="text-xl">{svc.icon}</span>
						<div>
							<div class="font-medium text-sm">{svc.name}</div>
							<div class="text-white/30 text-xs">{svc.description}</div>
						</div>
					</div>
					<div class="flex items-center gap-3 text-right">
						<span class="text-xs text-white/30">{svc.latency}ms</span>
						<span class={`text-xs font-semibold px-2.5 py-1 rounded-full ${svc.online ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
							{svc.online ? 'Operational' : 'Down'}
						</span>
					</div>
				</div>
			{/each}
		</div>

		<p class="text-center text-white/20 text-xs mt-10">
			Powered by <a href="https://github.com/sandikodev/kenari" class="hover:text-white/50 transition">Kenari</a>
		</p>
	</div>
</div>
