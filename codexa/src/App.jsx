import { useEffect, useState, useRef } from 'react'
import { motion } from 'motion/react'
import fetchGeminiResponse from './howItWorks';

function App() {
  const [isSelected, setIsSelected] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const typingRef = useRef(null);
  const [geminiResponse, setGeminiResponse] = useState("");
  const [geminiError, setGeminiError] = useState("");

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

  useEffect(() => {
    if(!isSelected) return;
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
      console.log(selectedText)
      const response = await fetchGeminiResponse(selectedText);
      console.log("Gemini API Response:", response);
      if (response.error) {
        setGeminiError(response.error.message);
        return;
      }
      else{
        setTimeout(() => {
          setGeminiResponse(response.candidates[0].content.parts[0].text);
        },800);
      }
    };
    fetchResponse();
  },[selectedText])

  return (
    <div className='flex w-screen h-screen bg-black items-center justify-center'>
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
                  <motion.div 
                    className='w-full h-full p-4 max-h-[250px] bg-black/40 border border-yellow-500/30 rounded-lg overflow-auto'
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className='text-yellow-300 whitespace-pre-line'>
                      {geminiResponse.split('\n').map((line, index) => {
                        // Handle bold headings marked with ** (both at start of line and inline)
                        if (line.startsWith('**') && line.substring(2).trim().includes('**')) {
                          // This detects section headers like "**Purpose**"
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
                        // Regular text
                        else {
                          return <div key={index} className='mb-2'>{line}</div>;
                        }
                      })}
                    </div>
                  </motion.div>
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
                initial={{filter: "blur(3px)", opacity:0.5}}
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
          
        
          <div className="mt-12 flex flex-col items-center justify-center gap-2">
            <motion.p 
              initial={{filter: "blur(3px)", opacity:0.5}}
              animate={{filter: "blur(0px)", opacity:1}}
              transition={{
                duration: 0.6,
                ease: "easeInOut",
                delay: 0.6
              }}
              className="text-white text-center mb-2 font-semibold"
            >
              Have you selected your snippet?
            </motion.p>
            <motion.button
              onClick={handleButtonClick}
              className={`px-4 py-1.5 text-sm rounded-md font-semibold bg-gradient-to-r 
                from-yellow-400 to-red-400 text-white
               border-2 border-red-500`}
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
                  duration: 0.6,
                  ease: "easeInOut",
                  delay: 0.7
                },
                opacity: {
                  duration: 0.6,
                  ease: "easeInOut",
                  delay: 0.7
                }
              }}
            >
              Yes, I have!
            </motion.button>
          </div>
            </>
          )
        }
      </div>
    </div>
  )
}

export default App