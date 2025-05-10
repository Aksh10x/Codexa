import { useEffect, useState, useRef } from 'react'
import { motion } from 'motion/react'
import fetchGeminiResponse from './howItWorks';
import { FaChevronDown, FaChevronUp, FaCircleArrowUp, FaKeyboard, FaArrowRight } from 'react-icons/fa6';
import fetchFollowUpResponse from './followUpQuestions';
import { GiNorthStarShuriken } from 'react-icons/gi';

function App() {
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

  const scrollToBottom = () => {
    if(scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }

  const getSelectedText = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab?.id },
      func: () => {
        return window.getSelection()?.toString();
      },
    });

    const text = results[0]?.result || "No text selected";
    setSelectedText(text);
    
    setIsTyping(true);
    startTypingAnimation(text);
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
    setTimeout(() => {
      setIsSelected(true);
    }, 400); 
  };

  const handleManualInputSubmit = () => {
    if (manualInputText.trim()) {
      setSelectedText(manualInputText);
      setIsSelected(true);
      setIsTyping(true);
      startTypingAnimation(manualInputText);
    }
  };

  useEffect(() => {
    if(!isSelected || isManualInput) return;
    getSelectedText();
  },[isSelected]);

  useEffect(() => {
    return () => {
      if (typingRef.current) clearInterval(typingRef.current);
    };
  },[]);

  useEffect(() => {
    if(!isSelected) return;
    const fetchResponse = async () => {
    setIsLoadingResponse(true);
    console.log(selectedText);
    const response = await fetchGeminiResponse("Explain what the following code does in simple terms.\nMake sure to:\n- Break it down step by step\n- Use bullet points where needed\n- Format code snippets using backticks\n- Keep it concise but thorough\n Do not explain extremely obvious things and try to keep it short and sweet \n I need to display this on my web app so for bold headings use two bullet points (**)\n\nHere is the code(if this is not code then tell me tthat you will not provide an answer):\n"+selectedText);
    console.log("Gemini API Response:", response);
    setIsLoadingResponse(false);
    
    if (response.error) {
      setGeminiError(response.error.message);
      return;
    }
      else {
        setConversation([
          ...conversation,
          {
            role: "user",
            parts: [{ text: selectedText }],
          },
          { 
            role: "model", 
            parts: [{ text: response.candidates[0].content.parts[0].text }] 
          }
        ]);
        
        setTimeout(() => {
          setGeminiResponse(response.candidates[0].content.parts[0].text);
        }, 800);
      }
    };
    fetchResponse();
  },[selectedText])

  const askFollowUp = async () => {
    if (!followUp.trim()) return;
    
    setIsLoadingResponse(true);
    const updatedConversation = [
      ...conversation,
      {
        role: "user",
        parts: [{ text: followUp + "\n (Strict api rules to adhere to: Only answer if this question is related to the code initially provided in the first message, if no code or a random non code related statement was provided than deny to answer...)" }],
      }
    ];

    setConversation(updatedConversation);
    scrollToBottom();

    const response = await fetchFollowUpResponse(updatedConversation);
    setIsLoadingResponse(false);
    
    if (response.error) {
      setGeminiError(response.error.message);
      return;
    }
    else {
      setConversation([
        ...updatedConversation,
        { 
          role: "model", 
          parts: [{ text: response.candidates[0].content.parts[0].text }] 
        }
      ]);
      scrollToBottom();
    }
  }

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  useEffect(() => {
    if (isfollowUp) {
      scrollToBottom();
    }
  }, [isfollowUp]);

  return (
    <div className='flex w-screen h-screen bg-black items-center justify-center relative'>
      <div className='max-w-[350px] max-h-[450px] h-full w-full bg-white/5 flex flex-col p-4'>
        <div className='flex flex-col items-center w-full justify-center p-2'>
          <motion.h1
          initial={{opacity:0, y:-100}}
          animate={{opacity:1, y:0}}
          transition={{ 
            type: "spring",
            duration: 0.9, 
            stiffness: 100,
            damping: 15,
            }}
          className='font-bold text-2xl text-white'>Codexa
            <motion.div className='w-full h-1 bg-gradient-to-r from-yellow-300 to-red-500 rounded-full'
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 0.9, ease: 'easeInOut', delay: 0.5 }}
            ></motion.div>
          </motion.h1>
          
        </div>
        
        {
          isSelected ? (
            <div className='flex flex-col items-center justify-center w-full h-full gap-3'>
              {
                geminiResponse ? 
                
                  (
                  <div className='flex flex-col items-center justify-center w-full h-full gap-3'>
                  {
                    !isfollowUp ? (
                  <motion.div 
                    className='w-full h-full p-4 max-h-[250px] relative bg-black/40 border border-yellow-500/30 rounded-lg overflow-auto'
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1 , height: "auto"}}
                    transition={{ duration: 0.5 }}
                    exit={{ opacity: 0, height: 0 }}
                    
                  >
                    <motion.button 
                      className={`absolute top-2 right-2 text-xl text-yellow-300 cursor-pointer`}
                      whileHover={{
                        scale:  1.05,
                        transition: { duration: 0.2 }
                      }}
                      whileTap={{
                        scale: 0.95,
                        y: -3,
                        transition: { duration: 0.2, ease: "easeInOut" }
                      }}
                      onClick={() => {
                        setIsFollowUp(true);
                      }}
                    >
                      <FaChevronUp/>
                    </motion.button>
                    <div className='text-yellow-300 whitespace-pre-line'>
                      {geminiResponse.split('\n').map((line, index) => {
                        // Handle bold headings marked with ** (both at start of line and inline)
                        if (line.startsWith('**') && line.endsWith('**')) {
                          // This detects section headers like "**Purpose**"
                          const headerText = line.substring(2, line.length - 2);
                          return (
                            <div key={index} className='mb-3 mt-2'>
                              <h2 className='font-bold text-lg'>{headerText}</h2>
                            </div>
                          );
                        }
                        else if (line.startsWith('**') && line.substring(2).trim().includes('**')) {
                          // This detects inline bold text
                          const headerText = line.substring(2, line.lastIndexOf('**'));
                          return (
                            <div key={index} className='mb-3 mt-2'>
                              <h2 className='font-bold text-lg'>{headerText}</h2>
                            </div>
                          );
                        }
                        // Handle section headers with ** prefix
                        else if (line.startsWith('** ')) {
                          return (
                            <div key={index} className='mb-3 mt-2'>
                              <h2 className='font-bold text-lg'>{line.substring(3)}</h2>
                            </div>
                          );
                        }
                        // Handle bullet points (• or * or -)
                        else if (line.startsWith('• ') || line.startsWith('* ') || line.startsWith('- ')) {
                          const bulletText = line.substring(2); // Remove the bullet prefix and space
                          return (
                            <div key={index} className='mb-2 flex'>
                              <span className='mr-2'>•</span>
                              <span>{bulletText}</span>
                            </div>
                          );
                        }
                        // Handle code snippets in backticks
                        else if (line.includes('`')) {
                          // Split the line by backticks
                          const segments = line.split('`');
                          
                          return (
                            <div key={index} className='mb-2'>
                              {segments.map((segment, segIdx) => (
                                segIdx % 2 === 0 ? 
                                  // Regular text
                                  <span key={segIdx}>{segment}</span> : 
                                  // Code snippet (odd indices contain code)
                                  <code key={segIdx} className='bg-black/50 px-1 py-0.5 rounded font-mono text-green-300'>{segment}</code>
                              ))}
                            </div>
                          );
                        }
                        // Regular text
                        else {
                          return <div key={index} className='mb-2'>{line}</div>;
                        }
                      })}
                    </div>
                  </motion.div>
                    )
                    :
                    (
                      
                      <motion.div
                      className='w-[95%] h-full p-2 absolute top-20 flex justify-between items-center bg-yellow-300/10 rounded-lg overflow-auto'
                      initial={{ opacity: 0, y: -10  }}
                      animate={{ opacity: 1 , y: 0}}
                      transition={{ duration: 0.5 }}
                      exit={{ opacity: 0, y: -10 }}
                      >
                        <p className='text-yellow-300 text-sm'>See the first response</p>
                        <motion.button onClick={() => setIsFollowUp(false)}
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
                      
                    )
                  }

                  {
                    isfollowUp && (
                  <motion.div
                    ref={scrollRef}
                    className='w-full h-full max-h-[230px] relative rounded-lg overflow-auto'
                    initial={{ opacity: 0, y: -100, height: 0 }}
                    animate={{ opacity: 1 , y: 0, height: "auto"}}
                    transition={{ duration: 0.5 }}
                    exit={{ opacity: 0, y: -100, height: 0 }}
                  >
                    {
                      conversation.map((message, index) => {
                        
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
                        }else if (message.role === "model") {
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
                      })
                    }
                  </motion.div>
                    )
                  }
                  
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
                      setFollowUp("");
                      askFollowUp();
                    }} 
                    disabled={isLoadingResponse || !followUp.trim()}
                    className={` text-2xl absolute right-3 top-1/2 transform -translate-y-1/2 ${isLoadingResponse ? 'cursor-not-allowed text-amber-500/50' : 'cursor-pointer text-yellow-300'}`}>
                      {isLoadingResponse ? (
                        <GiNorthStarShuriken className='animate-spin' />
                      ) : (
                        <FaCircleArrowUp />
                      )}
                    </motion.button>
                  </div>
                  
                  
                  </div>
                )
                
                :
                
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
                        animate={{ 
                          rotate: 360,
                        }}
                        transition={{ 
                          repeat: Infinity, 
                          duration: 1.5,
                          ease: "linear" 
                        }}
                        className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full"
                      />
                      Analyzing your snippet...
                    </motion.div>
                  </>
                
              }
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
                    ></div>
                    
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
                        initial={{filter: "blur(3px)", opacity:0.5}}
                        animate={{filter: "blur(0px)", opacity:1}}
                        transition={{
                          duration: 0.6,
                          ease: "easeInOut",
                        }}
                        className="text-xl font-mono text-white"
                      >
                        <span className="text-red-400">function</span> <span className="text-yellow-300">decodeSnippet</span><span className="text-white">(</span><span className="text-red-300">code</span><span className="text-white">) {`{`}</span>
                      </motion.p>
                      <motion.p 
                        initial={{filter: "blur(3px)", opacity:0.5}}
                        animate={{filter: "blur(0px)", opacity:1}}
                        transition={{
                          duration: 0.6,
                          ease: "easeInOut",
                          delay: 0.2
                        }}
                        className="text-xl font-mono text-white pl-6"
                      >
                        <span className="text-yellow-500">return</span> <span className="text-red-300">"Simplified explanation"</span>;
                      </motion.p>
                      <motion.p 
                        initial={{filter: "blur(1px)", opacity:0.5}}
                        animate={{filter: "blur(0px)", opacity:1}}
                        transition={{
                          duration: 0.6,
                          ease: "easeInOut",
                          delay: 0.4
                        }}
                        className="text-xl font-mono text-white"
                      >
                        <span className="text-white">{`}`}</span>
                      </motion.p>
                    </div>
                  </motion.div>
                  
                  <div className="mt-6 flex flex-col items-center justify-center gap-2">
                    <motion.p 
                      initial={{filter: "blur(3px)", opacity:0.5}}
                      animate={{filter: "blur(0px)", opacity:1}}
                      transition={{
                        duration: 0.3,
                        ease: "easeInOut",
                        delay: 0.6
                      }}
                      className="text-white text-center mb-2 font-semibold"
                    >
                      How would you like to proceed?
                    </motion.p>
                    
                    <div className="flex flex-col gap-3">
                      <motion.button
                        onClick={handleButtonClick}
                        className={`px-4 py-1.5 justify-center text-sm rounded-md font-semibold bg-gradient-to-r 
                          from-yellow-400 to-red-400 text-white
                          border-2 border-red-500 flex items-center gap-1`}
                        initial={{filter: "blur(3px)", opacity:0.5}}
                        animate={{filter: "blur(0px)", opacity:1}}
                        whileHover={{ 
                          scale: 1.05,
                          y: -2
                        }}
                        whileTap={{ 
                          scale: 0.95,
                          rotate: -1 
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 20,
                          filter: {
                            duration: 0.3,
                            ease: "easeInOut",
                            delay: 0.6
                          },
                          opacity: {
                            duration: 0.6,
                            ease: "easeInOut",
                            delay: 0.7
                          }
                        }}
                      >
                        Use Selection
                      </motion.button>
                      
                      <motion.button
                        onClick={() => setIsManualInput(true)}
                        className={`px-4 py-1.5 justify-center text-sm rounded-md font-semibold
                          bg-white/5 border-1 border-yellow-400 text-yellow-300
                          flex items-center gap-1`}
                        initial={{filter: "blur(3px)", opacity:0.5}}
                        animate={{filter: "blur(0px)", opacity:1}}
                        whileHover={{ 
                          scale: 1.05,
                          y: -2
                        }}
                        whileTap={{ 
                          scale: 0.95,
                          rotate: 1 
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 20,
                          filter: {
                            duration: 0.3,
                            ease: "easeInOut",
                            delay: 0.6
                          },
                          opacity: {
                            duration: 0.6,
                            ease: "easeInOut",
                            delay: 0.8
                          }
                        }}
                      >
                        <FaKeyboard className="mr-1" /> Manual Input (Preferred for LeetCode like interfaces)
                      </motion.button>
                    </div>
                  </div>
                </>
              )}
            </>
          )
        }
      </div>
    </div>
  )
}

export default App