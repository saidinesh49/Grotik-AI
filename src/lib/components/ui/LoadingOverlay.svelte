<script lang="ts">
    import { fade } from 'svelte/transition';
    import LoadingSpinner from './LoadingSpinner.svelte';
    import { theme } from '$lib/stores/theme';
    
    export let show = false;
    export let text = 'Loading...';
    export let spinnerSize = 'lg';
    export let spinnerColor = 'primary';
    export let fullScreen = false;
    
    // Theme-aware backdrop
    $: backdropClass = $theme === 'dark' 
        ? 'bg-black/80 dark:bg-black/80' 
        : 'bg-white/80 dark:bg-white/80';
</script>

{#if show}
    <div 
        class="flex items-center justify-center {fullScreen ? 'fixed inset-0 z-50' : 'absolute inset-0 z-10'}"
        transition:fade={{ duration: 200 }}
    >
        <div class="absolute inset-0 {backdropClass} backdrop-blur-sm"></div>
        <div class="relative z-10">
            <LoadingSpinner size={spinnerSize} color={spinnerColor} text={text} />
        </div>
    </div>
{/if} 