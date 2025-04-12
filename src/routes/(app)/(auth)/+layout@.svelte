<script>
import { toast, Toaster } from 'svelte-sonner';
import { userStore, isAuthenticated } from '$lib/stores/auth';
import { goto } from '$app/navigation';
import { onMount } from 'svelte';
import LoadingOverlay from '$lib/components/ui/LoadingOverlay.svelte';
import { fade } from 'svelte/transition';
import { page } from '$app/stores';

let loading = true;

onMount(() => {
    if ($isAuthenticated && ($page.url.pathname==='/signin' || $page.url.pathname==='/signup')) {
        // Redirect user if authenticated
        goto('/dashboard');
    } else {
        // Stop loading if the user is not authenticated
        loading = false;
    }
});
</script>

<Toaster theme="dark" />

{#if loading}
    <LoadingOverlay 
        show={true} 
        text="Loading..." 
        spinnerSize="lg"
        spinnerColor="primary"
        fullScreen={true}
    />
{:else}
    <div in:fade={{ duration: 200 }}>
        <slot></slot>
    </div>
{/if}
