<script lang="ts">
    import { theme } from '$lib/stores/theme';
    import { Sun, Moon } from 'lucide-svelte';
    import Button from '$lib/components/ui/button/button.svelte';

    function toggleTheme() {
        theme.setTheme($theme === 'dark' ? 'light' : 'dark');
    }
</script>

<Button
    variant="ghost"
    size="icon"
    on:click={toggleTheme}
    class="relative size-9 hover:bg-gray-100 dark:hover:bg-gray-800"
>
    <Sun class="size-5 rotate-90 scale-0 transition-transform dark:-rotate-0 dark:scale-100" />
    <Moon
        class="absolute size-5 rotate-0 scale-100 transition-transform dark:rotate-90 dark:scale-0"
    />
    <span class="sr-only">Toggle theme</span>
</Button> 