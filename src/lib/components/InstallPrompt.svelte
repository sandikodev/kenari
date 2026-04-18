<script lang="ts">
	import { onMount } from 'svelte';

	let deferredPrompt: any = $state(null);
	let dismissed = $state(false);

	onMount(() => {
		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			deferredPrompt = e;
		});
		window.addEventListener('appinstalled', () => {
			deferredPrompt = null;
		});
	});

	async function install() {
		if (!deferredPrompt) return;
		deferredPrompt.prompt();
		const { outcome } = await deferredPrompt.userChoice;
		if (outcome === 'accepted') deferredPrompt = null;
	}
</script>

{#if deferredPrompt && !dismissed}
	<div class="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-50
		bg-[#111] border border-white/10 rounded-2xl p-4 shadow-2xl
		animate-in slide-in-from-bottom-4 duration-300">
		<div class="flex items-start gap-3">
			<img src="/favicon.svg" class="w-10 h-10 rounded-xl shrink-0" alt="Kenari">
			<div class="flex-1 min-w-0">
				<div class="text-sm font-semibold">Install Kenari</div>
				<div class="text-xs text-white/40 mt-0.5 leading-relaxed">
					Add to your home screen for quick access to your monitoring dashboard.
				</div>
			</div>
			<button on:click={() => (dismissed = true)}
				class="text-white/20 hover:text-white/50 transition shrink-0 mt-0.5">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
				</svg>
			</button>
		</div>
		<div class="flex gap-2 mt-3">
			<button on:click={() => (dismissed = true)}
				class="flex-1 py-2 text-xs text-white/40 hover:text-white/60 border border-white/8 rounded-lg transition">
				Not now
			</button>
			<button on:click={install}
				class="flex-1 py-2 text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white rounded-lg transition">
				Install
			</button>
		</div>
	</div>
{/if}
