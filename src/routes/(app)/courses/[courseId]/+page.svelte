<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { fade } from 'svelte/transition';
    import { userStore, isAuthenticated } from '$lib/stores/auth';
    import Button from '$lib/components/ui/button/button.svelte';
    import { ArrowLeft, BookOpen, Brain, MessageCircle, ChevronRight } from 'lucide-svelte';
    import { MagicGradientButton } from '$lib/components/magic';
    import { FileTree } from '$lib/components/magic';
    import coursesData from '$lib/data/courses.json';
    import courseContentData from '$lib/data/course-content.json';
    import { marked } from 'marked';
    import Breadcrumb from '$lib/components/ui/Breadcrumb.svelte';

    let course: any;
    let selectedContent: any = null;
    let courseContent: any = null;
    let loading = true;
    let error = false;
    let fileTreeData: any[] = [];
    let selectedSectionId: string = '';
    let breadcrumbItems: { label: string; path?: string }[] = [];

    onMount(async () => {
        if (!$isAuthenticated) {
            goto('/signin');
            return;
        }

        const courseId = $page.params.courseId;
        course = coursesData.courses.find((c: any) => c.id === courseId);
        
        if (!course) {
            error = true;
            return;
        }

        // Set up breadcrumb navigation
        breadcrumbItems = [
            { label: 'Courses', path: '/courses' },
            { label: course.title, path: `/courses/${courseId}` }
        ];

        try {
            // Find the corresponding content from the course-content.json file
            const contentIndex = getContentIndex(courseId);
            if (contentIndex !== -1) {
                courseContent = courseContentData[contentIndex];
                
                // Prepare file tree data
                if (courseContent && courseContent.sections) {
                    fileTreeData = courseContent.sections.map((section: any, index: number) => ({
                        id: `section-${index}`,
                        name: section.title,
                        type: 'file',
                        content: section
                    }));
                }
                
                // If there's a specific section in the URL, select it
                const urlParams = new URLSearchParams(window.location.search);
                const sectionId = urlParams.get('section');
                if (sectionId) {
                    const section = courseContent.sections.find((s: any) => s.id === sectionId);
                    if (section) {
                        selectedContent = section;
                        selectedSectionId = `section-${courseContent.sections.indexOf(section)}`;
                    }
                }
            }
        } catch (err) {
            console.error('Error loading course content:', err);
            error = true;
        } finally {
            loading = false;
        }
    });

    function getContentIndex(courseId: string): number {
        // Map course IDs to content indices
        const contentMap: Record<string, number> = {
            'basic-banking': 0,
            'credit-management': 1,
            'investment-basics': 2
        };
        
        return contentMap[courseId] ?? -1;
    }

    function goBack() {
        goto('/courses');
    }

    function goToAIAssistant() {
        goto('/assistant');
    }

    function handleContentSelect(content: any, id: string) {
        selectedContent = content;
        selectedSectionId = id;
        
        // Update breadcrumb with the selected section
        if (content) {
            breadcrumbItems = [
                { label: 'Courses', path: '/courses' },
                { label: course.title, path: `/courses/${$page.params.courseId}` },
                { label: content.title }
            ];
        } else {
            breadcrumbItems = [
                { label: 'Courses', path: '/courses' },
                { label: course.title, path: `/courses/${$page.params.courseId}` }
            ];
        }
        
        // Update URL with section ID for bookmarking
        const url = new URL(window.location.href);
        url.searchParams.set('section', content.id);
        window.history.pushState({}, '', url);
    }

    function renderContent(content: any) {
        if (!content) return '';
        
        if (typeof content === 'string') {
            // Check if the content contains markdown
            if (content.includes('**') || content.includes('*') || content.includes('-')) {
                return marked(content);
            }
            return content;
        }
        
        if (Array.isArray(content)) {
            return content.map((item, index) => {
                if (typeof item === 'string') {
                    // Check if the item contains markdown
                    if (item.includes('**') || item.includes('*') || item.includes('-')) {
                        return marked(item);
                    }
                    return `<p>${item}</p>`;
                } else {
                    return renderContent(item);
                }
            }).join('');
        }
        
        if (content.table) {
            return `
                <div class="overflow-x-auto">
                    <table class="table table-zebra w-full">
                        <thead>
                            <tr>
                                ${Object.keys(content.table[0]).map(key => 
                                    `<th>${key.replace(/_/g, ' ')}</th>`
                                ).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${content.table.map((row, rowIndex) => `
                                <tr>
                                    ${Object.values(row).map((value, colIndex) => 
                                        `<td>${value}</td>`
                                    ).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        return Object.entries(content).map(([key, value]) => {
            if (key === 'table') return '';
            
            return `
                <div class="mb-4">
                    <h3 class="text-lg font-semibold mb-2">${key.replace(/_/g, ' ')}</h3>
                    ${renderContent(value)}
                </div>
            `;
        }).join('');
    }

    function goToQuiz() {
        goto(`/courses/${$page.params.courseId}/quizzes`);
    }
</script>

<div class="container mx-auto px-2 py-4" in:fade>
    <div class="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div class="flex items-center gap-2">
            <button 
                class="btn btn-circle btn-ghost btn-sm" 
                on:click={goBack}
                aria-label="Go back"
            >
                <ArrowLeft class="h-5 w-5" />
            </button>
            <h1 class="text-3xl font-bold">{course?.title}</h1>
        </div>
        <div class="ml-2 md:ml-0 flex gap-4">
            <button 
                class="btn btn-primary px-4 flex items-center gap-2 border-2 border-black/50 dark:border-white/50 rounded-lg"
                on:click={goToQuiz}
            >
                <Brain class="h-4 w-4" />
                <span>Take Quiz</span>
            </button>
            <MagicGradientButton 
                size="md"
                gradientColors={{
                    firstColor: '#3b82f6',
                    secondColor: '#8b5cf6'
                }}
                on:click={goToAIAssistant}
                class="flex items-center justify-center gap-2"
            >
                <MessageCircle class="h-4 w-4" />
                <span>Ask AI Assistant</span>
            </MagicGradientButton>
        </div>
    </div>

    {#if error}
        <div class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>Course not found. Please go back to the courses page.</span>
        </div>
    {:else if loading}
        <div class="flex justify-center items-center h-64">
            <div class="loading loading-spinner loading-lg"></div>
        </div>
    {:else if course}
        <!-- Breadcrumb Navigation - Responsive -->
        <div class="mb-4">
            <Breadcrumb items={breadcrumbItems} />
        </div>

        <div class="grid gap-6 lg:grid-cols-4">
            <!-- Course Structure (File Tree) -->
            <div class="lg:col-span-1 mb-2">
                <div class="card bg-base-100 shadow-xl py-4 pl-4 pr-4 rounded-lg">
                    <div class="card-body">
                        <h2 class="card-title">Course Structure</h2>
                        <div class="space-y-2">
                            <FileTree 
                                data={fileTreeData} 
                                selectedId={selectedSectionId}
                                on:select={({ detail }) => handleContentSelect(detail.content, detail.id)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Course Content -->
            <div class="lg:col-span-3">
                <div class="card bg-base-100 shadow-xl px-4 py-4">
                    <div class="card-body gap-3">
                        <h2 class="card-title">
                            {#if selectedContent}
                                {selectedContent.title}
                            {:else if courseContent}
                                {courseContent.course_title}
                            {:else}
                                Course Content
                            {/if}
                        </h2>
                        
                        {#if selectedContent}
                            <div class="prose max-w-none">
                                <div class="mb-4">
                                    {@html renderContent(selectedContent.content)}
                                </div>
                                
                                {#if selectedContent.example}
                                    <div class="mt-4 p-3 bg-base-200 rounded-lg">
                                        <p class="font-semibold">Example:</p>
                                        <p>{selectedContent.example}</p>
                                    </div>
                                {/if}
                                
                                {#if selectedContent.did_you_know}
                                    <div class="mt-4 p-3 bg-primary/10 rounded-lg">
                                        <p class="font-semibold">Did You Know?</p>
                                        <p>{selectedContent.did_you_know}</p>
                                    </div>
                                {/if}
                                
                                {#if selectedContent.pro_tip}
                                    <div class="mt-4 p-3 bg-success/10 rounded-lg">
                                        <p class="font-semibold">Pro Tip:</p>
                                        <p>{selectedContent.pro_tip}</p>
                                    </div>
                                {/if}
                                
                                {#if selectedContent.common_mistake}
                                    <div class="mt-4 p-3 bg-error/10 rounded-lg">
                                        <p class="font-semibold">Common Mistake:</p>
                                        <p>{selectedContent.common_mistake}</p>
                                    </div>
                                {/if}
                            </div>
                        {:else if courseContent}
                            <div class="prose max-w-none">
                                <div class="mb-6">
                                    <h3 class="text-lg font-semibold">Target Audience</h3>
                                    <p>{courseContent.target_audience}</p>
                                </div>
                                
                                <div class="mb-6">
                                    <h3 class="text-lg font-semibold">Introduction</h3>
                                    <p>{courseContent.introduction.text}</p>
                                    <p class="italic mt-2">Importance: {courseContent.introduction.importance}</p>
                                </div>
                                
                                {#if courseContent.sections && courseContent.sections.length > 0}
                                    <div class="mb-6">
                                        <h3 class="text-lg font-semibold">Sections</h3>
                                        <p>Select a section from the menu to view its content.</p>
                                    </div>
                                {/if}
                                
                                {#if courseContent.key_takeaways && courseContent.key_takeaways.length > 0}
                                    <div class="mb-6">
                                        <h3 class="text-lg font-semibold">Key Takeaways</h3>
                                        <ul>
                                            {#each courseContent.key_takeaways as takeaway}
                                                <li>{takeaway}</li>
                                            {/each}
                                        </ul>
                                    </div>
                                {/if}
                                
                                {#if courseContent.next_steps && courseContent.next_steps.length > 0}
                                    <div class="mb-6">
                                        <h3 class="text-lg font-semibold">Next Steps</h3>
                                        <ul>
                                            {#each courseContent.next_steps as step}
                                                <li>{step}</li>
                                            {/each}
                                        </ul>
                                    </div>
                                {/if}
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    {/if}
</div> 