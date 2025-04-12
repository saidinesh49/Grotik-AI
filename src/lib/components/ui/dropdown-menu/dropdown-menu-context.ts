import { writable } from 'svelte/store';

export function createDropdownMenuContext() {
    const open = writable(false);
    const setOpen = (value: boolean) => open.set(value);

    return {
        open,
        setOpen
    };
} 