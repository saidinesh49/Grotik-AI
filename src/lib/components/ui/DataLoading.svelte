<script lang="ts">
    import { fade } from 'svelte/transition';
    import LoadingSpinner from './LoadingSpinner.svelte';
    import { theme } from '$lib/stores/theme';
    
    export let text = 'Loading data...';
    export let spinnerSize = 'md';
    export let spinnerColor = 'primary';
    export let showSkeleton = false;
    export let skeletonCount = 3;
    
    // Theme-aware skeleton colors
    $: skeletonBgClass = $theme === 'dark' 
        ? 'bg-gray-800 dark:bg-gray-800' 
        : 'bg-gray-200 dark:bg-gray-200';
    
    $: skeletonContentClass = $theme === 'dark' 
        ? 'bg-gray-700 dark:bg-gray-700' 
        : 'bg-gray-300 dark:bg-gray-300';
</script>

<div transition:fade={{ duration: 150 }}>
    {#if showSkeleton}
        <div class="space-y-4">
            {#each Array(skeletonCount) as _, i}
                <div class="animate-pulse rounded-lg {skeletonBgClass} p-4">
                    <div class="h-4 w-3/4 rounded {skeletonContentClass}"></div>
                    <div class="mt-2 h-4 w-1/2 rounded {skeletonContentClass}"></div>
                </div>
            {/each}
        </div>
    {:else}
        <div class="flex flex-col items-center justify-center py-8">
            <LoadingSpinner size={spinnerSize} color={spinnerColor} text={text} />
        </div>
    {/if}
</div> 