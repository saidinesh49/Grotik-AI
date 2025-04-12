<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { fade } from 'svelte/transition';
    import { userStore, isAuthenticated } from '$lib/stores/auth';
    import Button from '$lib/components/ui/button/button.svelte';
    import { ArrowLeft, BookOpen, Brain, MessageCircle } from 'lucide-svelte';
    import coursesData from '$lib/data/courses.json';
    import { MagicGradientButton, AvatarCircles } from '$lib/components/magic';

    onMount(() => {
        if (!$isAuthenticated) {
            goto('/signin');
            return ;
        }
    });

    function goBack() {
        goto('/dashboard');
    }

    function goToAIAssistant() {
        goto('/assistant');
    }

    function goToCourse(courseId: string) {
        goto(`/courses/${courseId}`);
    }
</script>

<div class="container mx-auto px-4 py-8" in:fade>
    <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-2">
            <button 
                class="btn btn-circle btn-ghost btn-sm" 
                on:click={goBack}
                aria-label="Go back"
            >
                <ArrowLeft class="h-5 w-5" />
            </button>
            <h1 class="text-3xl font-bold">Available Courses</h1>
        </div>
        <button 
            class="btn btn-primary flex items-center gap-2"
            on:click={goToAIAssistant}
        >
            <MagicGradientButton 
                size="md"
                gradientColors={{
                firstColor: '#ff00aa',
                secondColor: '#00FFF1'
                }}>
                <div>
                    <MessageCircle class="h-4 w-4" />
                    <span>Ask AI Assistant</span>
                </div>
           </MagicGradientButton>
        </button>
    </div>

    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {#each coursesData.courses as course}
            <div class="card bg-base-100 shadow-md py-5 px-5 hover:shadow-lg transition-all duration-300 h-full border rounded-md">
                <figure class="h-48 overflow-hidden">
                    <img 
                        src={course.image} 
                        alt={course.title} 
                        class="h-full w-full rounded-md object-cover transition-transform duration-500 hover:scale-105"
                    />
                </figure>
                <div class="card-body">
                    <h2 class="card-title mt-2 font-semibold">{course.title}</h2>
                    <p>{course.description}</p>
                    <div class="mt-2">
                        <div class="flex items-center justify-between">
                            <span class="text-sm">Progress</span>
                            <span class="text-sm font-medium">{course.progress}%</span>
                        </div>
                        <div class="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                            <div 
                                class="h-full rounded-full bg-primary" 
                                style="width: {course.progress}%"
                            ></div>
                        </div>
                    </div>
                    <div class="card-actions flex items-center justify-between mt-4">
                        <button 
                            class="btn btn-primary btn-sm gap-2"
                            on:click={() => goToCourse(course.id)}
                        >
                            <span class="py-2 px-2 bg-black text-white dark:text-black dark:bg-white hover:bg-black/80 hover:text-white/90 hover:dark:bg-white/80 hover:dark:text-black/80 border font-semibold rounded-md">
                              Continue 
                            </span>
                        </button>
                        <div class="flex flex-col items-end ml-2">
                            <span class="text-xs text-gray-500 mb-1">Already Enrolled:</span>
                            <AvatarCircles numPeople={course.enrolled || 42} class="cursor-pointer"/>
                        </div>
                    </div>
                </div>
            </div>
        {/each}
    </div>
</div> 