<script lang="ts">
    import { theme } from '$lib/stores/theme';
    
    export let size = 'md';
    export let color = 'primary';
    export let text = '';
    
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
        xl: 'h-16 w-16'
    };
    
    const colorClasses = {
        primary: 'border-primary',
        secondary: 'border-secondary',
        accent: 'border-accent',
        neutral: 'border-neutral',
        info: 'border-info',
        success: 'border-success',
        warning: 'border-warning',
        error: 'border-error'
    };
    
    // Theme-aware text color
    $: textColorClass = $theme === 'dark' ? 'text-white/80' : 'text-black/80';
</script>

<div class="flex flex-col items-center justify-center">
    <div class="animate-spin rounded-full border-t-2 border-b-2 {sizeClasses[size]} {colorClasses[color]}"></div>
    {#if text}
        <p class="mt-2 text-sm {textColorClass}">{text}</p>
    {/if}
</div> 