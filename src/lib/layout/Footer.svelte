<script>
	import DiscordSvg from '$lib/imgs/discord.svg';
	import TwitterSvg from '$lib/imgs/x.svg';

	const footerNavs = [
		{
			label: 'Product',
			items: [
				{
					href: '/',
					name: 'Email Collection'
				},
				{
					href: '/pricing',
					name: 'Pricing'
				},
				{
					href: '/faq',
					name: 'FAQ'
				}
			]
		},

		{
			label: 'Community',
			items: [
				{
					href: '/',
					name: 'Discord'
				},
				{
					href: '/',
					name: 'Twitter'
				},
				{
					href: 'mailto:hello@chatcollect.com',
					name: 'Email'
				}
			]
		},
	];


</script>

<footer>
	<div class="flex flex-col items-center gap-1 mx-auto w-full max-w-screen-xl xl:pb-2">
		<div class="mt-8 sm:pb-8 md:flex md:justify-between">
			<div class="flex flex-col gap-4">
				<a href="/" class="flex items-center gap-2">
					<img src="/grotik_logo.png" alt="Grotik logo" class="h-8 w-auto"/>
					<span class="self-center whitespace-nowrap text-2xl font-semibold dark:text-white">
						Grotik
					</span>
			</div>
		</div>

		<div
			class="flex flex-col rounded-md border-neutral-700/20 px-8 pb-4 sm:flex sm:flex-row sm:items-center sm:justify-between"
		>
			<span class="text-sm text-gray-500 dark:text-gray-400 sm:text-center">
				Copyright ©
				{' '}
				{new Date().getFullYear()}
				{' '}
				<a href="/" class="cursor-pointer">Grotik</a>
				. All Rights Reserved.
			</span>
		</div>
	</div>
	<!-- Site Banner -->
</footer>
