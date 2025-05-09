import { useEffect, useState } from 'react'
import { motion } from 'motion/react'

function App() {
  const [isSelected, setIsSelected] = useState(false);
  
  const onOpen = async () => {
    let [tab] = await chrome.tabs.query({active: true})
    chrome.scripting.executeScript({
      target: {tabId: tab.id},
      func: () => {
        const element = document.createElement('div')
        element.innerText = 'hello'
        element.style.position = 'fixed'
        element.style.top = '0'
        element.style.left = '0'
        element.style.zIndex = '9999'
        document.body.appendChild(element)
      }
    })
  }

  useEffect(() => {
    onOpen()
  },[])

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
          
          {/* Line numbers like in VS Code */}
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
            onClick={() => setIsSelected(!isSelected)}
            className={`px-4 py-1.5 text-sm rounded-md font-semibold bg-gradient-to-r ${
              isSelected 
                ? 'from-yellow-600 to-red-500 text-yellow-400' 
                : 'from-yellow-400 to-red-400 text-white'
            } border-2 ${isSelected ? 'border-red-600' : 'border-red-500'}`}
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
            {isSelected ? "Selected ✓" : "Yes, I have!"}
          </motion.button>
        </div>
        
        {isSelected && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-3 text-center text-yellow-400 text-sm"
          >
            Ready to decode! Analyzing your snippet...
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default App