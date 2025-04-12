<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { fade } from 'svelte/transition';
    import { userStore } from '$lib/stores/auth';
    import Button from '$lib/components/ui/button/button.svelte';
    import { ArrowLeft } from 'lucide-svelte';
    import AIAssistant from '$lib/components/ai/AIAssistant.svelte';

    onMount(() => {
        if (!$userStore.user) {
            goto('/signin');
        }
    });

    function goBack() {
        goto('/dashboard');
    }
</script>

<div class="flex h-screen flex-col px-4 py-8" in:fade>
    <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-2">
            <button 
                class="btn btn-circle btn-ghost btn-sm" 
                on:click={goBack}
                aria-label="Go back"
            >
                <ArrowLeft class="h-5 w-5" />
            </button>
            <h1 class="text-3xl font-bold">Grotik AI Assistant</h1>
        </div>
    </div>

    <div class="flex-1">
        <AIAssistant />
    </div>
</div> 