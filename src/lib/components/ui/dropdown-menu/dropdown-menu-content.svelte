<script lang="ts">
    import { getContext, onMount } from 'svelte';
    import { fade } from 'svelte/transition';
    import type { Writable } from 'svelte/store';

    const { open } = getContext<{
        open: Writable<boolean>;
        setOpen: (value: boolean) => void;
    }>('dropdown-menu');

    let contentElement: HTMLDivElement;

    onMount(() => {
        function handleClickOutside(event: MouseEvent) {
            if (contentElement && !contentElement.contains(event.target as Node)) {
                open.set(false);
            }
        }

        document.addEventListener('click', handleClickOutside);

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    });
</script>

{#if $open}
    <div
        bind:this={contentElement}
        class="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800 dark:ring-gray-700"
        transition:fade={{ duration: 100 }}
        role="menu"
        aria-orientation="vertical"
        tabindex="-1"
    >
        <div class="py-1" role="none">
            <slot />
        </div>
    </div>
{/if} 