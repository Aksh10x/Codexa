import { createContext, useContext, useState, useEffect } from 'react';
import { 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  fetchSignInMethodsForEmail,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from "./googleAuth/main.js";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext); //creating custom useAuth hook
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
      console.log("Auth state changed:", user ? 
        `User: ${user.email} (Verified: ${user.emailVerified})` : "No user");
    });

    return unsubscribe;
  }, []);

  async function checkEmailExists(email) {
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      return methods.length > 0;
    } catch (error) {
      console.error("Error checking email:", error);
      return false;
    }
  }


  async function signUpWithEmail(email, password, displayName) {
    try {
      setAuthError(null);
      
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters long");
      }
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      await sendEmailVerification(userCredential.user);
      
      if (displayName.trim() !== "") {
        await updateProfile(userCredential.user, {
          displayName: displayName
        });
      }
      
      return userCredential;
    } catch (error) {
      console.error("Error signing up:", error);
      setAuthError(error.message);
      throw error;
    }
  }

  // Sign in with email and password
  async function signInWithEmail(email, password) {
    try {
      setAuthError(null);
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Error signing in:", error);
      setAuthError(error.message);
      throw error;
    }
  }

  // Send password reset email
  async function resetPassword(email) {
    try {
      setAuthError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Error resetting password:", error);
      setAuthError(error.message);
      throw error;
    }
  }

  // Resend verification email
  async function resendVerificationEmail() {
    try {
      setAuthError(null);
      if (currentUser && !currentUser.emailVerified) {
        await sendEmailVerification(currentUser);
      }
    } catch (error) {
      console.error("Error sending verification email:", error);
      setAuthError(error.message);
      throw error;
    }
  }

  async function logOut() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  }

  const value = {
    currentUser,
    authError,
    signUpWithEmail,
    signInWithEmail,
    checkEmailExists,
    resetPassword,
    resendVerificationEmail,
    logOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}