<script lang="ts">
	import '../app.css';
    import { theme } from '$lib/stores/theme';
    import { onMount } from 'svelte';
    import Header from '$lib/layout/Header.svelte';
    import { page } from '$app/stores';

    // Routes where header should not be shown
    const routesWithoutHeader = ['/signin', '/signup', '/auth/reset-password'];
    $: showHeader = !routesWithoutHeader.includes($page.url.pathname);

    onMount(() => {
        theme.initialize();
    });
</script>

<div class="flex min-h-screen flex-col bg-background">
    {#if showHeader}
        <Header />
    {/if}
    
    <!-- Main Content -->
    <main class="flex-1">
        <slot />
    </main>

    <!-- Footer -->
</div>
