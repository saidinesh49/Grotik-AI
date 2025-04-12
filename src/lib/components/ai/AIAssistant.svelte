<script lang="ts">
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';
    import LoadingOverlay from '$lib/components/ui/LoadingOverlay.svelte';
    import Button from '$lib/components/ui/button/button.svelte';
    import { MessageCircle, ExternalLink } from 'lucide-svelte';
    import { theme } from '$lib/stores/theme';
    import AuroraText from '$lib/components/magic/aurora-text.svelte';

    export let embedded = false;
    export let onClose: () => void = () => {};

    let isIframeLoading = true;
    let iframeError = false;
    let iframeRef: HTMLIFrameElement;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    // URL to the Next.js AI assistant
    const assistantUrl = 'https://grotik-assistant-frontend.vercel.app'; // Local development URL
    
    // Fallback URL in case the main one fails
    const fallbackUrl = 'http://localhost:3001'; // Local fallback URL
    
    // Direct link to the Next.js app (for when iframe fails)
    const directLinkUrl = 'https://grotik-assistant-frontend.vercel.app'; // Local direct link URL

    onMount(() => {
        // Handle iframe load event
        if (iframeRef) {
            iframeRef.onload = () => {
                isIframeLoading = false;
            };
            
            iframeRef.onerror = () => {
                isIframeLoading = false;
                iframeError = true;
            };
        }

        // Subscribe to theme changes
        const unsubscribe = theme.subscribe((currentTheme) => {
            // Store theme in sessionStorage
            sessionStorage.setItem('theme', currentTheme);
        });

        return () => {
            unsubscribe();
        };
    });

    function retryLoading() {
        if (retryCount < MAX_RETRIES) {
            retryCount++;
            isIframeLoading = true;
            iframeError = false;
            
            // Try the fallback URL if we've retried at least once
            const urlToTry = retryCount > 1 ? fallbackUrl : assistantUrl;
            
            if (iframeRef) {
                iframeRef.src = urlToTry;
            }
        } else {
            // After max retries, show the error message
            iframeError = true;
        }
    }
    
    function openDirectLink() {
        window.open(directLinkUrl, '_blank');
    }
</script>

<div class="flex h-full w-full flex-col" in:fade>
    <div class="mb-4 flex items-center justify-between">
        <div class="flex-1 flex justify-center">
            <AuroraText className="text-2xl font-bold">Ask Anything✨</AuroraText>
        </div>
        {#if embedded}
            <button 
                class="btn btn-outline btn-sm" 
                on:click={onClose}
            >
                Close
            </button>
        {/if}
    </div>

    <div class="relative flex-1 overflow-hidden rounded-lg border border-base-300 bg-base-100 shadow-lg">
        <LoadingOverlay 
            show={isIframeLoading} 
            text="Loading grotik..." 
            spinnerSize="lg"
            spinnerColor="primary"
        />

        {#if iframeError}
            <div class="flex h-full flex-col items-center justify-center p-8 text-center">
                <div class="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <MessageCircle class="h-8 w-8 text-primary" />
                </div>
                <h2 class="mb-4 text-2xl font-bold text-error">Connection Error</h2>
                <p class="mb-6 text-base-content/80">
                    {#if retryCount >= MAX_RETRIES}
                        We're having trouble connecting to the AI Assistant. The Next.js deployment may not be available yet.
                    {:else}
                        Failed to load the AI Assistant. Please try again.
                    {/if}
                </p>
                <div class="flex flex-col gap-4">
                    <div class="flex gap-4">
                        <Button 
                            variant="primary" 
                            on:click={retryLoading}
                            disabled={retryCount >= MAX_RETRIES}
                        >
                            {retryCount >= MAX_RETRIES ? 'Max Retries Reached' : 'Retry'}
                        </Button>
                        <Button 
                            variant="outline" 
                            on:click={() => window.location.reload()}
                        >
                            Refresh Page
                        </Button>
                    </div>
                    
                    {#if retryCount >= MAX_RETRIES}
                        <div class="mt-4 rounded-lg bg-base-200 p-4 text-left">
                            <h3 class="mb-2 font-semibold">Troubleshooting:</h3>
                            <ol class="list-decimal pl-5 text-sm">
                                <li class="mb-1">Make sure the AI assistant server is running locally on port 3001</li>
                                <li class="mb-1">Check that the URL is correct: {directLinkUrl}</li>
                                <li class="mb-1">Try opening the AI assistant directly in a new tab</li>
                                <li>Check browser console for errors if the issue persists</li>
                            </ol>
                            <Button 
                                variant="link" 
                                class="mt-4 gap-2" 
                                on:click={openDirectLink}
                            >
                                <ExternalLink class="h-4 w-4" />
                                Open AI Assistant in new tab
                            </Button>
                        </div>
                    {/if}
                </div>
            </div>
        {:else}
            <iframe
                bind:this={iframeRef}
                src={assistantUrl}
                class="h-full w-full rounded-lg"
                title="Grotik AI Assistant"
                allow="microphone; camera"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            ></iframe>
        {/if}
    </div>
</div> 