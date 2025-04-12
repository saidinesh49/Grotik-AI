<script lang="ts">  
    import { onMount, onDestroy } from 'svelte';
    import { marketStore, type SingleMarketStatus, type MarketUpdate } from '$lib/stores/market';
    import { Bell, BellOff, TrendingUp, Clock, AlertTriangle, RefreshCcw, Newspaper, Lightbulb, ChevronDown, Check } from 'lucide-svelte';
    import Button from '$lib/components/ui/button/button.svelte';
    import * as Select from "$lib/components/ui/select";
    import { browser } from '$app/environment';
    import { toast } from 'svelte-sonner';

    let notificationsEnabled = false;
    let usSectorFilter = 'all';
    let inSectorFilter = 'all';
    let selectedMarket: 'US' | 'IN' = 'US';
    let isRefreshing = false;
    let expandedRows = new Set<string>();

    const usSectors = {
        all: 'All Sectors',
        Technology: 'Technology',
        Finance: 'Finance',
        'EV/Auto': 'EV / Auto',
        Healthcare: 'Healthcare',
        Energy: 'Energy',
        Retail: 'Retail'
    };

    const inSectors = {
        all: 'All Sectors',
        Conglomerate: 'Conglomerate',
        'IT Services': 'IT Services',
        Banking: 'Banking',
        'Consumer Goods': 'Consumer Goods',
        Telecom: 'Telecom',
        Infrastructure: 'Infrastructure',
        Pharmaceuticals: 'Pharmaceuticals',
        Auto: 'Auto'
    };

    $: currentMarketUpdates = $marketStore.updates.filter(update => update.market === selectedMarket);

    $: filteredUpdates = currentMarketUpdates.filter(update => {
        const sectorFilter = selectedMarket === 'US' ? usSectorFilter : inSectorFilter;
        if (sectorFilter === 'all') return true;
        return update.sector === sectorFilter;
    });

    let notifiedInsights = new Set<string>();

    $: {
        if (notificationsEnabled && browser) {
            filteredUpdates.forEach(update => {
                const insightKey = `${update.symbol}-${update.insight}`;
                if (update.insight && !notifiedInsights.has(insightKey)) {
                    toast.info(`AI Insight for ${update.name}`, {
                        description: update.insight,
                        action: {
                            label: 'Dismiss',
                            onClick: () => console.log('Dismissed Insight Notification'),
                        },
                    });
                    notifiedInsights.add(insightKey);
                }
            });
        }
    }

    onMount(() => {
        if (browser) {
            console.log('[MarketUpdates] Component mounted');
            if (Notification.permission === 'granted') {
                notificationsEnabled = true;
            } else {
                notificationsEnabled = false;
            }
            marketStore.connect();
            
            setTimeout(() => {
                if ($marketStore.updates.length === 0) {
                    console.log('[MarketUpdates] No initial data, forcing refresh');
                    refreshData();
                }
            }, 2500);
        }
    });

    onDestroy(() => {
        marketStore.disconnect();
    });

    async function toggleNotifications() {
        if (!browser) return;

        if (Notification.permission === 'granted') {
            notificationsEnabled = !notificationsEnabled;
            toast.info(`Market insight notifications ${notificationsEnabled ? 'enabled' : 'disabled'}.`);
        } else if (Notification.permission !== 'denied') {
            toast.info('Requesting notification permission...');
            try {
            const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    notificationsEnabled = true;
                    toast.success('Notification permission granted!');
                } else {
                    notificationsEnabled = false;
                    toast.error('Notification permission denied.');
                }
            } catch (error) {
                console.error("Error requesting notification permission:", error);
                toast.error('Failed to request notification permission.');
            }
        } else {
            toast.error('Notification permission was previously denied. Please enable it in your browser settings.');
            notificationsEnabled = false;
        }
    }

    function formatTimestamp(timestamp: number | undefined): string {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    function formatChange(change: number | undefined, changePercent: number | undefined): string {
        if (change === undefined || changePercent === undefined) return 'N/A';
        const sign = change >= 0 ? '+' : '';
        return `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
    }

    function formatTime(timestamp: number | null | undefined): string {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true,
            timeZoneName: 'short'
        });
    }

    function getMarketStatusInfo(marketKey: 'US' | 'IN'): { text: string; class: string; nextEventText: string } {
        const status = $marketStore.marketStatus[marketKey];
        if (!status) return { text: 'Status Unavailable', class: 'text-gray-500', nextEventText: '' };

        let text = 'Unknown';
        let cssClass = 'text-gray-500 dark:text-gray-400';
        let nextEventText = '';

        switch (status.status) {
            case 'PRE_MARKET':
                text = 'Pre-Market';
                cssClass = 'text-blue-600 dark:text-blue-400';
                if (status.nextCloseTime) nextEventText = `Regular Open: ${formatTime(status.nextCloseTime)}`;
                break;
            case 'OPEN':
                text = 'Open';
                cssClass = 'text-green-600 dark:text-green-400';
                if (status.nextCloseTime) nextEventText = `Closes: ${formatTime(status.nextCloseTime)}`;
                break;
            case 'AFTER_HOURS':
                text = 'After-Hours';
                cssClass = 'text-purple-600 dark:text-purple-400';
                if (status.nextCloseTime) nextEventText = `After-Hours End: ${formatTime(status.nextCloseTime)}`;
                break;
            case 'CLOSED':
                text = 'Closed';
                cssClass = 'text-amber-600 dark:text-amber-400';
                if (status.nextOpenTime) nextEventText = `Opens: ${formatTime(status.nextOpenTime)}`;
                break;
            default:
                text = status.status || 'Unknown';
        }
        
        if (status.status === undefined) {
            text = status.isOpen ? 'Open' : 'Closed';
            cssClass = status.isOpen ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400';
            if (status.isOpen && status.nextCloseTime) nextEventText = `Closes: ${formatTime(status.nextCloseTime)}`;
            if (!status.isOpen && status.nextOpenTime) nextEventText = `Opens: ${formatTime(status.nextOpenTime)}`;
        }

        return { text, class: cssClass, nextEventText };
    }

    async function refreshData() {
        if (isRefreshing) return;
        console.log("[MarketUpdates] Manual refresh triggered");
        isRefreshing = true;
        toast.info('Refreshing market data...');
        try {
            marketStore.forceRefresh();
            await new Promise(resolve => setTimeout(resolve, 1500));
            toast.success('Market data refresh requested.');
        } catch (error) {
            console.error("[MarketUpdates] Error refreshing data:", error);
            toast.error('Failed to refresh market data.');
        } finally {
            isRefreshing = false;
        }
    }

    function formatPrice(price: number | undefined, market: 'US' | 'IN'): string {
        if (price === undefined || price === null || price === 0) return "N/A";
        const currencySymbol = market === 'US' ? '$' : '₹';
        return `${currencySymbol}${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    function formatVolume(volume: number | undefined): string {
        if (volume === undefined || volume === null || volume === 0) return "N/A";
        return volume.toLocaleString();
    }

    function toggleRowExpansion(symbol: string) {
        if (expandedRows.has(symbol)) {
            expandedRows.delete(symbol);
        } else {
            expandedRows.add(symbol);
        }
        expandedRows = new Set(expandedRows);
    }

    function formatNewsTime(timeStr: string): string {
        if (!timeStr || timeStr.length !== 15) return '';
        try {
            const year = timeStr.substring(0, 4);
            const month = timeStr.substring(4, 6);
            const day = timeStr.substring(6, 8);
            const hour = timeStr.substring(9, 11);
            const minute = timeStr.substring(11, 13);
            const second = timeStr.substring(13, 15);
            const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
            
            const now = new Date();
            const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
            const diffMinutes = Math.round(diffSeconds / 60);
            const diffHours = Math.round(diffMinutes / 60);

            if (diffSeconds < 60) return `${diffSeconds}s ago`;
            if (diffMinutes < 60) return `${diffMinutes}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            return date.toLocaleDateString();
        } catch (e) {
            console.error("Error formatting news time:", e);
            return "";
        }
    }
</script>

<div class="flex flex-col gap-4 rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-black/20 md:p-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-2">
                <TrendingUp class="size-5" />
                <h3 class="text-xl font-semibold">Market Updates</h3>
            </div>
        <div class="flex items-center gap-1 md:gap-2">
            <Button variant="ghost" size="icon" on:click={refreshData} disabled={isRefreshing} title="Refresh Data">
                <RefreshCcw class="size-4 {isRefreshing ? 'animate-spin' : ''}" />
            </Button>
            <Button variant="ghost" size="icon" on:click={toggleNotifications} title={notificationsEnabled ? 'Disable Notifications' : 'Enable Notifications'}>
                    {#if notificationsEnabled}
                    <Bell class="size-4 text-primary" />
                    {:else}
                        <BellOff class="size-4" />
                    {/if}
                </Button>
            </div>
        </div>

    {#if $marketStore.connected}
        {@const usStatus = getMarketStatusInfo('US')}
        {@const inStatus = getMarketStatusInfo('IN')}
             <div class="flex flex-col gap-3 rounded-lg border border-black/10 bg-white/50 p-3 text-sm dark:border-white/10 dark:bg-black/50">
                 <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <span class="font-semibold">US: <span class={usStatus.class}>{usStatus.text}</span></span>
                {#if usStatus.nextEventText}
                    <span class="text-xs text-black/70 dark:text-white/70">{usStatus.nextEventText}</span>
                     {/if}
                 </div>
                 <hr class="border-black/10 dark:border-white/10">
                 <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <span class="font-semibold">IN: <span class={inStatus.class}>{inStatus.text}</span></span>
                {#if inStatus.nextEventText}
                    <span class="text-xs text-black/70 dark:text-white/70">{inStatus.nextEventText}</span>
                     {/if}
                 </div>
             </div>
         {:else if !$marketStore.connected}
        <div class="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400">
            <Clock class="size-4 animate-pulse" />
                 <span class="text-sm">Connecting to market data...</span>
              </div>
         {/if}

    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div class="flex flex-shrink-0 gap-2 border-b border-black/10 pb-2 dark:border-white/10">
            <Button
                variant={selectedMarket === 'US' ? 'default' : 'ghost'}
                size="sm"
                class="rounded-t-md rounded-b-none"
                on:click={() => selectedMarket = 'US'}
            >
                US Market
            </Button>
            <Button
                variant={selectedMarket === 'IN' ? 'default' : 'ghost'}
                size="sm"
                class="rounded-t-md rounded-b-none"
                on:click={() => selectedMarket = 'IN'}
            >
                Indian Market
            </Button>
        </div>

        {#if selectedMarket === 'US'}
            <Select.Root bind:value={usSectorFilter}>
                <Select.Trigger class="w-full md:w-[180px]" aria-label="Filter US Sector">
                    <Select.Value placeholder="Filter Sector..." />
                </Select.Trigger>
                <Select.Content>
                    {#each Object.entries(usSectors) as [value, label]}
                        <Select.Item {value}>{label}</Select.Item>
                    {/each}
                </Select.Content>
            </Select.Root>
        {:else if selectedMarket === 'IN'}
            <Select.Root bind:value={inSectorFilter}>
                <Select.Trigger class="w-full md:w-[180px]" aria-label="Filter Indian Sector">
                    <Select.Value placeholder="Filter Sector..." />
                </Select.Trigger>
                <Select.Content>
                    {#each Object.entries(inSectors) as [value, label]}
                        <Select.Item {value}>{label}</Select.Item>
            {/each}
                </Select.Content>
            </Select.Root>
        {/if}
    </div>

    <div class="overflow-x-auto">
    {#if filteredUpdates.length > 0}
            <table class="min-w-full divide-y divide-black/10 dark:divide-white/10">
                <thead class="bg-black/5 dark:bg-white/5">
                    <tr>
                        <th scope="col" class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black/60 dark:text-white/60">Symbol</th>
                        <th scope="col" class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black/60 dark:text-white/60">Price</th>
                        <th scope="col" class="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black/60 dark:text-white/60 sm:table-cell">Change</th>
                        <th scope="col" class="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black/60 dark:text-white/60 lg:table-cell">Volume</th>
                        <th scope="col" class="relative px-4 py-3">
                            <span class="sr-only">Details</span>
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-black/10 bg-white dark:divide-white/10 dark:bg-black/20">
                    {#each filteredUpdates as update (update.symbol)}
                        {@const change = update.change ?? 0}
                        {@const changePercent = update.changePercent ?? 0}
                        {@const isExpanded = expandedRows.has(update.symbol)}
                        <tr class="transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                            <td class="whitespace-nowrap px-4 py-4">
                                <div class="flex flex-col">
                                    <div class="text-sm font-medium text-black dark:text-white">{update.symbol}</div>
                                    <div class="text-xs text-black/60 dark:text-white/60 truncate max-w-[150px]">{update.name}</div>
                                    {#if update.sector && (selectedMarket === 'US' ? usSectorFilter : inSectorFilter) === 'all'}
                                        <div class="mt-1 text-[10px] text-black/50 dark:text-white/50">{update.sector}</div>
                                    {/if}
                        </div>
                            </td>
                            <td class="whitespace-nowrap px-4 py-4 text-sm font-medium" class:text-green-600={change >= 0} class:dark:text-green-400={change >= 0} class:text-red-600={change < 0} class:dark:text-red-400={change < 0}>
                                {formatPrice(update.price, update.market)}
                            </td>
                            <td class="hidden whitespace-nowrap px-4 py-4 text-sm sm:table-cell" class:text-green-600={change >= 0} class:dark:text-green-400={change >= 0} class:text-red-600={change < 0} class:dark:text-red-400={change < 0}>
                                {formatChange(change, changePercent)}
                                <div class="text-xs text-black/50 dark:text-white/50 mt-1">Last: {formatTimestamp(update.timestamp)}</div>
                            </td>
                            <td class="hidden whitespace-nowrap px-4 py-4 text-sm text-black/80 dark:text-white/80 lg:table-cell">{formatVolume(update.volume)}</td>
                            <td class="whitespace-nowrap px-4 py-4 text-right text-sm font-medium">
                                {#if update.news?.length > 0 || update.insight}
                                    <Button variant="ghost" size="sm" on:click={() => toggleRowExpansion(update.symbol)} title={isExpanded ? 'Hide Details' : 'Show Details'}>
                                        <ChevronDown class="size-4 transform transition-transform {isExpanded ? 'rotate-180' : ''}" />
                                    </Button>
                                {/if}
                            </td>
                        </tr>
                        {#if isExpanded}
                            <tr class="bg-black/5 dark:bg-white/5">
                                <td colspan="5" class="p-4">
                                    <div class="flex flex-col gap-4">
                                        {#if update.insight}
                                            <div class="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
                                                <Lightbulb class="mt-1 size-4 flex-shrink-0" />
                                                <span><strong>AI Insight:</strong> {update.insight}</span>
                    </div>
                                        {/if}
                                        
                                        {#if update.news && update.news.length > 0}
                                            <div>
                                                <h4 class="mb-2 text-xs font-medium uppercase tracking-wider text-black/60 dark:text-white/60">Recent News</h4>
                                                <ul class="space-y-3">
                                                    {#each update.news as newsItem}
                                                        <li class="flex items-start gap-2 text-sm">
                                                            <Newspaper class="mt-1 size-4 flex-shrink-0 text-black/50 dark:text-white/50" />
                                                            <div>
                                                                <a href={newsItem.url} target="_blank" rel="noopener noreferrer" class="font-medium text-primary hover:underline">
                                                                    {newsItem.title}
                                                                </a>
                                                                <p class="mt-0.5 text-xs text-black/70 dark:text-white/70">{newsItem.summary}</p>
                                                                <p class="mt-1 text-[10px] text-black/50 dark:text-white/50">
                                                                    {newsItem.source} - {formatNewsTime(newsItem.time_published)}
                                                                </p>
                                                            </div>
                                                        </li>
                                                    {/each}
                                                </ul>
                                            </div>
                    {/if}
                    </div>
                                </td>
                            </tr>
                        {/if}
                    {/each}
                </tbody>
            </table>
        {:else if $marketStore.connected && currentMarketUpdates.length === 0 && filteredUpdates.length === 0 && (selectedMarket === 'US' ? usSectorFilter : inSectorFilter) !== 'all'}
            <div class="flex items-center justify-center gap-2 p-6 text-sm text-black/60 dark:text-white/60">
                <AlertTriangle class="size-4" />
                <span>No stocks found for the selected sector in {selectedMarket}.</span>
                </div>
        {:else if $marketStore.connected && $marketStore.updates.length > 0 && filteredUpdates.length === 0}
            <div class="flex items-center justify-center gap-2 p-6 text-sm text-black/60 dark:text-white/60">
                <Clock class="size-4" />
                <span>Waiting for initial market data for {selectedMarket}...</span>
        </div>
        {:else if !$marketStore.connected}
    {:else}
            <div class="flex items-center justify-center gap-2 p-6 text-sm text-black/60 dark:text-white/60">
                <AlertTriangle class="size-4" />
                <span>No market data available at the moment.</span>
        </div>
    {/if}
    </div>
</div>
