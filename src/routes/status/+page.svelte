<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const time = $derived(new Date(data.checkedAt).toLocaleTimeString());
</script>

<svelte:head><title>Kenari — Status</title></svelte:head>

<div class="min-h-screen bg-black text-white flex flex-col">
	<div class="flex-1 flex flex-col items-center justify-center px-6 py-16">
		<div class="w-full max-w-2xl">
			<div class="text-center mb-12">
				<img src="/favicon.svg" class="w-12 h-12 mx-auto mb-4" alt="Kenari">
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
							<span class="text-xl leading-none">{svc.icon}</span>
							<div>
								<div class="font-medium text-sm">{svc.name}</div>
								<div class="text-white/30 text-xs">{svc.description}</div>
							</div>
						</div>
						<div class="flex items-center gap-3">
							<span class="text-xs text-white/30 tabular-nums">{svc.latency}ms</span>
							<span class={`text-xs font-semibold px-2.5 py-1 rounded-full ${svc.online ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
								{svc.online ? 'Operational' : 'Down'}
							</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<footer class="border-t border-white/5 py-3 text-center text-xs text-white/15">
		Powered by <a href="https://github.com/sandikodev/kenari" target="_blank" class="hover:text-white/40 transition">Kenari</a>
	</footer>
</div>
