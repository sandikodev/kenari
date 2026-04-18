<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<div class="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
	<!-- Header -->
	<header class="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<span class="text-blue-400 text-xl">⬡</span>
			<span class="font-semibold">Monitor Gateway</span>
			<span class="text-xs text-gray-600">***REMOVED*** Lab</span>
		</div>
		<div class="flex items-center gap-4 text-sm">
			<span class="text-gray-400">{(data.user as unknown as { name: string } | null)?.name}</span>
			<form method="POST" action="/logout">
				<button class="text-gray-500 hover:text-white transition">Logout</button>
			</form>
		</div>
	</header>

	<!-- Dashboard -->
	<main class="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
		<h1 class="text-2xl font-bold mb-2">Monitoring Dashboard</h1>
		<p class="text-gray-500 text-sm mb-8">Semua tools monitoring dalam satu pintu masuk.</p>

		<div class="grid sm:grid-cols-2 gap-4">
			{#each data.routes as route}
				<a
					href={route.proxyPath}
					class="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-blue-500/50 transition group block"
				>
					<div class="flex items-start gap-4">
						<span class="text-3xl">{route.icon}</span>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 mb-1">
								<h2 class="font-semibold group-hover:text-blue-400 transition">{route.name}</h2>
								<span
									class={`w-2 h-2 rounded-full flex-shrink-0 ${data.health[route.id] ? 'bg-green-500' : 'bg-red-500'}`}
									title={data.health[route.id] ? 'Online' : 'Offline'}
								></span>
							</div>
							<p class="text-sm text-gray-500">{route.description}</p>
							<p class="text-xs text-gray-700 mt-2">{route.proxyPath}</p>
						</div>
					</div>
				</a>
			{/each}
		</div>
	</main>

	<footer class="text-center text-xs text-gray-700 py-4">
		Monitor Gateway · <a href="https://github.com/sandikodev/monitor-gateway" class="hover:text-gray-500 transition">Open Source</a>
	</footer>
</div>
