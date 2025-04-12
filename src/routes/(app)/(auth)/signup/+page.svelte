<script lang="ts">
	import GoogleSvg from '$lib/imgs/Google.svg';
	import FacebookLightSvg from '$lib/imgs/facebook-light.svg';
	import FacebookDarkSvg from '$lib/imgs/facebook-dark.svg';
	import Button from '$lib/components/ui/button/button.svelte';
	import { ChevronLeftIcon } from 'lucide-svelte';
	import { signInWithGoogle, signInWithFacebook } from '$lib/stores/auth';

	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { formSchema, type FormSchema } from '$lib/schema/schema';
	import { type SuperValidated, type Infer, superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { Loader } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	export let data;
	let dataForm: SuperValidated<Infer<FormSchema>> = data.form;
	let form = superForm(dataForm, {
		validators: zodClient(formSchema),
		onSubmit: () => {
			isFormLoading = true;
		},
		onUpdate: ({ result }) => {
			isFormLoading = false;
			if (result.status === 200) {
				toast.success('Check your email', {
					description: 'We have sent you a login link. Be sure to check your spam too.'
				});
			} else {
				toast.error('Something went wrong', {
					description: 'Your sign in request failed. Please try again.'
				});
			}
		}
	});

	const { form: formData, enhance } = form;

	let googleLoading = false;
	let facebookLoading = false;
	let loading = false;
	let isFormLoading = false;

	async function handleGoogleSignIn() {
		googleLoading = true;
		try {
			const result = await signInWithGoogle();
			if (!result.success) {
				toast.error('Failed to sign up with Google', {
					description: 'Please try again.'
				});
			}
		} catch (error) {
			toast.error('Something went wrong', {
				description: 'Failed to sign up with Google. Please try again.'
			});
		}
		googleLoading = false;
	}

	async function handleFacebookSignIn() {
		facebookLoading = true;
		try {
			const result = await signInWithFacebook();
			if (!result.success) {
				toast.error('Failed to sign up with Facebook', {
					description: 'Please try again.'
				});
			}
		} catch (error) {
			toast.error('Something went wrong', {
				description: 'Failed to sign up with Facebook. Please try again.'
			});
		}
		facebookLoading = false;
	}
</script>

<svelte:head>
	<title>Sign Up | Grotik</title>
	<meta name="description" content="Sign Up for Grotik" />
</svelte:head>

<div class="container flex h-screen w-screen flex-col items-center justify-center">
	<Button variant="ghost" href="/" class="absolute left-4 top-4 md:left-8 md:top-8">
		<ChevronLeftIcon class="mr-2 size-4" />
		Back
	</Button>
	<div class="mx-auto flex w-full flex-col justify-center gap-6 sm:w-[350px]">
		<div class="flex flex-col gap-2 text-center">
			<!-- {/* <Icons.logo class="mx-auto h-6 w-6" /> */} -->
			<h1 class="text-2xl font-semibold tracking-tight">Welcome to Grotik</h1>
			<p class="text-sm text-muted-foreground">Sign up for an account</p>
		</div>
		<!-- Form -->
		<form method="POST" use:enhance>
			<Form.Field {form} name="email" class="mb-4">
				<Form.Control let:attrs>
					<Input placeholder="name@example.com" {...attrs} bind:value={$formData.email} />
				</Form.Control>
				<!-- <Form.Description>This is your email address.</Form.Description> -->
				<Form.FieldErrors />
			</Form.Field>
			<Form.Button size="sm" class="w-full" disabled={isFormLoading}>
				{#if isFormLoading}
					<Loader class="mr-2 size-4 animate-spin" />
				{/if}
				Sign Up with Email</Form.Button
			>
		</form>
		<!-- Separator -->
		<div class="relative">
			<div class="absolute inset-0 flex items-center">
				<span class="w-full border-t" />
			</div>
			<div class="relative flex justify-center text-xs uppercase">
				<span class="bg-background px-2 text-muted-foreground"> Or continue with </span>
			</div>
		</div>
		<div class="flex flex-col gap-2">
			<Button on:click={handleGoogleSignIn} variant="outline" disabled={loading}>
				{#if googleLoading}
					<Loader class="mr-2 size-4 animate-spin" />
				{:else}
					<img src={GoogleSvg} alt="Google" class="mr-2 size-4" />
				{/if}
				Google
			</Button>
			<Button on:click={handleFacebookSignIn} variant="outline" disabled={loading}>
				{#if facebookLoading}
					<Loader class="mr-2 size-4 animate-spin" />
				{:else}
					<img src={FacebookLightSvg} alt="Facebook" class="mr-2 size-4 block dark:hidden" />
					<img src={FacebookDarkSvg} alt="Facebook" class="mr-2 size-4 hidden dark:block" />
				{/if}
				Facebook
			</Button>
		</div>

		<p class="px-8 text-center text-sm text-muted-foreground">
			<a href="/signin" class="hover:text-brand underline underline-offset-4">
				Already have an account? Sign In
			</a>
		</p>
	</div>
</div>

<style>
    :global(.dark) {
        --background: 0 0% 0%;
        --foreground: 0 0% 100%;
        --muted: 0 0% 20%;
        --muted-foreground: 0 0% 60%;
    }
</style>
