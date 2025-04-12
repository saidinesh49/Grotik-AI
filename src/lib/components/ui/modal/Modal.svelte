<script lang="ts">
    import { fade, scale } from 'svelte/transition';
    import { X } from 'lucide-svelte';
    import Button from '../button/button.svelte';

    export let isOpen = false;
    export let onClose: () => void;
</script>

{#if isOpen}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center"
        transition:fade={{ duration: 200 }}
    >
        <!-- Backdrop -->
        <div
            class="absolute inset-0 bg-black/50 backdrop-blur-sm"
            on:click={onClose}
            transition:fade={{ duration: 200 }}
        />

        <!-- Modal -->
        <div
            class="relative z-50 w-full max-w-lg"
            transition:scale={{ duration: 200, start: 0.95 }}
        >
            <div class="relative">
                <Button
                    on:click={onClose}
                    class="absolute right-4 top-4 z-10 size-8 rounded-full p-0"
                    variant="ghost"
                >
                    <X class="size-4" />
                </Button>
                <slot />
            </div>
        </div>
    </div>
{/if} 