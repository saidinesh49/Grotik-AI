<script lang="ts">
    import { createDropdownMenuContext } from './dropdown-menu-context';
    import { setContext } from 'svelte';

    const { open, setOpen } = createDropdownMenuContext();
    setContext('dropdown-menu', { open, setOpen });
</script>

<div class="relative inline-block text-left">
    <slot name="trigger" builders={[]} />
    <slot />
</div> 