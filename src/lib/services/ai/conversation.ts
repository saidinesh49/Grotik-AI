import { Groq } from 'groq-sdk';

interface ConversationMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
}

interface Conversation {
    id: string;
    messages: ConversationMessage[];
    title: string;
    createdAt: Date;
    updatedAt: Date;
}

class AIConversationService {
    private static instance: AIConversationService;
    private groq: Groq;
    private conversations: Map<string, Conversation>;

    private constructor() {
        this.groq = new Groq({
            apiKey: import.meta.env.VITE_GROQ_API_KEY
        });
        this.conversations = new Map();
    }

    public static getInstance(): AIConversationService {
        if (!AIConversationService.instance) {
            AIConversationService.instance = new AIConversationService();
        }
        return AIConversationService.instance;
    }

    public async createConversation(title: string): Promise<Conversation> {
        const conversation: Conversation = {
            id: crypto.randomUUID(),
            title,
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.conversations.set(conversation.id, conversation);
        return conversation;
    }

    public async sendMessage(conversationId: string, content: string): Promise<ConversationMessage> {
        const conversation = this.conversations.get(conversationId);
        if (!conversation) {
            throw new Error('Conversation not found');
        }

        const userMessage: ConversationMessage = {
            role: 'user',
            content,
            timestamp: new Date()
        };

        conversation.messages.push(userMessage);
        conversation.updatedAt = new Date();

        try {
            const response = await this.groq.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: 'You are a financial education expert helping users learn about financial concepts in their preferred language.'
                    },
                    ...conversation.messages.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    }))
                ],
                model: "meta-llama/llama-4-scout-17b-16e-instruct",
                temperature: 0.7,
                max_tokens: 1024
            });

            const assistantMessage: ConversationMessage = {
                role: 'assistant',
                content: response.choices[0]?.message?.content || 'Sorry, I could not generate a response.',
                timestamp: new Date()
            };

            conversation.messages.push(assistantMessage);
            conversation.updatedAt = new Date();

            return assistantMessage;
        } catch (error) {
            console.error('Error in AI conversation:', error);
            throw new Error('Failed to get AI response');
        }
    }

    public getConversation(conversationId: string): Conversation | undefined {
        return this.conversations.get(conversationId);
    }

    public getAllConversations(): Conversation[] {
        return Array.from(this.conversations.values());
    }

    public deleteConversation(conversationId: string): void {
        this.conversations.delete(conversationId);
    }
}

export const aiConversationService = AIConversationService.getInstance();
export type { Conversation, ConversationMessage }; 