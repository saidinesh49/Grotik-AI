<script lang="ts">
    export let numPeople: number = 99;
    export let avatarUrls: string[] = [];
    export let className: string = "";
    
    // Default avatar URLs if none provided
    const defaultAvatars = [
        "https://i.pravatar.cc/150?img=1",
        "https://i.pravatar.cc/150?img=2",
        "https://i.pravatar.cc/150?img=3",
        "https://i.pravatar.cc/150?img=4",
        "https://i.pravatar.cc/150?img=5",
        "https://i.pravatar.cc/150?img=6"
    ];
    
    // Use provided avatars or defaults
    $: avatars = avatarUrls.length > 0 ? avatarUrls : defaultAvatars;
    
    // Calculate how many avatars to show (max 6)
    $: displayAvatars = avatars.slice(0, 6);
    
    // Calculate the number to show in the last circle
    $: remainingCount = numPeople > 6 ? numPeople - 6 : 0;
</script>

<div class="flex items-center {className}">
    <div class="flex -space-x-4">
        {#each displayAvatars as avatar, i}
            <div class="relative">
                <img 
                    src={avatar} 
                    alt="Avatar" 
                    class="h-8 w-8 rounded-full border-2 border-white object-cover"
                    style="z-index: {displayAvatars.length - i};"
                />
            </div>
        {/each}
        
        {#if remainingCount > 0}
            <div class="flex items-center justify-center h-9 w-9 rounded-full border-2 border-white dark:border-gray-800 bg-gray-100 dark:bg-white text-xs font-medium text-gray-600 dark:text-black" style="z-index: 0;">
                +{remainingCount}
            </div>
        {/if}
    </div>
</div> 