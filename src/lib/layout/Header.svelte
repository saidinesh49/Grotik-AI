<script lang="ts">
	import { userStore, isAuthenticated } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import ThemeSwitcher from '$lib/components/ui/theme-switcher/ThemeSwitcher.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { LogOut, AlignJustify, XIcon } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import { fly } from 'svelte/transition';
	import { onMount } from 'svelte';

	$: menuItems = [
		{
			id: 1,
			label: 'Features',
			href: '/features'
		},
		{
			id: 2,
			label: 'Courses',
			href: '/courses'
		},
		{
			id: 3,
			label: 'About',
			href: '/about'
		},
		// Show dashboard link only when authenticated and not on dashboard page
		...$isAuthenticated && !$page.url.pathname.includes('/dashboard')
			? [{
				id: 4,
				label: 'Dashboard',
				href: '/dashboard'
			}]
			: []
	];

	let hamburgerMenuIsOpen = false;
	let innerWidth = 0;

	// Redirect if user is authenticated and tries to access auth pages
	$: if ($isAuthenticated && ($page.url.pathname === '/signin' || $page.url.pathname === '/signup')) {
		goto('/dashboard');
	}

	function toggleMenu() {
		hamburgerMenuIsOpen = !hamburgerMenuIsOpen;
		const html = document.querySelector('html');
		if (html) {
			html.classList.toggle('overflow-hidden', hamburgerMenuIsOpen);
		}
	}

	onMount(() => {
		return () => {
			const html = document.querySelector('html');
			if (html) {
				html.classList.remove('overflow-hidden');
			}
		};
	});
</script>

<svelte:window bind:innerWidth />

<header class="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
	<div class="container flex h-16 items-center justify-between">
		<div class="flex items-center gap-6">
			<a href="/" class="flex items-center gap-2">
				<img src="/grotik_logo.png" alt="Grotik Logo" class="h-8 w-auto" />
				<span class="text-xl font-semibold">Grotik</span>
			</a>
			<nav class="hidden md:flex items-center gap-6">
				{#each menuItems as item}
					<a
						href={item.href}
						class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
					>
						{item.label}
					</a>
				{/each}
			</nav>
		</div>

		<div class="flex items-center gap-4">
			<ThemeSwitcher />
			
			{#if $isAuthenticated}
				<!-- Show Logout button only on desktop -->
				<Button
					variant="ghost"
					on:click={() => userStore.signOut()}
					class="hidden md:flex hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black items-center gap-2 border"
				>
					<LogOut class="size-5" />
					<span>Logout</span>
				</Button>
			{/if}
			
			<!-- Show hamburger on mobile regardless of auth state -->
			<button class="md:hidden" on:click={toggleMenu}>
				<span class="sr-only">Toggle menu</span>
				{#if hamburgerMenuIsOpen}
					<XIcon strokeWidth={1.4} class="text-foreground"/>
				{:else}
					<AlignJustify strokeWidth={1.4} class="text-foreground" />
				{/if}
			</button>

			<!-- Show Sign In/Sign Up only on desktop when not authenticated -->
			{#if !$isAuthenticated}
				<div class="hidden md:flex items-center gap-2">
					<Button variant="ghost" href="/signin">Sign In</Button>
					<Button href="/signup">Sign Up</Button>
				</div>
			{/if}
		</div>
	</div>
</header>

<!-- Mobile menu for both authenticated and unauthenticated users -->
{#if hamburgerMenuIsOpen}
	<nav class="fixed inset-0 z-40 bg-background/95 backdrop-blur md:hidden"
		 in:fly={{ y: -30, duration: 400 }}>
		<div class="container flex flex-col gap-6 pt-20">
			{#each menuItems as item}
				<a
					href={item.href}
					class="text-lg font-medium text-foreground"
					on:click={toggleMenu}
				>
					{item.label}
				</a>
			{/each}
			
			<div class="flex flex-col gap-2 pt-4 border-t">
				{#if $isAuthenticated}
					<Button
						variant="ghost"
						on:click={() => {
							userStore.signOut();
							toggleMenu();
						}}
						class="w-full justify-center gap-2 hover:text-white hover:bg-black border dark:hover:bg-white dark:hover:text-black"
					>
						<LogOut class="size-5" />
						<span>Logout</span>
					</Button>
				{:else}
					<Button variant="ghost" href="/signin" class="w-full justify-center" on:click={toggleMenu}>
						Sign In
					</Button>
					<Button href="/signup" class="w-full justify-center" on:click={toggleMenu}>
						Sign Up
					</Button>
				{/if}
			</div>
		</div>
	</nav>
{/if}
