<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { fade, fly } from 'svelte/transition';
    import { userStore, isAuthenticated } from '$lib/stores/auth';
    import Button from '$lib/components/ui/button/button.svelte';
    import { ArrowLeft, BookOpen, Brain, Check, X, ChevronLeft, ChevronRight } from 'lucide-svelte';
    import { page } from '$app/stores';
    import courseContentData from '$lib/data/course-content.json';
    import confetti from 'canvas-confetti';
    import Breadcrumb from '$lib/components/ui/Breadcrumb.svelte';
    import coursesData from '$lib/data/courses.json';

    let courseId = $page.params.courseId;
    let courseContent: any = null;
    let questions: any[] = [];
    let currentQuestionIndex = 0;
    let selectedAnswer = '';
    let shortAnswer = '';
    let score = 0;
    let quizCompleted = false;
    let loading = true;
    let error = false;
    let showFeedback = false;
    let isCorrect = false;
    let feedbackMessage = '';
    let answeredQuestions: boolean[] = [];
    let courseTitle = 'Course';

    let breadcrumbItems: { label: string; path?: string }[] = [];

    // Key for localStorage persistence
    const localStorageKey = `quizState_${courseId}`;

    onMount(async () => {
        if (!$isAuthenticated) {
            goto('/signin');
            return;
        }

        try {
            const courseInfo = coursesData.find(c => c.id === courseId);
            if (courseInfo) {
                courseTitle = courseInfo.title;
            }

            breadcrumbItems = [
                { label: 'Courses', path: '/courses' },
                { label: courseTitle, path: `/courses/${courseId}` },
                { label: 'Quiz' }
            ];

            const contentIndex = getContentIndex(courseId);
            if (contentIndex !== -1) {
                courseContent = courseContentData[contentIndex];
                if (courseContent && courseContent.check_your_understanding && Array.isArray(courseContent.check_your_understanding)) {
                        questions = courseContent.check_your_understanding;
                        answeredQuestions = new Array(questions.length).fill(false);

                    // --- Persistence: Load state ---
                    const savedState = localStorage.getItem(localStorageKey);
                    if (savedState) {
                        try {
                            const parsedState = JSON.parse(savedState);
                            // Only restore if the number of questions matches
                            if (parsedState.questionCount === questions.length) {
                                currentQuestionIndex = parsedState.currentQuestionIndex || 0;
                                score = parsedState.score || 0;
                                answeredQuestions = parsedState.answeredQuestions || new Array(questions.length).fill(false);
                                quizCompleted = currentQuestionIndex >= questions.length -1 && answeredQuestions[currentQuestionIndex]; // Check if completed
                                console.log('Restored quiz state:', parsedState);
                    } else {
                                console.warn('Saved quiz state question count mismatch. Resetting.');
                                localStorage.removeItem(localStorageKey); // Remove mismatched state
                            }
                        } catch (e) {
                            console.error("Failed to parse saved quiz state, resetting.", e);
                            localStorage.removeItem(localStorageKey); // Remove invalid state
                        }
                    }
                    // --- End Persistence Load ---

                } else {
                    error = true;
                    console.error('Quiz questions not found or not an array in course content for:', courseId);
                }
            } else {
                error = true;
                console.error('Course ID not found in content map:', courseId);
            }
        } catch (err) {
            console.error('Error loading quiz questions:', err);
            error = true;
        } finally {
            loading = false;
        }
    });

    // --- Persistence: Save state function ---
    function saveQuizState() {
        try {
            const stateToSave = {
                currentQuestionIndex,
                score,
                answeredQuestions,
                questionCount: questions.length // Store question count for validation
            };
            localStorage.setItem(localStorageKey, JSON.stringify(stateToSave));
            console.log('Quiz state saved:', stateToSave);
        } catch (e) {
            console.error("Failed to save quiz state to localStorage", e);
        }
    }
    // --- End Persistence Save ---


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
        // Navigate back to the course page
        goto(`/courses/${courseId}`);
    }

    function goToCourse() {
        goto(`/courses/${courseId}`);
    }

    function handleVoiceCommand(command: string) {
        const lowerCommand = command.toLowerCase();
        
        if (lowerCommand.includes('next') || lowerCommand.includes('continue')) {
            nextQuestion();
        } else if (lowerCommand.includes('back') || lowerCommand.includes('previous')) {
            previousQuestion();
        } else if (lowerCommand.includes('restart') || lowerCommand.includes('start over')) {
            restartQuiz();
        } else if (lowerCommand.includes('check') || lowerCommand.includes('submit')) {
            checkAnswer();
        } else if (lowerCommand.includes('return') || lowerCommand.includes('go back')) {
            goToCourse();
        }
    }

    function selectAnswer(answer: string) {
        selectedAnswer = answer;
        // Don't save state on mere selection, only after checking/navigating
    }

    function checkAnswer() {
        if (!questions[currentQuestionIndex] || answeredQuestions[currentQuestionIndex]) {
             // Don't re-check if already answered
            return;
        }
        
        const question = questions[currentQuestionIndex];
        let correct = false;
        
        if (question.type === 'multiple_choice') {
            correct = selectedAnswer === question.answer;
        } else if (question.type === 'true_false') {
            const correctAnswer = typeof question.answer === 'boolean' ? String(question.answer) : question.answer;
            const normalizedSelected = selectedAnswer.toLowerCase();
            const normalizedCorrect = correctAnswer.toLowerCase();
            correct = normalizedSelected === normalizedCorrect;
        } else if (question.type === 'short_answer') {
            correct = shortAnswer.toLowerCase().trim() === question.answer.toLowerCase().trim();
        }
        
        isCorrect = correct;
        let displayAnswer = question.answer;
        if (question.type === 'true_false' && typeof question.answer === 'boolean') {
            displayAnswer = question.answer ? 'True' : 'False';
        }
        
        feedbackMessage = correct ? 'Correct!' : `Incorrect. The correct answer is: ${displayAnswer}`;
        showFeedback = true;
        answeredQuestions[currentQuestionIndex] = true; // Mark as answered HERE
        
        if (correct) {
            score++; // Update score only if correct
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
        
        saveQuizState(); // --- Persistence: Save after checking ---
    }

    function nextQuestion() {
        if (currentQuestionIndex < questions.length - 1) {
            currentQuestionIndex++;
            // Reset answer state based on the new question type
            const nextQuestion = questions[currentQuestionIndex];
            if (nextQuestion.type === 'multiple_choice' || nextQuestion.type === 'true_false') {
                selectedAnswer = '';
            } else if (nextQuestion.type === 'short_answer') {
                shortAnswer = '';
            }
            showFeedback = false;
            saveQuizState(); // Save state after navigation
        } else if (!quizCompleted) {
            quizCompleted = true;
            saveQuizState();
        }
    }
    
    function previousQuestion() {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            // Reset answer state based on the previous question type
            const prevQuestion = questions[currentQuestionIndex];
            if (prevQuestion.type === 'multiple_choice' || prevQuestion.type === 'true_false') {
                selectedAnswer = '';
            } else if (prevQuestion.type === 'short_answer') {
                shortAnswer = '';
            }
            showFeedback = false;
            saveQuizState(); // Save state after navigation
        }
    }

    function restartQuiz() {
        currentQuestionIndex = 0;
        selectedAnswer = '';
        shortAnswer = '';
        score = 0;
        quizCompleted = false;
        showFeedback = false;
        answeredQuestions = new Array(questions.length).fill(false);
        localStorage.removeItem(localStorageKey); // --- Persistence: Clear saved state ---
        saveQuizState(); // Save the initial state (all 0s)
        console.log('Quiz restarted');
    }

    // Make currentQuestion reactive and properly handle state changes
    $: currentQuestion = (() => {
        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return { question: 'Loading question...', type: 'multiple_choice', options: [], answer: '' };
        }
        const index = Math.max(0, Math.min(currentQuestionIndex, questions.length - 1));
        const question = questions[index];
        
        // Reset answer state based on question type when question changes
        if (question) {
            if (question.type === 'multiple_choice' || question.type === 'true_false') {
                selectedAnswer = '';
            } else if (question.type === 'short_answer') {
                shortAnswer = '';
            }
            showFeedback = false;
        }
        
        return question;
    })();
        

    // Keep original getProgressPercentage function...
    function getProgressPercentage() {
        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return 0;
        }
        const percentage = ((currentQuestionIndex + 1) / questions.length) * 100;
        return percentage;
    }
    
    function getAnsweredCount() {
        if (!answeredQuestions || !Array.isArray(answeredQuestions)) {
            return 0;
        }
        
        const count = answeredQuestions.filter(Boolean).length;
        console.log('Answered Questions Count:', count);
        return count;
    }
