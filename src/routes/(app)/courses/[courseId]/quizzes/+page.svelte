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
    import { generateQuiz } from '$lib/services/groq';
    import { shuffleArray } from '$lib/utils/array';

    let courseId = $page.params.courseId;
    let courseContent: any = null;
    let course: any = null;
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
    let breadcrumbItems: { label: string; path?: string }[] = [];
    let userAnsweredQuestions: number[] = [];
    let useGroqQuestions = true;

    onMount(async () => {
        if (!$isAuthenticated) {
            goto('/signin');
            return;
        }

        // Get course information
        course = coursesData.courses.find((c: any) => c.id === courseId);
        
        // Set up breadcrumb navigation
        if (course) {
            breadcrumbItems = [
                { label: 'Courses', path: '/courses' },
                { label: course.title, path: `/courses/${courseId}` },
                { label: 'Quiz' }
            ];
        }

        try {
            // Find the corresponding content from the course-content.json file
            const contentIndex = getContentIndex(courseId);
            if (contentIndex !== -1) {
                courseContent = courseContentData[contentIndex];
                
                try {
                    // Try to get questions from GROQ first
                    const courseContentText = JSON.stringify(courseContent);
                    const groqQuestions = await generateQuiz(course.title, courseContentText, 'medium', 5);
                    console.log('GROQ Questions at UI:', groqQuestions);
                    if (groqQuestions && groqQuestions.questions && groqQuestions.questions.length > 0) {
                        questions = groqQuestions.questions;
                        useGroqQuestions = true;
                    } else {
                        throw new Error('No questions returned from GROQ');
                    }
                } catch (groqError) {
                    console.warn('Failed to get questions from GROQ, using fallback:', groqError);
                    // Fallback to course content questions
                    if (courseContent && courseContent.check_your_understanding) {
                        questions = shuffleArray([...courseContent.check_your_understanding]);
                        useGroqQuestions = false;
                    }
                }
                
                // Initialize userAnsweredQuestions array with 2 (not attempted)
                userAnsweredQuestions = new Array(questions.length).fill(2);
            }
        } catch (err) {
            console.error('Error loading quiz questions:', err);
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
    }

    function checkAnswer() {
        if (!questions[currentQuestionIndex]) return;
        
        const question = questions[currentQuestionIndex];
        let correct = false;
        
        if (question.type === 'multiple_choice' || question.type === 'true_false') {
            console.log("Selected answer:", selectedAnswer);
            console.log("Question correct/answer:", question.correct || question.answer);
            
            // Normalize both values to lowercase strings for comparison
            const userAnswer = selectedAnswer.toString().toLowerCase();
            const correctAnswer = (question.correct || question.answer).toString().toLowerCase();
            
            correct = userAnswer === correctAnswer;
            console.log("Comparison result:", correct);
            console.log("User answer:", userAnswer);
            console.log("Correct answer:", correctAnswer);
        } else if (question.type === 'short_answer') {
            correct = shortAnswer.toLowerCase().trim() === question.answer.toLowerCase().trim();
        }
        
        isCorrect = correct;
        feedbackMessage = correct ? 'Correct!' : `Incorrect. The correct answer is: ${question.correct || question.answer}`;
        showFeedback = true;
        
        if (correct) {
            score++;
            // Trigger confetti for correct answers
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
        
        // Mark this question as answered
        answeredQuestions[currentQuestionIndex] = true;
    }

    function nextQuestion() {
        if (currentQuestionIndex < questions.length - 1) {
            currentQuestionIndex++;
            // Only reset these if the question hasn't been answered yet
            if (userAnsweredQuestions[currentQuestionIndex] === 2) {
                selectedAnswer = '';
                shortAnswer = '';
                showFeedback = false;
            } else {
                // If question was answered, show the previous feedback
                const question = questions[currentQuestionIndex];
                showFeedback = true;
                isCorrect = userAnsweredQuestions[currentQuestionIndex] === 1;
                if (useGroqQuestions) {
                    feedbackMessage = isCorrect ? 
                        (question.explanation || 'Correct! Well done!') :
                        `Incorrect. The correct answer is: ${question.correct}`;
                    selectedAnswer = isCorrect ? question.correct : '';
                } else {
                    feedbackMessage = isCorrect ? 
                        'Correct! Well done!' :
                        `Incorrect. The correct answer is: ${question.answer}`;
                    selectedAnswer = isCorrect ? question.answer : '';
                }
            }
        }else if(currentQuestionIndex === questions.length-1){
            quizCompleted=true;
        }else{
          console.log("no questions");
        }
    }

    function previousQuestion() {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            // Show previous answer state
            const question = questions[currentQuestionIndex];
            if (userAnsweredQuestions[currentQuestionIndex] !== 2) {
                showFeedback = true;
                isCorrect = userAnsweredQuestions[currentQuestionIndex] === 1;
                if (useGroqQuestions) {
                    feedbackMessage = isCorrect ? 
                        (question.explanation || 'Correct! Well done!') :
                        `Incorrect. The correct answer is: ${question.correct}`;
                    selectedAnswer = isCorrect ? question.correct : '';
                } else {
                    feedbackMessage = isCorrect ? 
                        'Correct! Well done!' :
                        `Incorrect. The correct answer is: ${question.answer}`;
                    selectedAnswer = isCorrect ? question.answer : '';
                }
            } else {
                selectedAnswer = '';
                shortAnswer = '';
                showFeedback = false;
            }
        }
    }

    function restartQuiz() {
        currentQuestionIndex = 0;
        // Reset answer state based on the first question type
        const firstQuestion = questions[0];
        if (firstQuestion.type === 'multiple_choice' || firstQuestion.type === 'true_false') {
            selectedAnswer = '';
        } else if (firstQuestion.type === 'short_answer') {
            shortAnswer = '';
        }
        score = 0;
        quizCompleted = false;
        showFeedback = false;
        userAnsweredQuestions = new Array(questions.length).fill(2);
    }

    function getProgressPercentage(curQuestionInd: number) {
        return ((curQuestionInd + 1) / questions.length) * 100;
    }
    
    function getAnsweredCount() {
        return userAnsweredQuestions.filter((answer) => answer !== 2).length;
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
            <h1 class="text-3xl font-bold">Course Quiz</h1>
        </div>
    </div>

    <!-- Breadcrumb Navigation -->
    <div class="mb-4">
        <Breadcrumb items={breadcrumbItems} />
    </div>

    {#if error}
        <div class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>Failed to load quiz. Please try again later.</span>
        </div>
    {:else if loading}
        <div class="flex justify-center items-center h-64">
            <div class="loading loading-spinner loading-lg"></div>
        </div>
    {:else if questions.length === 0}
        <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
                <h2 class="card-title">No Quiz Available</h2>
                <p>There are no quiz questions available for this course yet.</p>
                <div class="card-actions justify-end">
                    <Button 
                        variant="primary" 
                        on:click={goToCourse}
                        class="gap-2"
                    >
                        <BookOpen class="h-4 w-4" />
                        Return to Course
                    </Button>
                </div>
            </div>
        </div>
    {:else if quizCompleted}
        <div class="card bg-base-100 shadow-xl" in:fly={{ y: 20, duration: 500 }}>
            <div class="card-body">
                <h2 class="card-title">Quiz Completed!</h2>
                <div class="flex flex-col items-center justify-center py-8">
                    <div class="text-6xl font-bold mb-4">{score}/{questions.length}</div>
                    <div class="text-xl mb-6">
                        {#if score === questions.length}
                            Perfect score! Excellent work!
                        {:else if score >= questions.length * 0.8}
                            Great job! You've mastered most of the material.
                        {:else if score >= questions.length * 0.6}
                            Good effort! You've learned a lot.
                        {:else}
                            Keep learning! You'll improve with practice.
                        {/if}
                    </div>
                    <div class="flex gap-4">
                        <Button 
                            variant="primary" 
                            on:click={restartQuiz}
                            class="gap-2"
                        >
                            <Brain class="h-4 w-4" />
                            Try Again
                        </Button>
                        <Button 
                            variant="outline" 
                            on:click={goToCourse}
                            class="gap-2"
                        >
                            <BookOpen class="h-4 w-4" />
                            Return to Course
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    {:else}
        <div class="card bg-base-100 shadow-xl" in:fly={{ y: 20, duration: 500 }}>
            <div class="card-body px-6 py-2 m-0">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="card-title">Question {currentQuestionIndex + 1} of {questions.length}</h2>
                    <div class="badge badge-primary">{Math.round(getProgressPercentage(currentQuestionIndex))}% Complete</div>
                </div>
                
                <div class="w-full bg-gray-200 rounded-full h-2.5 mb-6">
                    <div class="bg-sky-400 h-2.5 rounded-full" style="width: {getProgressPercentage(currentQuestionIndex)}%"></div>
                </div>
                
                <div class="mb-6">
                    <p class="text-lg font-medium">{questions[currentQuestionIndex].question}</p>
                </div>
                
                {#if questions[currentQuestionIndex]?.type === 'multiple_choice' }
                    <div class="space-y-3 mb-6">
                        {#if questions[currentQuestionIndex]?.options && Array.isArray(questions[currentQuestionIndex]?.options)}
                            {#each questions[currentQuestionIndex].options as option}
                                <label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-base-200 transition-colors {selectedAnswer === option ? 'border-primary bg-primary/10' : ''}">
                                    <input 
                                        type="radio" 
                                        name="answer" 
                                        value={option} 
                                        bind:group={selectedAnswer}
                                        class="radio radio-primary mr-3"
                                    />
                                    <span>{option}</span>
                                </label>
                            {/each}
                        {/if}
                    </div>
                {:else if questions[currentQuestionIndex]?.type === 'true_false' }
                    <div class="grid grid-cols-2 gap-4 mb-6">
                        <label class="flex items-center justify-center p-4 border rounded-lg cursor-pointer hover:bg-base-200 transition-colors {selectedAnswer === 'True' ? 'border-primary bg-primary/10' : ''}">
                            <input 
                                type="radio" 
                                name="answer" 
                                value="true" 
                                bind:group={selectedAnswer}
                                class="radio radio-primary mr-3"
                            />
                            <span>True</span>
                        </label>
                        <label class="flex items-center justify-center p-4 border rounded-lg cursor-pointer hover:bg-base-200 transition-colors {selectedAnswer === 'False' ? 'border-primary bg-primary/10' : ''}">
                            <input 
                                type="radio" 
                                name="answer" 
                                value="false" 
                                bind:group={selectedAnswer}
                                class="radio radio-primary mr-3"
                            />
                            <span>False</span>
                        </label>
                    </div>
                {:else if questions[currentQuestionIndex]?.type === 'short_answer'}
                    <div class="mb-6">
                        <input 
                            type="text" 
                            placeholder="Type your answer here" 
                            bind:value={shortAnswer}
                            class="input input-bordered w-full"
                        />
                    </div>
                {:else}
                    <div> question type not </div>
                {/if}
                
                {#if showFeedback}
                    <div class="alert {isCorrect ? 'alert-success' : 'alert-error'} mb-6 {isCorrect ? 'text-green-400' : 'text-red-400'}" in:fly={{ y: 10, duration: 300 }}>
                        {#if isCorrect}
                            <Check class="h-5 w-5" />
                        {:else}
                            <X class="h-5 w-5" />
                        {/if}
                        <span>{feedbackMessage}</span>
                    </div>
                    
                    {#if questions[currentQuestionIndex].explanation}
                        <div class="bg-base-200 p-4 rounded-lg mb-6 border border-sky-500 text-sky-500">
                            <p class="font-medium">Explanation:</p>
                            <p>{questions[currentQuestionIndex].explanation}</p>
                        </div>
                    {/if}
                {/if}
                
                <div class="card-actions justify-between">
                    <div>
                        {#if currentQuestionIndex > 0}
                            <Button 
                                variant="outline" 
                                on:click={previousQuestion}
                                class="gap-2"
                            >
                                <ChevronLeft class="h-4 w-4" />
                                Previous
                            </Button>
                        {/if}
                    </div>
                    
                    <div>
                        {#if !showFeedback}
                            <Button 
                                variant="primary" 
                                on:click={checkAnswer}
                                disabled={!selectedAnswer}
                                class="gap-2 {currentQuestionIndex>0?'mt-4':''}"
                            >
                                <Check class="h-4 w-4" />
                                Check Answer
                            </Button>
                        {:else}
                            <Button 
                                variant="primary" 
                                on:click={nextQuestion}
                                class="gap-2 border hover:bg-white/10"
                            >
                                {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                                <ChevronRight class="h-4 w-4" />
                            </Button>
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    {/if}
</div> 