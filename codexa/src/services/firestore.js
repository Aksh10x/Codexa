import { 
  conversationsRef, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  orderBy,
  getDocs,
  getDoc,
  db,
  serverTimestamp,
  arrayUnion 
} from "../googleAuth/main.js";

// Function to validate if text is likely code
export const isValidCode = (text) => {
  if (!text || typeof text !== 'string') return false;
  
  // Trim the input
  const trimmedText = text.trim();
  
  // If it's very short, probably not code
  if (trimmedText.length < 10) return false;
  
  // Common code indicators
  const codeIndicators = [
    // Code syntax elements
    '{', '}', '()', '[]', ';', '=>', '->',
    // Keywords from common languages
    'function', 'class', 'return', 'const', 'let', 'var', 
    'if', 'else', 'for', 'while', 'import', 'export',
    'def', 'public', 'private', 'static', 'void',
    // Special characters common in code
    '===', '!==', '==', '!=', '+=', '-=', '*=', '/=',
    // HTML/XML indicators
    '<div', '<span', '<p', '<html', '<body', '</div', '</span',
    '</', '>', '<!'
  ];
  
  // Check if the text contains any code indicators
  const hasCodeIndicator = codeIndicators.some(indicator => 
    trimmedText.includes(indicator)
  );
  
  // Check for indentation patterns common in code
  const hasIndentation = /\n\s{2,}|\n\t/.test(trimmedText);
  
  // Check for code comment patterns
  const hasComments = /\/\/|\/\*|\*\/|#\s/.test(trimmedText);
  
  // If it has any of these characteristics, it's likely code
  return hasCodeIndicator || hasIndentation || hasComments;
};


export const createConversation = async (userId, originalCode, title, initialResponse) => {
  try {
    if (!isValidCode(originalCode)) {
      console.log("Not creating conversation - input doesn't appear to be code");
      return null;
    }
    
    const docRef = await addDoc(conversationsRef, {
      userId,
      title,
      originalCode,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      messages: [
        {
          role: "user",
          content: originalCode,
          timestamp: new Date().toISOString()
        },
        {
          role: "assistant",
          content: initialResponse,
          timestamp: new Date().toISOString()
        }
      ]
    });
    
    console.log("Conversation created with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error creating conversation:", error);
    throw error;
  }
};

export const updateConversation = async (conversationId, newUserMessage, assistantResponse) => {
  if (!conversationId) {
    console.log("No conversation ID provided, skipping update");
    return;
  }
  
  try {
    const conversationRef = doc(db, "conversations", conversationId);
    
    const docSnap = await getDoc(conversationRef);
    if (!docSnap.exists()) {
      console.log("Conversation doesn't exist, can't update");
      return;
    }
    
    await updateDoc(conversationRef, {
      updatedAt: serverTimestamp(),
      messages: arrayUnion(
        {
          role: "user",
          content: newUserMessage.parts[0].text,
          timestamp: new Date().toISOString()
        },
        {
          role: "assistant",
          content: assistantResponse,
          timestamp: new Date().toISOString()
        }
      )
    });
    
    console.log("Conversation updated successfully");
  } catch (error) {
    console.error("Error updating conversation:", error);
    throw error;
  }
};

export const getUserConversations = async (userId) => {
  try {
    const q = query(
      conversationsRef, 
      where("userId", "==", userId),
      orderBy("updatedAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    const conversations = [];
    
    querySnapshot.forEach((doc) => {
      conversations.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return conversations;
  } catch (error) {
    console.error("Error getting user conversations:", error);
    throw error;
  }
};

export const getConversationById = async (conversationId) => {
  try {
    const docRef = doc(db, "conversations", conversationId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    } else {
      console.log("No such conversation!");
      return null;
    }
  } catch (error) {
    console.error("Error getting conversation:", error);
    throw error;
  }
};

