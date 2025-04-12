<script lang="ts">
	import { LoaderIcon, CheckIcon } from 'lucide-svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { cn } from '$lib/utils';
	import { fly } from 'svelte/transition';

	let productPrices = [
		{
			id: 'beginner',
			name: 'Self-Paced Learning',
			description: 'Perfect for beginners starting their financial journey',
			features: [
				'Core financial lessons',
				'Basic budgeting tools',
				'5 language options',
				'Community support'
			],
			price: 'Free',
			isMostPopular: false
		},
		{
			id: 'guided',
			name: 'Guided Learning',
			description: 'For dedicated learners seeking comprehensive knowledge',
			features: [
				'Advanced financial concepts',
				'Personal finance tools',
				'All language options',
				'1-on-1 mentoring sessions',
				'Progress tracking'
			],
			price: 'Coming Soon',
			isMostPopular: true
		},
		{
			id: 'family',
			name: 'Family Learning',
			description: 'Share financial education with your whole family',
			features: [
				'Up to 5 family accounts',
				'Family progress dashboard',
				'All premium features',
				'Custom learning paths',
				'Family finance tools',
				'Group mentoring sessions'
			],
			price: 'Coming Soon',
			isMostPopular: false
		}
	];

	let isLoading = false;
	let index = '';
	let onSubscribeClick = async (priceId: string) => {
		index = priceId;
		isLoading = true;
		// Simulate API call
		await new Promise((resolve) => setTimeout(resolve, 1000));
		isLoading = false;
	};
</script>

<section id="pricing">
	<div class="mx-auto flex max-w-screen-xl flex-col gap-8 px-4 py-7 md:px-8">
		<div class="mx-auto max-w-5xl text-center">
			<h2 class="text-5xl font-bold tracking-tight text-black dark:text-white sm:text-6xl">
				Start Your Financial Journey With Us
			</h2>
			<h4 class="pt-4 text-xl font-bold tracking-tight text-black dark:text-white">
			   Go and learn, Grow and earn
			</h4>
		</div>
	</div>
</section>
