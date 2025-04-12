<script lang="ts">
    import { getContext } from 'svelte';
    import type { Writable } from 'svelte/store';
    import { cn } from '$lib/utils';

    const { setOpen } = getContext<{
        open: Writable<boolean>;
        setOpen: (value: boolean) => void;
    }>('dropdown-menu');

    export let disabled = false;
    export let className: string | undefined = undefined;

    function handleClick() {
        if (!disabled) {
            setOpen(false);
        }
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            setOpen(false);
        }
    }
</script>

<div
    class={cn(
        "block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700",
        disabled && "cursor-not-allowed opacity-50",
        !disabled && "cursor-pointer",
        className
    )}
    role="menuitem"
    tabindex="-1"
    on:click={handleClick}
    on:keydown={handleKeyDown}
>
    <slot />
</div> 