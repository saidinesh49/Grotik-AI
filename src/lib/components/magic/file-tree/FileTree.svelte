<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { ChevronRight, ChevronDown, Folder, File } from 'lucide-svelte';

    export let data: any[] = [];
    export let selectedId: string = '';
    
    const dispatch = createEventDispatcher();
    
    let expandedFolders: Set<string> = new Set();
    
    function toggleFolder(folderId: string) {
        if (expandedFolders.has(folderId)) {
            expandedFolders.delete(folderId);
        } else {
            expandedFolders.add(folderId);
        }
        expandedFolders = expandedFolders; // Trigger reactivity
    }
    
    function handleItemClick(item: any) {
        if (item.type === 'file') {
            dispatch('select', { content: item.content, id: item.id });
        }
    }
</script>

<div class="file-tree">
    {#each data as item}
        <div class="tree-item" style="padding-left: 0rem;">
            <div 
                class="flex items-center gap-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer {selectedId === item.id ? 'bg-gray-100 dark:bg-gray-800' : ''}" 
                on:click={() => item.type === 'folder' ? toggleFolder(item.id) : handleItemClick(item)}
            >
                {#if item.type === 'folder'}
                    <span class="text-blue-500">
                        {#if expandedFolders.has(item.id)}
                            <ChevronDown class="h-4 w-4" />
                        {:else}
                            <ChevronRight class="h-4 w-4" />
                        {/if}
                        <Folder class="h-4 w-4" />
                    </span>
                {:else}
                    <span class="text-gray-700 dark:text-gray-300">
                        <File class="h-4 w-4" />
                    </span>
                {/if}
                <span class="text-sm">{item.name}</span>
            </div>
            
            {#if item.type === 'folder' && expandedFolders.has(item.id) && item.children}
                <div class="tree-children">
                    {#each item.children as child}
                        <div class="tree-item" style="padding-left: 1.5rem;">
                            <div 
                                class="flex items-center gap-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer {selectedId === child.id ? 'bg-gray-100 dark:bg-gray-800' : ''}" 
                                on:click={() => handleItemClick(child)}
                            >
                                <span class="text-gray-700 dark:text-gray-300">
                                    <File class="h-4 w-4" />
                                </span>
                                <span class="text-sm">{child.name}</span>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    {/each}
</div>

<style>
    .file-tree {
        color: inherit;
    }
    
    .tree-item {
        transition: all 0.2s ease;
    }
    
    .tree-children {
        margin-top: 0.25rem;
    }
</style> 