<script lang="ts">
    import { fade } from 'svelte/transition';
    import LoadingSpinner from './LoadingSpinner.svelte';
    import { theme } from '$lib/stores/theme';
    
    export let text = 'Loading...';
    export let spinnerSize = 'lg';
    export let spinnerColor = 'primary';
    export let showBackdrop = true;
    export let showLogo = false;
    
    // Theme-aware backdrop
    $: backdropClass = $theme === 'dark' 
        ? 'bg-black/50 dark:bg-black/50' 
        : 'bg-white/50 dark:bg-white/50';
</script>

<div 
    class="flex min-h-[50vh] flex-col bg-white text-black dark:bg-black dark:text-white items-center justify-center p-8 text-center"
    transition:fade={{ duration: 200 }}
>
    {#if showLogo}
        <div class="mb-8">
            <img src="/logo.svg" alt="Grotik Logo" class="h-12 w-auto" />
        </div>
    {/if}
    
    <LoadingSpinner size={spinnerSize} color={spinnerColor} text={text} />
    
    {#if showBackdrop}
        <div class="absolute inset-0 -z-10 {backdropClass} backdrop-blur-sm"></div>
    {/if}
</div> 