<script lang="ts">
    import { userStore } from '$lib/stores/auth';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { User, BookOpen, Activity, Coins, Brain, MessageCircle, Settings, Trophy, Target, Book, X, Bot } from 'lucide-svelte';
    import BorderBeam from '$lib/components/magic/borderbeam/BorderBeam.svelte';
    import Button from '$lib/components/ui/button/button.svelte';
    import { inview } from 'svelte-inview';
    import AIAssistant from '$lib/components/ai/AIAssistant.svelte';
    import MarketUpdates from '$lib/components/market/MarketUpdates.svelte';
    import { MagicGradientButton } from '$lib/components/magic';

    onMount(() => {
        if (!$userStore.user) {
            goto('/signin');
        }
    });

    let inView = {
        welcome: false,
        stats: false,
        activities: false
    };

    let showAIAssistant = false;

    const handleChange = (section: keyof typeof inView) => ({ detail }) => {
        inView[section] = detail.inView;
    };

    const learningStats = [
        { 
            icon: BookOpen, 
            label: 'Courses Completed', 
            value: '8', 
            change: '+2 this week',
            color: 'bg-black text-white dark:bg-white dark:text-black',
            link: '/courses'
        },
        { 
            icon: Activity, 
            label: 'Learning Streak', 
            value: '5 days', 
            change: 'Keep it up!',
            color: 'bg-black/10 text-black dark:bg-white/10 dark:text-white'
        },
        { 
            icon: MessageCircle, 
            label: 'AI Conversations', 
            value: '15', 
            change: '3 new today',
            color: 'bg-black/10 text-black dark:bg-white/10 dark:text-white',
            link: '/assistant'
        },
        { 
            icon: Coins, 
            label: 'Practice Sessions', 
            value: '4', 
            change: 'Last: 1 hour ago',
            color: 'bg-black/10 text-black dark:bg-white/10 dark:text-white'
        }
    ];

    const recentActivities = [
        {
            type: 'course',
            icon: BookOpen,
            title: 'Basic Banking Course',
            time: '1 hour ago',
            description: 'Completed introduction to banking terms'
        },
        {
            type: 'practice',
            icon: Coins,
            title: 'Banking Simulation',
            time: '3 hours ago',
            description: 'Practiced account management tasks'
        },
        {
            type: 'conversation',
            icon: Brain,
            title: 'AI Learning Session',
            time: '1 day ago',
            description: 'Discussion about investment basics'
        }
    ];

    const menuItems = [
        { icon: Book, label: 'Courses', href: '/courses' },
        { icon: Trophy, label: 'Progress', href: '/progress' },
        { icon: Target, label: 'Goals', href: '/goals' },
        { icon: Settings, label: 'Settings', href: '/settings' }
    ];

    function toggleAIAssistant() {
        goto('/assistant');
    }
</script>

<svelte:head>
    <title>Dashboard | Grotik</title>
    <meta name="description" content="Your financial learning dashboard" />
</svelte:head>

