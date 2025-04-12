import { Groq } from 'groq-sdk';

// Initialize Groq client
const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true // Enable browser usage
});

// Quiz generation function
export async function generateQuiz(topic: string, courseContent: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium', count: number = 6) {
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a financial education expert creating quizzes for a learning platform. 
          Using the following course content as context:
          
          ${courseContent}
          
          Create ${count} to ${count + 2} questions about ${topic} at ${difficulty} difficulty level and also keep some a little curious questions also (not much far related but a little logically thinkable question before answering that type of questions and provide different questions related to this topic).
          Mix of question types:
          - 60% Multiple choice questions (4 options)
          - 40% True/False questions
          
          Format your response just in curly braces with the exact following structure, and don't respond with anything else/any other text/or any additional text, just only the data in curly braces:
          {
            "questions": [
              {
                "type": "multiple_choice",
                "question": "Question text here",
                "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
                "correct": "Correct option text here(should match exactly with one of the option in the options list of the question)",
                "explanation": "simple short explanation of why this is the correct answer (2 lines)"
              },
              {
                "type": "true_false",
                "question": "True/False question text here",
                "options": ["True", "False"],
                "correct": "True or False (exact match)",
                "explanation": "simple short explanation of why this is the correct answer (2 lines)"
              }
            ]
          }`
        }
      ],
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 1,
      stream: false
    });

    // Extract the content from the response
    const content = chatCompletion.choices[0]?.message?.content || '';
    console.log('Raw GROQ response:', content);
    
    // Clean and normalize the response
    try {
      // Remove any leading/trailing spaces and normalize field names
      const cleanContent = content
        .replace(/"example works:\s*"/, '"explanation": "')
        .replace(/"explaine":\s*"/, '"explanation": "')
        .trim();
      
      const quizData = JSON.parse(cleanContent);
      if (!quizData.questions || !Array.isArray(quizData.questions)) {
        throw new Error("Invalid JSON structure: 'questions' must be an array.");
      }
      // Normalize the questions data
      quizData.questions = quizData.questions.map((q: any) => ({
        type: q.type || 'multiple_choice',
        question: q.question,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation || 'Correct answer!'
      }));
      
      console.log('Parsed quiz data:', quizData);
      return quizData;
    } catch (error) {
      console.error('Error parsing Groq response:', error);
      console.log('Failed content:', content);
      throw new Error('Failed to parse quiz data from Groq API');
    }
  } catch (error) {
    console.error('Error generating quiz with Groq:', error);
    throw new Error('Failed to generate quiz with Groq API');
  }
}

// Course content generation function
export async function generateCourseContent(topic: string, outline: string) {
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a financial education expert creating course content for a learning platform.
          Create detailed, engaging content for a course about ${topic} based on the following outline:
          ${outline}
          
          Format your response as a valid JSON object with the following structure:
          {
            "title": "Course title",
            "description": "Course description",
            "modules": [
              {
                "title": "Module title",
                "description": "Module description",
                "lessons": [
                  {
                    "title": "Lesson title",
                    "content": "Detailed lesson content in markdown format"
                  }
                ]
              }
            ]
          }`
        }
      ],
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0.7,
      max_tokens: 2048,
      top_p: 1,
      stream: false
    });

    // Extract the content from the response
    const content = chatCompletion.choices[0]?.message?.content || '';
    console.log('Raw GROQ response:', content);
    
    // Parse the JSON response
    try {
      const courseData = JSON.parse(content.trim());
      console.log('Parsed course data:', courseData);
      return courseData;
    } catch (error) {
      console.error('Error parsing Groq response:', error);
      console.log('Failed content:', content);
      throw new Error('Failed to parse course data from Groq API');
    }
  } catch (error) {
    console.error('Error generating course content with Groq:', error);
    throw new Error('Failed to generate course content with Groq API');
  }
} 