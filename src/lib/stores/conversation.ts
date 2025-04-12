import { writable } from 'svelte/store';
import type { Conversation, ConversationMessage } from '$lib/services/ai/conversation';
import { aiConversationService } from '$lib/services/ai/conversation';

interface ConversationState {
    conversations: Conversation[];
    currentConversation: Conversation | null;
    isLoading: boolean;
    error: string | null;
}

function createConversationStore() {
    const { subscribe, set, update } = writable<ConversationState>({
        conversations: [],
        currentConversation: null,
        isLoading: false,
        error: null
    });

    return {
        subscribe,
        async createConversation(title: string) {
            update(state => ({ ...state, isLoading: true, error: null }));
            try {
                const conversation = await aiConversationService.createConversation(title);
                update(state => ({
                    ...state,
                    conversations: [...state.conversations, conversation],
                    currentConversation: conversation,
                    isLoading: false
                }));
                return conversation;
            } catch (error) {
                update(state => ({
                    ...state,
                    error: error instanceof Error ? error.message : 'Failed to create conversation',
                    isLoading: false
                }));
                throw error;
            }
        },
        async sendMessage(content: string) {
            let currentState: ConversationState = {
                conversations: [],
                currentConversation: null,
                isLoading: false,
                error: null
            };

            update(state => {
                currentState = state;
                return { ...state, isLoading: true, error: null };
            });

            try {
                if (!currentState.currentConversation) {
                    throw new Error('No active conversation');
                }

                const message = await aiConversationService.sendMessage(
                    currentState.currentConversation.id,
                    content
                );

                update(state => {
                    if (!state.currentConversation) return state;
                    return {
                        ...state,
                        currentConversation: {
                            ...state.currentConversation,
                            messages: [...state.currentConversation.messages, message]
                        },
                        isLoading: false
                    };
                });

                return message;
            } catch (error) {
                update(state => ({
                    ...state,
                    error: error instanceof Error ? error.message : 'Failed to send message',
                    isLoading: false
                }));
                throw error;
            }
        },
        setCurrentConversation(conversation: Conversation | null) {
            update(state => ({ ...state, currentConversation: conversation }));
        },
        async loadConversations() {
            update(state => ({ ...state, isLoading: true, error: null }));
            try {
                const conversations = aiConversationService.getAllConversations();
                update(state => ({
                    ...state,
                    conversations,
                    isLoading: false
                }));
            } catch (error) {
                update(state => ({
                    ...state,
                    error: error instanceof Error ? error.message : 'Failed to load conversations',
                    isLoading: false
                }));
            }
        },
        deleteConversation(conversationId: string) {
            update(state => {
                aiConversationService.deleteConversation(conversationId);
                return {
                    ...state,
                    conversations: state.conversations.filter(c => c.id !== conversationId),
                    currentConversation: state.currentConversation?.id === conversationId
                        ? null
                        : state.currentConversation
                };
            });
        }
    };
}

export const conversationStore = createConversationStore(); 