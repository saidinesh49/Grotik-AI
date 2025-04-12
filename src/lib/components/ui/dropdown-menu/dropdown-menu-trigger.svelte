<script lang="ts">
    import { getContext } from 'svelte';
    import type { Writable } from 'svelte/store';

    export let asChild = false;
    export let builders: any[] = [];

    const { open, setOpen } = getContext<{
        open: Writable<boolean>;
        setOpen: (value: boolean) => void;
    }>('dropdown-menu');

    function handleClick() {
        setOpen(!$open);
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(!$open);
        }
    }
</script>

{#if asChild}
    <div 
        on:click={handleClick} 
        on:keydown={handleKeyDown}
    >
        <slot builders={builders} />
    </div>
{:else}
    <button
        type="button"
        class="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:ring-gray-700 dark:hover:bg-gray-700"
        aria-expanded={$open}
        aria-haspopup="true"
        on:click={handleClick}
        on:keydown={handleKeyDown}
    >
        <slot />
    </button>
{/if} 