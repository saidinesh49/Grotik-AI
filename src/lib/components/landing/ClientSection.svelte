<script>
	import { Wallet, CreditCard, Building2, PiggyBank, DollarSign } from 'lucide-svelte';
</script>

<section id="clients" class="mx-auto max-w-7xl px-6 text-center md:px-8">
	<div class="py-14">
		<div class="mx-auto max-w-screen-xl px-4 md:px-8">
			<h2 class="text-center text-sm font-semibold text-gray-600 dark:text-gray-400">
				TRUSTED BY LEADING FINANCIAL INSTITUTIONS
			</h2>
			<div class="mt-6">
				<ul class="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 md:gap-x-16">
					<li class="flex flex-col items-center gap-2">
						<div class="flex size-16 items-center justify-center rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
							<CreditCard class="size-8 text-blue-600 dark:text-blue-400" />
						</div>
						<span class="text-sm text-gray-600 dark:text-gray-400">Global Card Services</span>
					</li>
					<li class="flex flex-col items-center gap-2">
						<div class="flex size-16 items-center justify-center rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
							<Building2 class="size-8 text-indigo-600 dark:text-indigo-400" />
						</div>
						<span class="text-sm text-gray-600 dark:text-gray-400">Banking Partners</span>
					</li>
					<li class="flex flex-col items-center gap-2">
						<div class="flex size-16 items-center justify-center rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
							<Wallet class="size-8 text-green-600 dark:text-green-400" />
						</div>
						<span class="text-sm text-gray-600 dark:text-gray-400">Investment Firms</span>
					</li>
					<li class="flex flex-col items-center gap-2">
						<div class="flex size-16 items-center justify-center rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
							<PiggyBank class="size-8 text-orange-600 dark:text-orange-400" />
						</div>
						<span class="text-sm text-gray-600 dark:text-gray-400">Savings Institutions</span>
					</li>
					<li class="flex flex-col items-center gap-2">
						<div class="flex size-16 items-center justify-center rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
							<DollarSign class="size-8 text-purple-600 dark:text-purple-400" />
						</div>
						<span class="text-sm text-gray-600 dark:text-gray-400">Financial Advisors</span>
					</li>
				</ul>
			</div>
		</div>
	</div>
</section>
