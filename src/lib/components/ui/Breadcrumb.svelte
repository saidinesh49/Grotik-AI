<script lang="ts">
    import { ChevronRight } from 'lucide-svelte';
    import { goto } from '$app/navigation';
    
    export let items: { label: string; path?: string }[] = [];
</script>

<nav class="text-sm breadcrumbs py-2 px-4 bg-base-200 rounded-lg mb-4">
    <ul class="flex flex-wrap items-center">
        {#each items as item, index}
            <li class="flex items-center">
                {#if index > 0}
                    <ChevronRight class="h-4 w-4 mx-2 text-base-content/60" />
                {/if}
                {#if item.path}
                    <a 
                        href={item.path} 
                        class="hover:text-primary transition-colors"
                        on:click|preventDefault={() => goto(item.path)}
                    >
                        {item.label}
                    </a>
                {:else}
                    <span class="text-base-content/80">{item.label}</span>
                {/if}
            </li>
        {/each}
    </ul>
</nav> 