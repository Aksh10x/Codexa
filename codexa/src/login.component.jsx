import { useState } from 'react';
import { motion } from 'motion/react';
import { FaGoogle } from 'react-icons/fa6';
import { useAuth } from './AuthContext.jsx';

function LoginPage() {
  const { signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      setError("");
      await signInWithGoogle();
      // Authentication is handled by the AuthContext
    } catch (error) {
      console.error("Login failed:", error);
      setError("Failed to sign in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='flex w-screen h-screen bg-black items-center justify-center relative'>
      <div className='max-w-[350px] max-h-[450px] h-full w-full bg-white/5 flex flex-col p-4'>
        {/* Header */}
        <div className='flex flex-col items-center w-full justify-center p-2 mb-8'>
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
        
        {/* Welcome Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex-1 flex flex-col items-center justify-center"
        >
          <div className='p-4 flex flex-col items-center'>
            <motion.div 
              className='w-16 h-16 mb-6 relative'
              animate={{ 
                rotate: [-15, 15],
                borderRadius: ["25%", "50%"]
              }}
              transition={{ 
                duration: 2.5, 
                ease: "easeInOut", 
                repeat: Infinity,
                repeatType: "reverse"
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-300 via-amber-500 to-red-500 rounded-lg"></div>
              <div className="absolute inset-[3px] bg-black rounded-lg flex items-center justify-center">
                <span className="text-yellow-300 text-2xl font-mono font-bold">{`</>`}</span>
              </div>
            </motion.div>
            
            <h2 className="text-white text-xl font-bold mb-2">Welcome to Codexa</h2>
            <p className="text-gray-300 text-center mb-6">
              Your AI-powered code companion for instant code explanations.
            </p>
            
            {error && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-sm mb-4"
              >
                {error}
              </motion.p>
            )}
            
            <motion.button
              onClick={handleSignIn}
              disabled={isLoading}
              className={`px-6 py-3 flex items-center justify-center gap-3 rounded-lg font-medium
                ${isLoading 
                  ? 'bg-white/10 text-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-yellow-400 to-red-500 text-white hover:shadow-lg hover:shadow-yellow-500/30'
                } 
                transition-all w-full`}
              whileHover={{ scale: isLoading ? 1 : 1.03 }}
              whileTap={{ scale: isLoading ? 1 : 0.98 }}
            >
              {isLoading ? (
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                <>
                  <FaGoogle /> Sign in with Google
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
        
        {/* Footer */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 1 }}
          className="text-white/50 text-xs text-center mt-4"
        >
          Sign in to save your code analysis history
        </motion.p>
      </div>
    </div>
  );
}

export default LoginPage;