import React, { useState, useRef, useEffect } from 'react';
import { Send, Info, Zap, RotateCcw, User, Bot } from 'lucide-react';

// Define types for our messages
interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
}

/**
 * AI Carb Coach Component
 * 
 * This component provides an advanced chat interface powered by OpenAI
 * where athletes can receive expert guidance on carbohydrate nutrition,
 * gut training, and race fueling strategies from a leading authority.
 */
const AICarCoach: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hi, I'm Dr. Noo, your AI Carb Coach. I specialize in optimizing carbohydrate intake strategies for endurance athletes. How can I help improve your nutrition plan today?",
      role: 'assistant',
      timestamp: new Date()
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to the bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Function to call OpenAI API
  const fetchAIResponse = async (conversationHistory: Message[]) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Convert our messages format to OpenAI format
      const apiMessages = conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Add system message to position the AI as an authoritative expert
      const systemMessage = {
        role: "system",
        content: `You are Dr. Noo, the world's leading AI Carb Coach specializing in nutrition for endurance athletes.
        
        As an authority in the field:
        - Provide evidence-based, specific advice on carbohydrate intake for training and racing
        - Correct any misinformation confidently, explaining why certain approaches are suboptimal
        - Be direct and opinionated about best practices, don't just present options
        - Tailor advice to the athlete's specific context (sport, distance, goals)
        - Reference current research and elite athlete practices when relevant
        - Focus on practical, actionable advice for gut training and race day nutrition
        - Use precise numbers and ranges when discussing carbohydrate intake (g/hour, etc.)
        
        Your expertise is in:
        - Carbohydrate periodization and timing strategies
        - Optimizing gut comfort and absorption during exercise
        - Multiple transportable carbohydrate approaches
        - Race-specific fueling plans
        - Training the gut to handle higher carbohydrate loads
        - Troubleshooting GI distress issues`
      };
      
      // Simulate API call - in a real implementation, this would be an actual fetch to your backend
      // which would then call OpenAI with your API key
      const response = await simulateOpenAICall([
        systemMessage, 
        ...apiMessages
      ]);
      
      return response;
    } catch (err) {
      console.error('Error fetching AI response:', err);
      setError('Failed to get a response. Please try again.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Temporary simulation function - this would be replaced with a real API call
  const simulateOpenAICall = async (messages: any[]) => {
    // In a real implementation, this would be a fetch call to your backend API
    // that handles the OpenAI request with your API key
    
    // For now, we'll simulate a delay and return a canned response
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Extract the last user message to generate a somewhat relevant response
    const lastUserMessage = messages.findLast(m => m.role === 'user')?.content.toLowerCase() || '';
    
    // Generate a more sophisticated response based on keywords
    let response = "As your AI Carb Coach, I recommend approaching this systematically. ";
    
    if (lastUserMessage.includes('marathon') || lastUserMessage.includes('race') || lastUserMessage.includes('event')) {
      response += "For marathon distances, I specifically recommend aiming for 60-90g of carbohydrates per hour. This is based on research showing performance benefits at these intake levels for efforts lasting 2+ hours. Start practicing with 60g/hour in training and gradually increase. It's critical to train your gut regularly with your race-day nutrition strategy at least 6-8 weeks before your event.";
    } 
    else if (lastUserMessage.includes('gi') || lastUserMessage.includes('stomach') || lastUserMessage.includes('distress')) {
      response += "GI distress is common but manageable with the right approach. I've worked with many athletes who've overcome this. The key is methodical gut training: 1) Start lower (30-40g/hr), 2) Use multiple transportable carbs (glucose+fructose), 3) Gradually increase by 10g every 2 weeks, 4) Hydrate properly, 5) Avoid high-fiber foods pre-exercise. Many athletes make the mistake of not practicing their nutrition strategy consistently enough during training.";
    }
    else if (lastUserMessage.includes('gel') || lastUserMessage.includes('drink') || lastUserMessage.includes('source')) {
      response += "For optimal carbohydrate delivery, I recommend a combination approach rather than relying on a single source. Research clearly shows that a glucose:fructose ratio of approximately 2:1 maximizes absorption rates. Most elite athletes use a mix of isotonic drinks (~6% solution) for baseline fueling and hydration, plus gels or chews at strategic intervals. This approach allows for up to 90-120g/hr absorption in well-trained guts, far superior to the outdated single-source methods.";
    }
    else {
      response += "Based on current research, I recommend a periodized approach to carbohydrate intake. For your key workouts and races, aim for 60-90g of carbs per hour using multiple transportable carbohydrates (combining glucose and fructose sources). This maximizes absorption rates and performance. Start each training session with 30-40g/hour and gradually increase by 10g every 1-2 weeks until you reach your target. Consistency is absolutely critical - you must train your gut regularly with your race-day nutrition to avoid GI issues when it matters most.";
    }
    
    return { 
      role: 'assistant',
      content: response
    };
  };
  
  // Handle sending a new message
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    
    // Get all messages for context, excluding system messages
    const conversationHistory = [
      ...messages.filter(m => m.role !== 'system'),
      userMessage
    ];
    
    // Call OpenAI
    const aiResponse = await fetchAIResponse(conversationHistory);
    
    if (aiResponse) {
      const coachResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse.content,
        role: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, coachResponse]);
    }
  };
  
  // Handle pressing Enter key to send message
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Clear conversation
  const handleClearConversation = () => {
    setMessages([{
      id: '1',
      content: "Hi, I'm Dr. Noo, your AI Carb Coach. I specialize in optimizing carbohydrate intake strategies for endurance athletes. How can I help improve your nutrition plan today?",
      role: 'assistant',
      timestamp: new Date()
    }]);
  };
  
  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-md overflow-hidden">
      {/* Chat header */}
      <div className="bg-primary-700 text-white p-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center mr-3">
            <Zap size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">AI Carb Coach</h2>
            <p className="text-xs opacity-80">Expert Nutrition Guidance for Endurance Athletes</p>
          </div>
        </div>
        <button 
          onClick={handleClearConversation}
          className="p-2 rounded-full hover:bg-primary-600 transition-colors"
          title="Start a new conversation"
        >
          <RotateCcw size={16} />
        </button>
      </div>
      
      {/* Chat messages container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50">
        {messages.map(message => (
          <div 
            key={message.id} 
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-[85%]`}>
              {message.role !== 'user' && (
                <div className="h-8 w-8 rounded-full bg-primary-600 text-white flex items-center justify-center mt-1 mr-2">
                  <Bot size={16} />
                </div>
              )}
              <div 
                className={`rounded-lg p-3 ${
                  message.role === 'user' 
                    ? 'bg-primary-600 text-white rounded-tr-none' 
                    : 'bg-white border border-neutral-200 rounded-tl-none'
                }`}
              >
                <p className="whitespace-pre-line">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-primary-100' : 'text-neutral-400'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {message.role === 'user' && (
                <div className="h-8 w-8 rounded-full bg-neutral-700 text-white flex items-center justify-center mt-1 ml-2">
                  <User size={16} />
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex">
              <div className="h-8 w-8 rounded-full bg-primary-600 text-white flex items-center justify-center mt-1 mr-2">
                <Bot size={16} />
              </div>
              <div className="bg-white border border-neutral-200 rounded-lg rounded-tl-none p-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">
            {error} <button className="underline" onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <div className="p-4 border-t border-neutral-200 bg-white">
        <div className="flex items-center">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask the AI Carb Coach about your nutrition strategy..."
            className="flex-1 p-3 border border-neutral-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className={`p-3 rounded-r-lg ${
              inputValue.trim() && !isLoading
                ? 'bg-primary-600 text-white hover:bg-primary-700' 
                : 'bg-neutral-200 text-neutral-400'
            } transition-colors`}
          >
            <Send size={20} />
          </button>
        </div>
        <p className="mt-2 text-xs text-neutral-500 flex items-center">
          <Info size={12} className="mr-1" />
          This coach is powered by AI and provides guidance based on current research in sports nutrition.
        </p>
      </div>
    </div>
  );
};

export default AICarCoach;
