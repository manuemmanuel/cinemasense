'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './AIChatTab.module.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatTabProps {
  session: any;
}

export default function AIChatTab({ session }: AIChatTabProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I can help you understand your session results, metrics, and visualizations. Ask me anything about the data, what the metrics mean, or how to interpret the results.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input.trim(),
          session: {
            movieTitle: session.movie_title || session.movieTitle,
            expectedEmotion: session.expected_emotion || session.expectedEmotion,
            reflectionScore: session.reflection_score || session.metrics?.reflectionScore || 0,
            metrics: session.audience_metrics || session.metrics || {},
            totalPeople: session.total_people || session.totalPeople || 0,
            totalDetections: session.total_detections || session.totalDetections || 0,
            duration: session.session_duration || 0,
            emotionDistribution: session.audience_metrics?.emotion_distribution || {},
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle API errors
        const errorMsg = data.error || 'Failed to get AI response';
        const errorMessage: Message = {
          role: 'assistant',
          content: `Error: ${errorMsg}${data.details ? `\n\nDetails: ${data.details}` : ''}`,
        };
        setMessages((prev) => [...prev, errorMessage]);
        return;
      }

      if (!data.response) {
        const errorMessage: Message = {
          role: 'assistant',
          content: 'Error: Received empty response from AI service.',
        };
        setMessages((prev) => [...prev, errorMessage]);
        return;
      }

      const assistantMessage: Message = { role: 'assistant', content: data.response };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message || 'Unknown error'}. Please make sure the Gemini API key is configured in your .env.local file and restart the development server.`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.messages}>
        {messages.map((message, index) => (
          <div key={index} className={`${styles.message} ${styles[message.role]}`}>
            <div className={styles.messageContent}>
              {message.role === 'assistant' ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              ) : (
                message.content
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className={`${styles.message} ${styles.assistant}`}>
            <div className={styles.messageContent}>
              <span className={styles.typingIndicator}>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className={styles.inputContainer}>
        <textarea
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask about your session results, metrics, or visualizations..."
          rows={2}
          disabled={isLoading}
        />
        <button
          className={styles.sendButton}
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          title="Send message"
        >
          Send
        </button>
      </div>
    </div>
  );
}