<div class="container max-w-7xl px-4 py-12">
    <!-- Welcome Section -->
    <div 
        use:inview={{
            unobserveOnEnter: true,
            rootMargin: '-100px'
        }}
        on:inview_change={handleChange('welcome')}
        class="relative mb-12 overflow-hidden rounded-2xl border border-black/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-black/20 {inView.welcome ? 'animate-fade-up' : ''} opacity-0"
    >
        <BorderBeam
            size={150}
            duration={10}
            delay={0}
            colorFrom="var(--color-one)"
            colorTo="var(--color-two)"
        />
        <div class="relative z-10">
            <div class="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
                <div class="flex items-center gap-4">
                    {#if $userStore.user?.photoURL}
                        <img
                            src={$userStore.user.photoURL}
                            alt="Profile"
                            class="size-16 rounded-full border-2 border-black/10 object-cover dark:border-white/10"
                        />
                    {:else}
                        <div class="flex size-16 items-center justify-center rounded-full border-2 border-black bg-white dark:border-white dark:bg-black">
                            <User class="size-8 text-black dark:text-white" />
                        </div>
                    {/if}
                    <div>
                        <p class="text-sm text-black/60 dark:text-white/60">Welcome back</p>
                        <h2 class="text-2xl font-bold text-black dark:text-white">{$userStore.user?.displayName || 'User'}</h2>
                    </div>
                </div>
                <div class="flex flex-col gap-5">
                    <MagicGradientButton 
                        size="md"
                        gradientColors={{
                            firstColor: '#ff00aa',
                            secondColor: '#00FFF1'
                        }}
                        on:click={toggleAIAssistant}
                        class="flex items-center justify-center "
                    >
                        <MessageCircle class="h-4 w-4"/>
                        <span>AI Assistant </span>
                    </MagicGradientButton>
                    <Button class="rounded-full" href="/courses">Start New Course</Button>
                </div>
            </div>
        </div>
    </div>

    <!-- Stats Section -->
    <div 
        use:inview={{
            unobserveOnEnter: true,
            rootMargin: '-100px'
        }}
        on:inview_change={handleChange('stats')}
        class="mb-12 {inView.stats ? 'animate-fade-up' : ''} opacity-0"
        style="animation-delay: 100ms;"
    >
        <h3 class="mb-6 text-xl font-semibold text-black dark:text-white">Your Learning Stats</h3>
        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {#each learningStats as stat, i}
                <div 
                    class="flex flex-col rounded-2xl border border-black/10 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md dark:border-white/10 dark:bg-black/20"
                    style="animation-delay: {i * 100}ms;"
                >
                    <div class="mb-4 flex items-center gap-3">
                        <div class="flex size-10 items-center justify-center rounded-xl {stat.color}">
                            <svelte:component this={stat.icon} class="size-5" />
                        </div>
                        <span class="text-sm font-medium text-black/60 dark:text-white/60">{stat.label}</span>
                    </div>
                    <div class="mt-auto">
                        <p class="text-2xl font-bold text-black dark:text-white">{stat.value}</p>
                        <p class="text-xs text-black/60 dark:text-white/60">{stat.change}</p>
                    </div>
                    {#if stat.link}
                        <a href={stat.link} class="mt-2 text-xs text-primary hover:underline">View details</a>
                    {/if}
                </div>
            {/each}
        </div>
    </div>

    <!-- Activities Section -->
    <div 
        use:inview={{
            unobserveOnEnter: true,
            rootMargin: '-100px'
        }}
        on:inview_change={handleChange('activities')}
        class="mb-12 rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-black/20 {inView.activities ? 'animate-fade-up' : ''} opacity-0"
        style="animation-delay: 200ms;"
    >
        <h3 class="mb-6 text-xl font-semibold text-black dark:text-white">Recent Activity</h3>
        <div class="space-y-6">
            {#each recentActivities as activity, i}
                <div 
                    class="animate-fade-up opacity-0"
                    style="animation-delay: {300 + i * 100}ms;"
                >
                    <div class="flex gap-4">
                        <div class={`flex size-10 shrink-0 items-center justify-center rounded-full ${activity.type === 'conversation' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-black/10 text-black dark:bg-white/10 dark:text-white'}`}>
                            <svelte:component this={activity.icon} class="size-5" />
                        </div>
                        <div>
                            <div class="flex items-center">
                                <h4 class="font-medium text-black dark:text-white">{activity.title}</h4>
                                <span class="ml-2 text-xs text-black/60 dark:text-white/60">{activity.time}</span>
                            </div>
                            <p class="mt-1 text-sm text-black/80 dark:text-white/80">{activity.description}</p>
                        </div>
                    </div>
                    {#if i < recentActivities.length - 1}
                        <div class="my-4 h-px w-full bg-black/10 dark:bg-white/10"></div>
                    {/if}
                </div>
            {/each}
        </div>
    </div>

    <!-- Market Updates Section -->
    <div class="mb-12">
        <MarketUpdates />
    </div>

    <!-- Menu Grid -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <!-- AI Assistant Button -->
        <button
            on:click={toggleAIAssistant}
            class="group relative overflow-hidden rounded-2xl border border-black/10 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md dark:border-white/10 dark:bg-black/20"
        >
            <div class="flex flex-col items-center gap-4 text-center">
                <div class="rounded-full border-2 border-black/10 bg-white p-4 transition-colors group-hover:border-black/20 dark:border-white/10 dark:bg-black dark:group-hover:border-white/20">
                    <Bot class="size-6 text-black dark:text-white" />
                </div>
                <h3 class="font-semibold text-black dark:text-white">AI Assistant</h3>
            </div>
        </button>

        <!-- Other Menu Items -->
        {#each menuItems as { icon: Icon, label, href }}
            <a
                {href}
                class="group relative overflow-hidden rounded-2xl border border-black/10 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md dark:border-white/10 dark:bg-black/20"
            >
                <div class="flex flex-col items-center gap-4 text-center">
                    <div class="rounded-full border-2 border-black/10 bg-white p-4 transition-colors group-hover:border-black/20 dark:border-white/10 dark:bg-black dark:group-hover:border-white/20">
                        <Icon class="size-6 text-black dark:text-white" />
                    </div>
                    <h3 class="font-semibold text-black dark:text-white">{label}</h3>
                </div>
            </a>
        {/each}
    </div>
</div>

<!-- AI Assistant Modal -->
{#if showAIAssistant}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div class="h-[80vh] w-[80vw] rounded-lg bg-base-100 p-6 shadow-xl">
            <div class="mb-4 flex items-center justify-between">
                <h2 class="text-xl font-bold">AI Assistant</h2>
                <Button variant="ghost" size="sm" on:click={toggleAIAssistant}>
                    <X class="h-4 w-4" />
                </Button>
            </div>
            <div class="h-[calc(100%-3rem)]">
                <AIAssistant embedded={true} onClose={toggleAIAssistant} />
            </div>
        </div>
    </div>
{/if}
