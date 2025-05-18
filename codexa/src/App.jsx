import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MdLogout } from 'react-icons/md';
import { FaChevronUp, FaChevronDown, FaKeyboard, FaCircleArrowUp, FaArrowRight } from 'react-icons/fa6';
import { GiNorthStarShuriken } from 'react-icons/gi';
import { LuTextCursorInput } from 'react-icons/lu';
import { useAuth } from './AuthContext';
import LoginPage from './login.component';
import ProfilePage from './ProfilePage';
import fetchGeminiResponse from './howItWorks';
import fetchFollowUpResponse from './followUpQuestions';
import { createConversation, updateConversation, getConversationById, isValidCode } from './services/firestore';

function App() {
  const { currentUser, logOut } = useAuth();
  const [isSelected, setIsSelected] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const typingRef = useRef(null);
  const [geminiResponse, setGeminiResponse] = useState("");
  const [geminiError, setGeminiError] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [isfollowUp, setIsFollowUp] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const scrollRef = useRef(null);
  const [isManualInput, setIsManualInput] = useState(false);
  const [manualInputText, setManualInputText] = useState("");
  
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [conversationTitle, setConversationTitle] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [appMode, setAppMode] = useState("initial"); //initial, analyzing, loaded, creating

  useEffect(() => {
    return () => {
      if (typingRef.current) clearInterval(typingRef.current);
    };
  }, []);

  const scrollToBottom = () => {
    if(scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }

  const getSelectedText = async () => {
    try {
      if (!isManualInput) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab?.id) {
          console.error("No active tab found");
          return;
        }

        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            return window.getSelection()?.toString();
          },
        });

        const text = results?.[0]?.result;
        
        if (!text || text === "" || text === "No text selected") {
          console.log("No text was selected");
          return;
        }
        
        setSelectedText(text);
        setIsTyping(true);
        startTypingAnimation(text);
        
        // Start analysis with the new text
        analyzeNewCode(text);
      }
    } catch (error) {
      console.error("Error getting selected text:", error);
    }
  };

  const startTypingAnimation = (text) => {
    const truncatedText = text.length > 50 ? text.substring(0, 50) + "..." : text;
    let index = 0;
    setDisplayedText("");
    
    if (typingRef.current) clearInterval(typingRef.current);
    
    typingRef.current = setInterval(() => {
      if (index < truncatedText.length) {
        setDisplayedText(prev => prev + truncatedText.charAt(index));
        index++;
      } else {
        clearInterval(typingRef.current);
        setIsTyping(false);
      }
    }, 25); 
  };

  const handleButtonClick = () => {
    setIsSelected(true);
    setAppMode("analyzing");
    setTimeout(() => {
      getSelectedText();
    }, 100); 
  };

  const handleManualInputSubmit = () => {
    if (manualInputText.trim()) {
      setIsSelected(true);
      setSelectedText(manualInputText);
      
      if (!isValidCode(manualInputText)) {
        setGeminiResponse("I can only explain code snippets. The provided text doesn't appear to be code. Please enter a valid code snippet and try again.");
        return;
      }
      
      setIsTyping(true);
      startTypingAnimation(manualInputText);
      
      // directly analyze the manual input
      analyzeNewCode(manualInputText);
    }
  };
  
  // completely separate function for analyzing new code snippets
  const analyzeNewCode = async (codeToAnalyze) => {
    setAppMode("analyzing");
    setIsLoadingResponse(true);
    
    if (!isValidCode(codeToAnalyze)) {
      setGeminiResponse("I can only explain code snippets. The selected text doesn't appear to be code. Please select a code snippet and try again.");
      setIsLoadingResponse(false);
      setAppMode("creating");
      return;
    }
    
    try {
      const response = await fetchGeminiResponse(
        "Explain what the following code does in simple terms.\nMake sure to:\n- Break it down step by step\n- Use bullet points where needed\n- Format code snippets using backticks\n- Keep it concise but thorough\n Do not explain extremely obvious things and try to keep it short and sweet \n I need to display this on my web app so for bold headings use two bullet points (**)\n\nHere is the code(if this is not code then tell me tthat you will not provide an answer):\n" + 
        codeToAnalyze
      );
      
      setIsLoadingResponse(false);
      
      if (response.error) {
        setGeminiError(response.error.message);
        return;
      } else {
        const responseText = response.candidates[0].content.parts[0].text;
        
        if (responseText.toLowerCase().includes("not code") || 
            responseText.toLowerCase().includes("isn't code") ||
            responseText.toLowerCase().includes("doesn't appear to be code")) {
          setGeminiResponse(responseText);
          return;
        }
        
        const initialConversation = [
          {
            role: "user",
            parts: [{ text: codeToAnalyze }],
          },
          { 
            role: "model", 
            parts: [{ text: responseText }] 
          }
        ];
        
        setConversation(initialConversation);
        setAppMode("creating");
        
        if (currentUser && isValidCode(codeToAnalyze)) {
          try {
            const title = await generateTitle(codeToAnalyze);
            setConversationTitle(title);
            
            const conversationId = await createConversation(
              currentUser.uid,
              codeToAnalyze,
              title,
              responseText
            );
            
            if (conversationId) {
              setActiveConversationId(conversationId);
            }
          } catch (error) {
            console.error("Error saving conversation:", error);
          }
        }
        
        setGeminiResponse(responseText);
      }
    } catch (error) {
      console.error("Error analyzing code:", error);
      setIsLoadingResponse(false);
      setGeminiError("An error occurred while analyzing the code. Please try again.");
    }
  };
  // generate a title for the chat
  const generateTitle = async (code) => {
    try {
      const prompt = `Generate a short, descriptive title (maximum 5 words) for this code snippet. Don't use quotes or formatting, just the title text:
      
      ${code.substring(0, 500)}`;
      
      const response = await fetchGeminiResponse(prompt);
      
      if (response.error) {
        console.error("Error generating title:", response.error);
        return "Untitled Code Analysis";
      }
      
      const title = response.candidates[0].content.parts[0].text.trim();
      return title.substring(0, 50); // Limit title length
    } catch (error) {
      console.error("Failed to generate title:", error);
      return "Untitled Code Analysis";
    }
  };

  //loadConversation function to avoid triggering API calls
  const loadConversation = async (conversationId) => {
    try {
      setLoadingConversation(true);
      setAppMode("loaded"); // set app mode to "loaded" to prevent any new API calls
      setShowProfile(false);
      
      const conversationData = await getConversationById(conversationId);
      
      if (conversationData) {

        setActiveConversationId(conversationId);
        setConversationTitle(conversationData.title || "Untitled Conversation");
        setSelectedText(conversationData.originalCode || "");

        const formattedConversation = (conversationData.messages || []).map(msg => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }]
        }));

        setConversation(formattedConversation);
        
        if (formattedConversation.length >= 2) {
          setGeminiResponse(formattedConversation[1].parts[0].text);
          setIsFollowUp(formattedConversation.length > 2);
        }

        setIsSelected(true);
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
    } finally {
      setLoadingConversation(false);
    }
  };

  const askFollowUp = async () => {
    if (!followUp.trim()) return;
    
    setIsLoadingResponse(true);
    const newMessage = {
      role: "user",
      parts: [{ text: followUp + "\n (Strict api rules to adhere to: Only answer if this question is related to the code initially provided in the first message, if no code or a random non code related statement was provided than deny to answer...)" }],
    };
    
    const updatedConversation = [
      ...conversation,
      newMessage
    ];

    setConversation(updatedConversation);
    scrollToBottom();

    const response = await fetchFollowUpResponse(updatedConversation);
    setIsLoadingResponse(false);
    
    if (response.error) {
      setGeminiError(response.error.message);
      return;
    } else {
      const responseText = response.candidates[0].content.parts[0].text;
      const finalConversation = [
        ...updatedConversation,
        { 
          role: "model", 
          parts: [{ text: responseText }] 
        }
      ];
      
      setConversation(finalConversation);
      
      // only update the conversation in Firestore if it was created before
      if (activeConversationId) {
        try {
          await updateConversation(
            activeConversationId,
            newMessage,
            responseText
          );
        } catch (error) {
          console.error("Error updating conversation:", error);
        }
      }
      
      setFollowUp("");
      scrollToBottom();
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  useEffect(() => {
    if (isfollowUp) {
      scrollToBottom();
    }
  }, [isfollowUp]);

  const handleSignOut = async () => {
    try {
      await logOut();
      resetChat();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const resetChat = () => {
    setIsLoadingResponse(false);
    setLoadingConversation(false);
    setIsSelected(false);
    setShowProfile(false);
    setAppMode("initial");
    setIsManualInput(false);

    setSelectedText("");
    setGeminiResponse("");
    setConversation([]);
    setActiveConversationId(null);
    setIsFollowUp(false);
    setFollowUp("");
    setConversationTitle("");
    setGeminiError("");
    setDisplayedText("");
    setIsTyping(false);
    
    setManualInputText("");
    
    if (typingRef.current) {
      clearInterval(typingRef.current);
      typingRef.current = null;
    }
  };

  if(!currentUser){
    return <LoginPage />;
  }

  if(currentUser && !currentUser.emailVerified) {
    return <LoginPage />;
  }
  
  if (showProfile) {
    return (
      <ProfilePage 
        onClose={() => setShowProfile(false)} 
        onSelectConversation={loadConversation}
      />
    );
  }

  return (
    <div className='flex w-screen h-screen bg-black items-center justify-center relative'>
      <div className='max-w-[350px] max-h-[450px] h-full w-full bg-white/5 flex flex-col p-4 relative'>
        <div className='flex flex-col items-center w-full justify-center p-2'>
          <motion.h1
            initial={{opacity:0, y:-20}}
            animate={{opacity:1, y:0}}
            transition={{ 
              type: "spring",
              duration: 0.9, 
              stiffness: 100,
              damping: 15,
            }}
            onClick={resetChat}
            className='font-bold text-2xl text-white cursor-pointer'>Codexa
            <motion.div className='w-full h-1 bg-gradient-to-r from-yellow-300 to-red-500 rounded-full'
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 0.9, ease: 'easeInOut', delay: 0.5 }}
            ></motion.div>
          </motion.h1>

          {currentUser && (
            <div className="flex items-center gap-2 absolute top-4 right-4">
              <motion.button
                onClick={() => setShowProfile(true)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="flex items-center justify-center"
              >
                {currentUser.photoURL ? (
                  <img 
                    src={currentUser.photoURL} 
                    alt="Profile"
                    className="h-7 w-7 rounded-full border border-yellow-400"
                  />
                ) : (
                  <div 
                    className="h-7 w-7 rounded-full border border-yellow-400 bg-yellow-500/30 flex items-center justify-center text-white text-xs font-bold"
                  >
                    {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 
                    currentUser.email ? currentUser.email.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
              </motion.button>
              <motion.button
                onClick={handleSignOut}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="text-yellow-300 text-xl p-1 rounded hover:bg-black/30"
                title="Sign Out"
              >
                <MdLogout />
              </motion.button>
            </div>
          )}
        </div>
        
        {activeConversationId && conversationTitle && isSelected && geminiResponse && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-2 text-center mt-1 mb-2"
          >
            <h3 className="text-yellow-400 text-sm font-medium truncate max-w-full">
              {conversationTitle}
            </h3>
          </motion.div>
        )}
        
        {loadingConversation ? (
          <div className="flex-1 flex items-center justify-center">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="text-yellow-400 text-3xl"
            >
              <GiNorthStarShuriken />
            </motion.div>
          </div>
        ) : isSelected ? (
          <div className='flex flex-col items-center justify-center w-full h-full gap-3'>
            {geminiResponse ? (
              <div className='flex flex-col items-center justify-top w-full h-full gap-3'>

                {geminiResponse.toLowerCase().includes("doesn't appear to be code") || 
                 geminiResponse.toLowerCase().includes("isn't code") ||
                 geminiResponse.toLowerCase().includes("not code") ? (
                  <motion.div 
                    className='w-full h-full p-4 max-h-[350px] relative overflow-hidden bg-black/40 border border-yellow-500/30 rounded-lg '
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.5 }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className='text-yellow-300 whitespace-pre-line p-4 flex flex-col items-center'>
                      <div className="text-yellow-500 text-4xl mb-4">⚠️</div>
                      <p className="text-center mb-4">{geminiResponse}</p>
                      <motion.button
                        onClick={resetChat}
                        className="px-3 py-2 bg-yellow-500/20 text-yellow-300 rounded-md border border-yellow-500/30"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Try Again
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  <>
                    {!isfollowUp ? (
                      <motion.div 
                        className='w-full h-full p-4 max-h-[250px] relative bg-black/40 border border-yellow-500/30 rounded-lg overflow-auto'
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ duration: 0.5 }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <motion.button 
                          className="absolute top-2 right-2 text-xl text-yellow-300 cursor-pointer"
                          whileHover={{
                            scale: 1.05,
                            transition: { duration: 0.2 }
                          }}
                          whileTap={{
                            scale: 0.95,
                            y: -3,
                            transition: { duration: 0.2, ease: "easeInOut" }
                          }}
                          onClick={() => setIsFollowUp(true)}
                        >
                          <FaChevronUp/>
                        </motion.button>
                        <div className='text-yellow-300 whitespace-pre-line'>
                          {geminiResponse.split('\n').map((line, index) => {
                            if (line.startsWith('**') && line.endsWith('**')) {
                              const headerText = line.substring(2, line.length - 2);
                              return (
                                <div key={index} className='mb-3 mt-2'>
                                  <h2 className='font-bold text-lg'>{headerText}</h2>
                                </div>
                              );
                            }
                            else if (line.startsWith('**') && line.substring(2).trim().includes('**')) {
                              const headerText = line.substring(2, line.lastIndexOf('**'));
                              return (
                                <div key={index} className='mb-3 mt-2'>
                                  <h2 className='font-bold text-lg'>{headerText}</h2>
                                </div>
                              );
                            }
                            else if (line.startsWith('** ')) {
                              return (
                                <div key={index} className='mb-3 mt-2'>
                                  <h2 className='font-bold text-lg'>{line.substring(3)}</h2>
                                </div>
                              );
                            }
                            else if (line.startsWith('• ') || line.startsWith('* ') || line.startsWith('- ')) {
                              const bulletText = line.substring(2);
                              return (
                                <div key={index} className='mb-2 flex'>
                                  <span className='mr-2'>•</span>
                                  <span>{bulletText}</span>
                                </div>
                              );
                            }
                            else if (line.includes('`')) {
                              const segments = line.split('`');
                              return (
                                <div key={index} className='mb-2'>
                                  {segments.map((segment, segIdx) => (
                                    segIdx % 2 === 0 ? 
                                      <span key={segIdx}>{segment}</span> : 
                                      <code key={segIdx} className='bg-black/50 px-1 py-0.5 rounded font-mono text-green-300'>{segment}</code>
                                  ))}
                                </div>
                              );
                            }
                            else {
                              return <div key={index} className='mb-2'>{line}</div>;
                            }
                          })}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        className='w-[95%] max-h-[40px] h-full p-2 scrollbar-hide absolute top-24 flex justify-between items-center bg-yellow-300/10 rounded-lg overflow-auto'
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <p className='text-yellow-300 text-sm'>See the first response</p>
                        <motion.button 
                          onClick={() => setIsFollowUp(false)}
                          whileHover={{
                            scale: 1.05,
                            transition: { duration: 0.2 }
                          }}
                          whileTap={{
                            scale: 0.95,
                            y: -3,
                            transition: { duration: 0.2, ease: "easeInOut" }
                          }}
                          className="text-yellow-300 text-xl"
                        >
                          <FaChevronDown />
                        </motion.button>
                      </motion.div>
                    )}
    
                    {isfollowUp && (
                      <motion.div
                        ref={scrollRef}
                        className='w-full h-full max-h-[260px] mt-12 relative rounded-lg overflow-auto'
                        initial={{ opacity: 0, y: -100, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: "auto" }}
                        transition={{ duration: 0.5 }}
                        exit={{ opacity: 0, y: -100, height: 0 }}
                      >
                        {conversation.map((message, index) => {
                          if (index === 0 || index === 1) return null;
                          
                          if (message.role === "user") {
                            const displayText = message.parts[0].text.replace(/\n \(Strict api rules to adhere to: Only answer if this question is related to the code initially provided in the first message, if no code or a random non code related statement was provided than deny to answer...\)$/, '');
                            return (
                              <motion.div 
                                key={index} 
                                className='mb-3 ml-auto max-w-[85%] rounded-lg overflow-hidden'
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                <div className='p-2.5 bg-yellow-500/20 border border-yellow-500/40 rounded-lg text-yellow-100 text-xs'>
                                  {displayText}
                                </div>
                              </motion.div>
                            );
                          } else if (message.role === "model") {
                            return (
                              <motion.div 
                                key={index} 
                                className='mb-3 mr-auto max-w-[85%] rounded-lg overflow-hidden'
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.1 }}
                              >
                                <div className='p-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-xs'>
                                  {message.parts[0].text.split('\n').map((line, lineIdx) => {
                                    if (line.startsWith('**') && line.endsWith('**')) {
                                      const headerText = line.substring(2, line.length - 2);
                                      return (
                                        <div key={lineIdx} className='mb-2 mt-1'>
                                          <span className='font-bold text-yellow-200'>{headerText}</span>
                                        </div>
                                      );
                                    }
                                    else if (line.startsWith('**') && line.substring(2).trim().includes('**')) {
                                      const headerText = line.substring(2, line.lastIndexOf('**'));
                                      return (
                                        <div key={lineIdx} className='mb-2 mt-1'>
                                          <span className='font-bold text-yellow-200'>{headerText}</span>
                                        </div>
                                      );
                                    }
                                    else if (line.startsWith('** ')) {
                                      return (
                                        <div key={lineIdx} className='mb-2 mt-1'>
                                          <span className='font-bold text-yellow-200'>{line.substring(3)}</span>
                                        </div>
                                      );
                                    }
                                    else if (line.startsWith('• ') || line.startsWith('* ') || line.startsWith('- ')) {
                                      const bulletText = line.substring(2);
                                      return (
                                        <div key={lineIdx} className='mb-1.5 flex'>
                                          <span className='mr-1.5 text-yellow-300'>•</span>
                                          <span>{bulletText}</span>
                                        </div>
                                      );
                                    }
                                    else if (line.includes('`')) {
                                      const segments = line.split('`');
                                      return (
                                        <div key={lineIdx} className='mb-1.5'>
                                          {segments.map((segment, segIdx) => (
                                            segIdx % 2 === 0 ? 
                                              <span key={segIdx}>{segment}</span> : 
                                              <code key={segIdx} className='bg-black/50 px-1 py-0.5 rounded font-mono text-green-300'>{segment}</code>
                                          ))}
                                        </div>
                                      );
                                    }
                                    else {
                                      return <div key={lineIdx} className='mb-1.5'>{line}</div>;
                                    }
                                  })}
                                </div>
                              </motion.div>
                            );
                          }
                          return null;
                        })}
                      </motion.div>
                    )}
                    
                    <div className="absolute w-full bottom-0 p-2">
                      <input
                        type="text"
                        value={followUp}
                        placeholder="Ask your follow up question here..."
                        onChange={(e) => setFollowUp(e.target.value)}
                        className={`w-full px-3 py-2 rounded-md ${followUp ? "text-white" : "text-white/20"} bg-black border focus:outline-none focus:border-amber-200 border-yellow-400 pr-10`}
                      />
                      <motion.button
                        whileHover={{
                          scale: 1.05,
                          rotate: 90,
                          transition: { duration: 0.2 }
                        }}
                        whileTap={{
                          scale: 0.95,
                          x: 3,
                          transition: { duration: 0.2, ease: "easeInOut" }
                        }}
                        onClick={() => {
                          setIsFollowUp(true);
                          askFollowUp();
                        }} 
                        disabled={isLoadingResponse || !followUp.trim()}
                        className={`text-2xl absolute right-3 top-1/2 transform -translate-y-1/2 ${isLoadingResponse ? 'cursor-not-allowed text-amber-500/50' : 'cursor-pointer text-yellow-300'}`}
                      >
                        {isLoadingResponse ? (
                          <GiNorthStarShuriken className='animate-spin' />
                        ) : (
                          <FaCircleArrowUp />
                        )}
                      </motion.button>
                    </div>
                    
                    {/* New chat button */}
                    {activeConversationId && (
                      <motion.button
                        onClick={resetChat}
                        className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-300 border border-yellow-500/30"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        New Chat +
                      </motion.button>
                    )}
                  </>
                )}
              </div>
            ) : (
              <>
                <motion.h1 
                  className='text-yellow-300 text-xl font-bold text-center'
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  Here we go!
                </motion.h1>
                
                <motion.div 
                  className='w-full p-3 bg-black/40 border border-yellow-500/30 rounded-lg text-gray-500 font-mono text-sm'
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  {displayedText}
                  {isTyping && (
                    <motion.span 
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                      className="text-yellow-400 font-bold"
                    >
                      |
                    </motion.span>
                  )}
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  className="flex items-center gap-2 text-yellow-300 text-sm mt-3"
                >
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full"
                  />
                  Analyzing your snippet...
                </motion.div>
              </>
            )}
          </div>
        ) : (
          <>
            {isManualInput ? (
              <motion.div 
                className='flex flex-col p-4 w-full h-full bg-black border border-yellow-300/50 rounded-lg overflow-hidden relative'
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <motion.h2 
                  className='text-yellow-300 text-lg font-bold mb-3 text-center'
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  Paste your code snippet
                </motion.h2>
                
                <textarea 
                  value={manualInputText}
                  onChange={(e) => setManualInputText(e.target.value)}
                  placeholder="Paste your code here..."
                  className='w-full h-[180px] p-3 bg-black/40 border border-yellow-500/30 rounded-lg text-yellow-100 font-mono text-sm resize-none focus:outline-none focus:border-yellow-400'
                />
                
                <div className='mt-3 flex justify-between gap-2'>
                  <motion.button
                    onClick={() => setIsManualInput(false)}
                    className='px-3 py-1.5 text-sm rounded-md font-semibold bg-black border border-yellow-400/50 text-yellow-300'
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Back
                  </motion.button>
                  
                  <motion.button
                    onClick={handleManualInputSubmit}
                    disabled={!manualInputText.trim()}
                    className={`px-4 py-1.5 text-sm rounded-md font-semibold flex items-center gap-1
                      ${manualInputText.trim() 
                        ? 'bg-gradient-to-r from-yellow-400 to-red-400 text-white border-2 border-red-500' 
                        : 'bg-gray-700/50 text-gray-400 border-2 border-gray-600 cursor-not-allowed'}`}
                    whileHover={{ 
                      scale: manualInputText.trim() ? 1.05 : 1,
                      y: manualInputText.trim() ? -2 : 0
                    }}
                    whileTap={{ 
                      scale: manualInputText.trim() ? 0.95 : 1,
                      rotate: manualInputText.trim() ? -1 : 0
                    }}
                  >
                    Analyze <FaArrowRight className="ml-1" />
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <>
                <motion.div 
                  className='flex flex-col p-4 h-[200px] w-full bg-black border border-yellow-300/50 rounded-lg overflow-hidden relative'
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <div 
                    className="absolute inset-0 z-10 opacity-10 pointer-events-none"
                    style={{
                      backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
                      backgroundSize: 'cover'
                    }}
                  />
                  
                  <div className="absolute left-0 top-0 h-full w-8 bg-black/70 flex flex-col items-end pr-2 text-yellow-500/50 pt-4 z-20">
                    <div>1</div>
                    <div>2</div>
                    <div>3</div>
                  </div>
                  
                  <div className="absolute top-0 left-0 w-full h-7 bg-black/80 flex items-center px-10 border-b border-yellow-700/30 z-20">
                    <div className="bg-black px-3 py-1 text-xs text-yellow-300/80 border-t border-red-500/70">snippet.js</div>
                  </div>
                  
                  <div className="pl-10 pt-8 z-20 relative">
                    <motion.p 
                      initial={{ filter: "blur(3px)", opacity: 0.5 }}
                      animate={{ filter: "blur(0px)", opacity: 1 }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                      className="text-xl font-mono text-white"
                    >
                      <span className="text-red-400">function</span> <span className="text-yellow-300">decodeSnippet</span><span className="text-white">(</span><span className="text-red-300">code</span><span className="text-white">) {`{`}</span>
                    </motion.p>
                    <motion.p 
                      initial={{ filter: "blur(3px)", opacity: 0.5 }}
                      animate={{ filter: "blur(0px)", opacity: 1 }}
                      transition={{ duration: 0.6, ease: "easeInOut", delay: 0.2 }}
                      className="text-xl font-mono text-white pl-6"
                    >
                      <span className="text-yellow-500">return</span> <span className="text-red-300">"Simplified explanation"</span>;
                    </motion.p>
                    <motion.p 
                      initial={{ filter: "blur(1px)", opacity: 0.5 }}
                      animate={{ filter: "blur(0px)", opacity: 1 }}
                      transition={{ duration: 0.6, ease: "easeInOut", delay: 0.4 }}
                      className="text-xl font-mono text-white"
                    >
                      <span className="text-white">{`}`}</span>
                    </motion.p>
                  </div>
                </motion.div>
                
                <div className="mt-6 flex flex-col items-center justify-center gap-2">
                  <motion.p 
                    initial={{ filter: "blur(3px)", opacity: 0.5 }}
                    animate={{ filter: "blur(0px)", opacity: 1 }}
                    transition={{ duration: 0.3, ease: "easeInOut", delay: 0.6 }}
                    className="text-white text-center mb-2 font-semibold"
                  >
                    How would you like to proceed?
                  </motion.p>
                  
                  <div className="flex flex-col gap-3">
                    <motion.button
                      onClick={handleButtonClick}
                      className="px-4 py-1.5 justify-center gap-2 flex text-sm rounded-md font-semibold bg-gradient-to-r 
                        from-yellow-400 to-red-400 text-white
                        border-2 border-red-500 items-center"
                      initial={{ filter: "blur(3px)", opacity: 0.5 }}
                      animate={{ filter: "blur(0px)", opacity: 1 }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95, rotate: -1 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 20,
                        filter: { duration: 0.3, ease: "easeInOut", delay: 0.6 },
                        opacity: { duration: 0.6, ease: "easeInOut", delay: 0.7 }
                      }}
                    >
                      <LuTextCursorInput className='text-3xl text-white'/> Use Selection
                    </motion.button>
                    
                    <motion.button
                      onClick={() => setIsManualInput(true)}
                      className="px-4 py-1.5 justify-center text-sm rounded-md font-semibold
                        bg-white/5 border-1 border-yellow-400 text-yellow-300
                        flex items-center gap-1"
                      initial={{ filter: "blur(3px)", opacity: 0.5 }}
                      animate={{ filter: "blur(0px)", opacity: 1 }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95, rotate: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 20,
                        filter: { duration: 0.3, ease: "easeInOut", delay: 0.6 },
                        opacity: { duration: 0.6, ease: "easeInOut", delay: 0.8 }
                      }}
                    >
                      <FaKeyboard className="mr-1 text-3xl" /> Manual Input {"(Preferred for interfaces like LeetCode)"}
                    </motion.button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;