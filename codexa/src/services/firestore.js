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
  deleteDoc
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

// Safely sanitize data before sending to Firestore
const sanitizeData = (data) => {
  // Handle undefined values or circular references
  return JSON.parse(JSON.stringify(data));
};

export const createConversation = async (userId, originalCode, title, initialResponse) => {
  try {
    if (!isValidCode(originalCode)) {
      console.log("Not creating conversation - input doesn't appear to be code");
      return null;
    }
    
    if (!userId) {
      console.error("Missing userId for conversation");
      return null;
    }
    
    // Ensure data is in proper format
    const conversationData = {
      userId,
      title: title || "Untitled Code Analysis",
      originalCode: originalCode.substring(0, 10000), // Limit size to prevent issues
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      messages: [
        {
          role: "user",
          content: originalCode.substring(0, 10000),
          timestamp: new Date().toISOString()
        },
        {
          role: "assistant",
          content: initialResponse.substring(0, 10000),
          timestamp: new Date().toISOString()
        }
      ]
    };
    
    // Safely sanitize data
    const safeData = sanitizeData(conversationData);
    
    const docRef = await addDoc(conversationsRef, safeData);
    
    console.log("Conversation created with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error creating conversation:", error);
    // Return null instead of throwing to prevent app crashes
    return null;
  }
};

export const updateConversation = async (conversationId, newUserMessage, assistantResponse) => {
  if (!conversationId) {
    console.log("No conversation ID provided, skipping update");
    return false;
  }
  
  try {
    const conversationRef = doc(db, "conversations", conversationId);
    
    const docSnap = await getDoc(conversationRef);
    if (!docSnap.exists()) {
      console.log("Conversation doesn't exist, can't update");
      return false;
    }
    
    // Extract the message content from the newUserMessage object
    const userMessageContent = newUserMessage.parts[0].text.replace(
      /\n \(Strict api rules to adhere to: Only answer if this question is related to the code initially provided in the first message, if no code or a random non code related statement was provided than deny to answer...\)$/, 
      ''
    );
    
    // Get current messages array
    const currentMessages = docSnap.data().messages || [];
    
    // Use a regular update with a formatted array instead of arrayUnion
    // This avoids potential size limitations with arrayUnion
    const updatedMessages = [
      ...currentMessages,
      {
        role: "user",
        content: userMessageContent.substring(0, 5000), // Limit size
        timestamp: new Date().toISOString()
      },
      {
        role: "assistant",
        content: assistantResponse.substring(0, 10000), // Limit size
        timestamp: new Date().toISOString()
      }
    ];
    
    // Safely sanitize data
    const safeData = sanitizeData({
      updatedAt: serverTimestamp(),
      messages: updatedMessages
    });
    
    await updateDoc(conversationRef, safeData);
    
    console.log("Conversation updated successfully");
    return true;
  } catch (error) {
    console.error("Error updating conversation:", error);
    return false;
  }
};

export const getUserConversations = async (userId) => {
  if (!userId) {
    console.error("Missing userId for fetching conversations");
    return [];
  }

  try {
    // Try the optimized query first
    try {
      const q = query(
        conversationsRef, 
        where("userId", "==", userId),
        orderBy("updatedAt", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      const conversations = [];
      
      querySnapshot.forEach((doc) => {
        // Safety check for corrupted data
        try {
          const data = doc.data();
          conversations.push({
            id: doc.id,
            ...data,
            // Ensure these fields exist even if they're missing in the database
            title: data.title || "Untitled Conversation",
            originalCode: data.originalCode || "",
            messages: Array.isArray(data.messages) ? data.messages : []
          });
        } catch (err) {
          console.error("Error processing conversation document:", err);
        }
      });
      
      return conversations;
    } catch (indexError) {
      // Check if this is an index missing error
      if (indexError.code === 'failed-precondition' && 
          indexError.message && 
          indexError.message.includes('index')) {
        
        console.error("Index required:", indexError.message);
        
        // Fall back to a non-ordered query as a temporary solution
        const fallbackQuery = query(
          conversationsRef, 
          where("userId", "==", userId)
        );
        
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const fallbackConversations = [];
        
        fallbackSnapshot.forEach((doc) => {
          fallbackConversations.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        // Sort client-side as a fallback
        return fallbackConversations.sort((a, b) => {
          const dateA = a.updatedAt?.toDate?.() || new Date(a.updatedAt || 0);
          const dateB = b.updatedAt?.toDate?.() || new Date(b.updatedAt || 0);
          return dateB - dateA;
        });
      } else {
        // Not an index error, rethrow
        throw indexError;
      }
    }
  } catch (error) {
    console.error("Error getting user conversations:", error);
    return [];
  }
};

export const getConversationById = async (conversationId) => {
  if (!conversationId) {
    console.error("Missing conversationId");
    return null;
  }

  try {
    const docRef = doc(db, "conversations", conversationId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        // Ensure these fields exist
        title: data.title || "Untitled Conversation",
        originalCode: data.originalCode || "",
        messages: Array.isArray(data.messages) ? data.messages : []
      };
    } else {
      console.log("No such conversation!");
      return null;
    }
  } catch (error) {
    console.error("Error getting conversation:", error);
    return null;
  }
};

export const deleteConversation = async (conversationId) => {
  if (!conversationId) {
    console.error("Missing conversationId for deletion");
    return false;
  }

  try {
    const conversationRef = doc(db, "conversations", conversationId);
    await deleteDoc(conversationRef);
    console.log("Conversation successfully deleted");
    return true;
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return false;
  }
};