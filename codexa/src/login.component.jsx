import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { FaEnvelope, FaLock, FaUserPlus, FaSignInAlt, FaArrowLeft, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import { useAuth } from './AuthContext.jsx';

function LoginPage() {
  const { signInWithEmail, signUpWithEmail, checkEmailExists, resetPassword, resendVerificationEmail, currentUser, authError, logOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [emailExists, setEmailExists] = useState(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  // Handle email form submission
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError("Please enter an email address");
      return;
    }
    
    if (!password) {
      setError("Please enter a password");
      return;
    }
    
    if (isSignUp && password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }
    
    if (isSignUp && password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    
    try {
      setIsLoading(true);
      setError("");
      
      if (isSignUp) {
        await signUpWithEmail(email, password, displayName);
        setVerificationSent(true);
      } else {
        const userCredential = await signInWithEmail(email, password);
        
        // Check if user's email is verified
        if (userCredential.user && !userCredential.user.emailVerified) {
          setNeedsVerification(true);
        }
      }
    } catch (error) {
      console.error("Authentication failed:", error);
      let errorMessage = "Authentication failed. Please try again.";
      
      // User-friendly error messages
      if (error.code === 'auth/user-not-found') {
        errorMessage = "No account exists with this email. Please sign up.";
        setIsSignUp(true);
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Incorrect password. Please try again.";
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email is already registered. Please sign in.";
        setIsSignUp(false);
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password should be at least 8 characters.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many unsuccessful login attempts. Please try again later.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password reset
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError("Please enter your email address");
      return;
    }
    
    try {
      setIsLoading(true);
      setError("");
      
      await resetPassword(email);
      setResetSent(true);
    } catch (error) {
      console.error("Password reset failed:", error);
      
      if (error.code === 'auth/user-not-found') {
        setError("No account exists with this email.");
      } else {
        setError("Failed to send reset email. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend verification email
  const handleResendVerification = async () => {
    try {
      setIsLoading(true);
      setError("");
      
      await resendVerificationEmail();
      setVerificationSent(true);
    } catch (error) {
      console.error("Failed to resend verification:", error);
      setError("Failed to send verification email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };


  const handleEmailBlur = async () => {
    if (email && email.includes('@') && email.includes('.')) {
      try {
        setIsCheckingEmail(true);
        const exists = await checkEmailExists(email);
        setEmailExists(exists);
        
        // switch to sign in if email exists and user is trying to sign up
        if (isSignUp && exists) {
          setIsSignUp(false);
        }
      } catch (error) {
        console.error("Error checking email:", error);
      } finally {
        setIsCheckingEmail(false);
      }
    }
  };


  useEffect(() => {
    if (authError) {
      setError(authError);
      setIsLoading(false);
    }
  }, [authError]);

  // email verification check
  useEffect(() => {
    if (currentUser && !currentUser.emailVerified) {
      setNeedsVerification(true);
    } else {
      setNeedsVerification(false);
    }
  }, [currentUser]);


  if (needsVerification && currentUser) {
    return (
      <div className='flex w-screen h-screen bg-black items-center justify-center relative'>
        <div className='max-w-[350px] max-h-[450px] overflow-y-auto h-full w-full bg-white/5 flex flex-col p-4'>
          <div className='flex flex-col items-center w-full justify-center p-2 mb-4'>
            <motion.h1
              initial={{opacity:0, y:-20}}
              animate={{opacity:1, y:0}}
              className='font-bold text-2xl text-white'
            >
              Codexa
              <motion.div className='w-full h-1 bg-gradient-to-r from-yellow-300 to-red-500 rounded-full'
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.9, ease: 'easeInOut' }}
              ></motion.div>
            </motion.h1>
          </div>
          
          <div className='flex-1 flex flex-col items-center justify-center p-4'>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 mb-6 rounded-full bg-yellow-500/20 flex items-center justify-center"
            >
              <FaExclamationTriangle className="text-yellow-400 text-3xl" />
            </motion.div>
            
            <h2 className="text-white text-xl font-bold mb-2 text-center">
              Verify Your Email
            </h2>
            
            <p className="text-gray-300 text-center mb-6">
              Please check your inbox and verify your email address to continue.
            </p>
            
            {verificationSent ? (
              <div className="text-green-400 text-sm mb-4 flex items-center gap-2">
                <FaCheck className="text-green-400" />
                Verification email sent successfully!
              </div>
            ) : error ? (
              <div className="text-red-400 text-sm mb-4">
                {error}
              </div>
            ) : null}
            
            <motion.button
              onClick={handleResendVerification}
              disabled={isLoading || verificationSent}
              className={`px-5 py-2 rounded-md font-medium
                ${isLoading ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed' : 
                verificationSent ? 'bg-green-800/40 text-green-300' : 
                'bg-yellow-500/30 text-yellow-300 hover:bg-yellow-500/50'}`}
              whileHover={{ scale: isLoading || verificationSent ? 1 : 1.03 }}
              whileTap={{ scale: isLoading || verificationSent ? 1 : 0.98 }}
            >
              {isLoading ? (
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
              ) : verificationSent ? (
                "Email Sent"
              ) : (
                "Resend Verification Email"
              )}
            </motion.button>
            
            <button
              onClick={async () => {
                try {
                  await logOut();
                  setNeedsVerification(false);
                } catch (error) {
                  console.error("Error signing out:", error);
                }
              }}
              className="mt-4 text-gray-400 text-sm hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='flex w-screen h-screen bg-black items-center justify-center relative'>
      <div className='max-w-[350px] max-h-[450px] overflow-y-auto h-full w-full bg-white/5 flex flex-col p-4'>
        <div className='flex flex-col items-center w-full justify-center p-2 mb-4'>
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
        
        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex-1 flex flex-col items-center justify-center"
        >
          {showResetPassword ? (
            // Password Reset Form
            <div className="w-full px-4">
              <div className="flex items-center mb-4">
                <motion.button
                  onClick={() => {
                    setShowResetPassword(false);
                    setResetSent(false);
                    setError("");
                  }}
                  className="text-yellow-400 hover:text-yellow-300"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <FaArrowLeft />
                </motion.button>
                <h2 className="text-white text-lg font-semibold ml-2">Reset Password</h2>
              </div>
              
              {resetSent ? (
                <div className="text-center py-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="mx-auto mb-4 bg-green-500/20 rounded-full w-16 h-16 flex items-center justify-center text-green-400 text-2xl"
                  >
                    <FaCheck />
                  </motion.div>
                  <h3 className="text-white text-lg font-semibold mb-2">Email Sent!</h3>
                  <p className="text-gray-300 mb-4">
                    Check your inbox for instructions to reset your password.
                  </p>
                  <motion.button
                    onClick={() => {
                      setShowResetPassword(false);
                      setResetSent(false);
                    }}
                    className="px-6 py-2 text-sm rounded-md font-medium
                      bg-yellow-500/30 text-yellow-300 hover:bg-yellow-500/50"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Back to Sign In
                  </motion.button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
                  <p className="text-gray-300 text-sm mb-2">
                    Enter your email address and we'll send you instructions to reset your password.
                  </p>
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-black/50 border border-yellow-500/30 rounded-md
                        text-white focus:outline-none focus:border-yellow-400"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  
                  {error && (
                    <p className="text-red-400 text-sm">{error}</p>
                  )}
                  
                  <motion.button
                    type="submit"
                    disabled={isLoading || !email}
                    className={`px-4 py-2 rounded-md font-medium flex justify-center items-center
                      ${isLoading || !email
                        ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-yellow-400 to-red-500 text-white'}`}
                    whileHover={{ scale: isLoading || !email ? 1 : 1.03 }}
                    whileTap={{ scale: isLoading || !email ? 1 : 0.98 }}
                  >
                    {isLoading ? (
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      "Send Reset Link"
                    )}
                  </motion.button>
                </form>
              )}
            </div>
          ) : (
            // Email/Password Form
            <div className="w-full px-4">
              <div className="mb-6">
                <h2 className="text-white text-xl font-semibold text-center mb-1">
                  {isSignUp ? "Create Account" : "Welcome Back"}
                </h2>
                <p className="text-gray-300 text-sm text-center">
                  {isSignUp ? "Join Codexa to save your analyses" : "Sign in to continue using Codexa"}
                </p>
              </div>
              
              <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="flex items-center justify-between text-gray-400 text-sm mb-1">
                    Email
                    {isCheckingEmail && (
                      <span className="text-yellow-500 text-xs">Checking...</span>
                    )}
                    {emailExists !== null && !isCheckingEmail && (
                      <span className={emailExists ? "text-green-500 text-xs" : "text-blue-400 text-xs"}>
                        {emailExists ? "Account exists" : "New account"}
                      </span>
                    )}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={handleEmailBlur}
                    className="w-full px-3 py-2 bg-black/50 border border-yellow-500/30 rounded-md
                      text-white focus:outline-none focus:border-yellow-400"
                    placeholder="your@email.com"
                    required
                  />
                </div>
                
                {isSignUp && (
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Display Name (Optional)</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-3 py-2 bg-black/50 border border-yellow-500/30 rounded-md
                        text-white focus:outline-none focus:border-yellow-400"
                      placeholder="How should we call you?"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-gray-400 text-sm mb-1">
                    Password {isSignUp && <span className="text-gray-500">(min. 8 characters)</span>}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-black/50 border border-yellow-500/30 rounded-md
                      text-white focus:outline-none focus:border-yellow-400"
                    placeholder={isSignUp ? "Create password" : "Enter your password"}
                    required
                    minLength={isSignUp ? 8 : undefined}
                  />
                </div>
                
                {isSignUp && (
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full px-3 py-2 bg-black/50 border rounded-md
                        text-white focus:outline-none focus:border-yellow-400
                        ${confirmPassword && (confirmPassword !== password) 
                          ? "border-red-500/50" 
                          : confirmPassword 
                            ? "border-green-500/50" 
                            : "border-yellow-500/30"}`}
                      placeholder="Confirm your password"
                      required
                    />
                    {confirmPassword && confirmPassword !== password && (
                      <p className="text-red-400 text-xs mt-1">
                        Passwords don't match
                      </p>
                    )}
                  </div>
                )}
                
                {error && (
                  <p className="text-red-400 text-sm">{error}</p>
                )}
                
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(true)}
                    className="text-yellow-400 text-xs text-right hover:underline self-end"
                  >
                    Forgot password?
                  </button>
                )}
                
                <motion.button
                  type="submit"
                  disabled={isLoading || !email || !password || (isSignUp && (password !== confirmPassword || password.length < 8))}
                  className={`px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2
                    ${isLoading || !email || !password || (isSignUp && (password !== confirmPassword || password.length < 8))
                      ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-yellow-400 to-red-500 text-white'}`}
                  whileHover={{ scale: isLoading || !email || !password || (isSignUp && password !== confirmPassword) ? 1 : 1.03 }}
                  whileTap={{ scale: isLoading || !email || !password || (isSignUp && password !== confirmPassword) ? 1 : 0.98 }}
                >
                  {isLoading ? (
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                  ) : isSignUp ? (
                    <>
                      <FaUserPlus /> Create Account
                    </>
                  ) : (
                    <>
                      <FaSignInAlt /> Sign In
                    </>
                  )}
                </motion.button>
                
                <p className="text-center text-gray-400 text-sm mt-2">
                  {isSignUp ? "Already have an account?" : "Don't have an account?"}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError("");
                      setConfirmPassword("");
                    }}
                    className="ml-1 text-yellow-400 hover:underline"
                  >
                    {isSignUp ? "Sign In" : "Sign Up"}
                  </button>
                </p>
              </form>
            </div>
          )}
        </motion.div>
        
        {/* Footer */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 1 }}
          className="text-white/50 text-xs text-center mt-4"
        >
          {isSignUp ? "Sign up to save your code analysis history" : "Sign in to access your saved analyses"}
        </motion.p>
      </div>
    </div>
  );
}

export default LoginPage;