</script>

<svelte:head>
    <title>{courseTitle} Quiz | Grotik</title>
    <meta name="description" content={`Test your knowledge for the ${courseTitle} course.`} />
</svelte:head>

<div class="container mx-auto max-w-3xl px-4 py-8">
    {#if loading}
        <div class="flex justify-center items-center h-64">
            <div class="spinner"></div>
        </div>
    {:else if error}
        <div class="text-center text-red-500">
            <p>Error loading quiz. Please try again later.</p>
            <Button on:click={() => goto('/courses')} class="mt-4">Back to Courses</Button>
        </div>
                        {:else}
        <div class="mb-6 flex items-center justify-between">
            <Button variant="ghost" size="icon" on:click={goBack} class="mr-2">
                <ArrowLeft />
                        </Button>
            <h1 class="text-2xl font-bold">Course Quiz</h1>
            <div class="w-10"></div>
        </div>

        <Breadcrumb items={breadcrumbItems} />

        {#if !quizCompleted}
            <div class="card bg-base-100 shadow-xl mb-8">
            <div class="card-body">
                    <div class="mb-4">
                        <progress class="progress progress-primary w-full" value={getProgressPercentage()} max="100"></progress>
                        <p class="text-sm text-right mt-1">Question {currentQuestionIndex + 1} of {questions.length}</p>
                </div>
                
                <div class="mb-6">
                        <p class="text-lg font-medium">{@html currentQuestion.question}</p>
                </div>
                
                    {#if currentQuestion.type === 'multiple_choice'}
                    <div class="space-y-3 mb-6">
                            {#each currentQuestion.options as option}
                                <label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-base-200 transition-colors {selectedAnswer === option ? 'border-primary bg-primary/10' : ''} {showFeedback && option === currentQuestion.answer && isCorrect ? 'border-green-500' : ''} {showFeedback && selectedAnswer === option && !isCorrect ? 'border-red-500' : ''}">
                                <input 
                                    type="radio" 
                                        name="mcqAnswer"
                                    value={option} 
                                    bind:group={selectedAnswer}
                                    class="radio radio-primary mr-3"
                                        disabled={showFeedback}
                                    >
                                <span>{option}</span>
                            </label>
                        {/each}
                    </div>
                    {:else if currentQuestion.type === 'true_false'}
                    <div class="grid grid-cols-2 gap-4 mb-6">
                            <label class="flex items-center justify-center p-4 border rounded-lg cursor-pointer hover:bg-base-200 transition-colors {selectedAnswer === 'True' || selectedAnswer === 'true' ? 'border-primary bg-primary/10' : ''} {showFeedback && currentQuestion.answer === true && isCorrect ? 'border-green-500' : ''} {showFeedback && (selectedAnswer === 'True' || selectedAnswer === 'true') && !isCorrect ? 'border-red-500' : ''}">
                                <input type="radio" name="tfAnswer" value="True" bind:group={selectedAnswer} class="radio radio-primary mr-3" disabled={showFeedback}>
                            <span>True</span>
                        </label>
                             <label class="flex items-center justify-center p-4 border rounded-lg cursor-pointer hover:bg-base-200 transition-colors {selectedAnswer === 'False' || selectedAnswer === 'false' ? 'border-primary bg-primary/10' : ''} {showFeedback && currentQuestion.answer === false && isCorrect ? 'border-green-500' : ''} {showFeedback && (selectedAnswer === 'False' || selectedAnswer === 'false') && !isCorrect ? 'border-red-500' : ''}">
                                <input type="radio" name="tfAnswer" value="False" bind:group={selectedAnswer} class="radio radio-primary mr-3" disabled={showFeedback}>
                            <span>False</span>
                        </label>
                    </div>
                    {:else if currentQuestion.type === 'short_answer'}
                    <div class="mb-6">
                        <input 
                            type="text" 
                            bind:value={shortAnswer}
                                placeholder="Your answer here..."
                                class="input input-bordered w-full {showFeedback && isCorrect ? 'border-green-500' : ''} {showFeedback && !isCorrect ? 'border-red-500' : ''}"
                                disabled={showFeedback}
                        />
                    </div>
                {/if}
                
                {#if showFeedback}
                        <div 
                            class="mt-4 rounded-lg p-4 text-sm {isCorrect ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}"
                            transition:fade
                        >
                             {#if currentQuestion.explanation}
                                 <p class="font-semibold mb-1">{@html feedbackMessage}</p>
                                <hr class="my-2 border-current opacity-30">
                                <p class="text-xs"><i>Explanation:</i> {@html currentQuestion.explanation}</p>
                        {:else}
                                <p>{@html feedbackMessage}</p>
                        {/if}
                        </div>
                {/if}
                
                    <div class="card-actions mt-8 flex justify-between items-center">
                            <Button 
                            variant="ghost" 
                                on:click={previousQuestion}
                            disabled={currentQuestionIndex === 0}
                            class=" {currentQuestionIndex === 0 ? 'invisible' : ''}"
                            >
                            <ChevronLeft class="mr-2 size-4" /> Previous
                            </Button>
                    
                        {#if !showFeedback}
                            <Button 
                                on:click={checkAnswer}
                                disabled={(currentQuestion.type === 'short_answer' ? !shortAnswer : !selectedAnswer) || answeredQuestions[currentQuestionIndex]}
                                class="btn-primary"
                            >
                                 Check Answer {answeredQuestions[currentQuestionIndex] ? '(Answered)' : ''}
                            </Button>
                        {:else}
                             <Button on:click={nextQuestion} class="btn-primary">
                                {currentQuestionIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'} <ChevronRight class="ml-2 size-4" />
                            </Button>
                        {/if}
                    </div>
                </div>
            </div>
        {:else}
             <div class="card bg-base-100 shadow-xl text-center">
                <div class="card-body items-center">
                    <h2 class="card-title text-2xl mb-4">Quiz Completed!</h2>
                    <p class="text-lg mb-2">Your Score: <span class="font-bold">{score} out of {questions.length}</span></p>
                    <div class="radial-progress text-primary mb-6" style="--value:{Math.round((score / questions.length) * 100)}; --size:12rem; --thickness: 1rem;" role="progressbar">
                        {Math.round((score / questions.length) * 100)}%
                    </div>
                    <div class="card-actions justify-center space-x-4">
                        <Button on:click={restartQuiz} variant="outline">
                            <Brain class="mr-2 size-4"/> Retake Quiz
                        </Button>
                        <Button on:click={() => goto('/courses')} class="btn-primary">
                            <BookOpen class="mr-2 size-4"/> Back to Courses
                        </Button>
                </div>
            </div>
        </div>
        {/if}
    {/if}
</div> 

<style>
    .spinner {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 4px solid rgba(0, 0, 0, 0.1);
        border-top-color: hsl(var(--p));
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
</style> 