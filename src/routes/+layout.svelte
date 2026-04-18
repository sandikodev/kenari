<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import InstallPrompt from '$lib/components/InstallPrompt.svelte';

	let { children } = $props();
	let ready = $state(false);

	onMount(() => {
		const t = setTimeout(() => (ready = true), 1200);
		return () => clearTimeout(t);
	});
</script>

<svelte:head>
	<link rel="icon" href="/favicon.svg" type="image/svg+xml">
</svelte:head>

{#if !ready}
	<div class="splash">
		<div class="splash-inner">
			<div class="bird"><img src="/favicon.svg" style="width:5rem;height:5rem;filter:drop-shadow(0 8px 32px rgba(14,165,233,0.5))" alt=""></div>
			<div class="wordmark">Kenari</div>
			<div class="bar"><div class="bar-fill"></div></div>
		</div>
	</div>
{/if}

<div class="app" class:visible={ready}>
	{@render children()}
</div>

<InstallPrompt />

<style>
	.splash {
		position: fixed; inset: 0; z-index: 9999;
		background: #000;
		display: flex; align-items: center; justify-content: center;
		animation: fadeOut 0.4s ease 0.9s forwards;
	}
	.splash-inner {
		display: flex; flex-direction: column; align-items: center; gap: 16px;
	}
	.bird {
		font-size: 3rem; line-height: 1;
		animation: drop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}	.wordmark {
		font-family: -apple-system, BlinkMacSystemFont, sans-serif;
		font-size: 1.25rem; font-weight: 700; color: #fff; letter-spacing: -0.03em;
		animation: fadeUp 0.4s ease 0.2s both;
	}
	.bar {
		width: 120px; height: 2px; background: rgba(255,255,255,0.08); border-radius: 2px;
		overflow: hidden;
		animation: fadeUp 0.4s ease 0.3s both;
	}
	.bar-fill {
		height: 100%; width: 0; background: #0ea5e9; border-radius: 2px;
		animation: load 0.7s ease 0.3s forwards;
	}
	.app {
		opacity: 0; transition: opacity 0.3s ease;
	}
	.app.visible { opacity: 1; }

	@keyframes drop {
		from { opacity: 0; transform: translateY(-20px) scale(0.8); }
		to   { opacity: 1; transform: translateY(0) scale(1); }
	}
	@keyframes fadeUp {
		from { opacity: 0; transform: translateY(8px); }
		to   { opacity: 1; transform: translateY(0); }
	}
	@keyframes load {
		from { width: 0; }
		to   { width: 100%; }
	}
	@keyframes fadeOut {
		from { opacity: 1; pointer-events: all; }
		to   { opacity: 0; pointer-events: none; }
	}
</style>
