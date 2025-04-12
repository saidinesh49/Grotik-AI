<script lang="ts">
    import { signInWithGoogle, signInWithFacebook } from '$lib/stores/auth';
    import Button from '$lib/components/ui/button/button.svelte';
    import BorderBeam from '$lib/components/magic/borderbeam/BorderBeam.svelte';
    import AnimatedShinyText from '$lib/components/magic/AnimatedShinyText/AnimatedShinyText.svelte';
    import GoogleSvg from '$lib/imgs/Google.svg';
    import FacebookLightSvg from '$lib/imgs/facebook-light.svg';
    import FacebookDarkSvg from '$lib/imgs/facebook-dark.svg';

    let isLoading = false;
    let error: string | null = null;

    async function handleGoogleSignIn() {
        isLoading = true;
        error = null;
        const result = await signInWithGoogle();
        if (!result.success) {
            error = 'Failed to sign in with Google. Please try again.';
        }
        isLoading = false;
    }

    async function handleFacebookSignIn() {
        isLoading = true;
        error = null;
        const result = await signInWithFacebook();
        if (!result.success) {
            error = 'Failed to sign in with Facebook. Please try again.';
        }
        isLoading = false;
    }
</script>

<div class="relative mx-auto max-w-md px-6 py-12">
    <div class="overflow-hidden rounded-2xl border border-white/10 bg-white bg-opacity-[0.01] p-8">
        <BorderBeam
            size={150}
            duration={10}
            delay={0}
            colorFrom="var(--color-one)"
            colorTo="var(--color-two)"
        />
        
        <div class="relative z-10">
            <AnimatedShinyText>
                <h2 class="mb-6 text-center text-2xl font-semibold text-gray-900 dark:text-white">
                    Welcome to Grotik
                </h2>
            </AnimatedShinyText>
            
            <p class="mb-8 text-center text-sm text-gray-500 dark:text-gray-400">
                Sign in to start your financial learning journey
            </p>

            {#if error}
                <div class="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-500 dark:bg-red-900/10 dark:text-red-400">
                    {error}
                </div>
            {/if}

            <div class="space-y-3">
                <Button
                    on:click={handleGoogleSignIn}
                    disabled={isLoading}
                    class="relative w-full justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700/50"
                >
                    <img src={GoogleSvg} alt="Google" class="absolute left-4 size-5" />
                    <span>Continue with Google</span>
                </Button>

                <Button
                    on:click={handleFacebookSignIn}
                    disabled={isLoading}
                    class="relative w-full justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700/50"
                >
                    <img src={FacebookLightSvg} alt="Facebook" class="absolute left-4 size-5 block dark:hidden" />
                    <img src={FacebookDarkSvg} alt="Facebook" class="absolute left-4 size-5 hidden dark:block" />
                    <span>Continue with Facebook</span>
                </Button>
            </div>

            <div class="relative my-6">
                <div class="absolute inset-0 flex items-center">
                    <div class="w-full border-t border-gray-200 dark:border-gray-700"></div>
                </div>
                <div class="relative flex justify-center text-sm">
                    <span class="bg-white px-2 text-gray-500 dark:bg-gray-800 dark:text-gray-400">Or continue with</span>
                </div>
            </div>

            <form class="space-y-4">
                <div>
                    <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-200">
                        Email address
                    </label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                        placeholder="Enter your email"
                    />
                </div>
                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-200">
                        Password
                    </label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                        placeholder="Enter your password"
                    />
                </div>
                <Button
                    type="submit"
                    class="w-full justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-blue-700 hover:to-indigo-700"
                >
                    Sign in
                </Button>
            </form>

            <p class="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
                By continuing, you agree to our
                <a href="/terms" class="underline hover:text-gray-900 dark:hover:text-white">Terms of Service</a>
                and
                <a href="/privacy" class="underline hover:text-gray-900 dark:hover:text-white">Privacy Policy</a>
            </p>
        </div>
    </div>
</div> 