import { 
  conversationsRef, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  orderBy,
  getDocs, 
  db,
  serverTimestamp 
} from "../googleAuth/main.js";

// Function to create a new conversation in Firestore
export const createConversation = async (userId, originalCode, title, initialResponse) => {
  try {
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

// Function to update an existing conversation with new messages
export const updateConversation = async (conversationId, newMessage, assistantResponse) => {
  try {
    const conversationRef = doc(db, "conversations", conversationId);
    
    await updateDoc(conversationRef, {
      updatedAt: serverTimestamp(),
      messages: [
        ...newMessage,
        {
          role: "assistant",
          content: assistantResponse,
          timestamp: new Date().toISOString()
        }
      ]
    });
    
    console.log("Conversation updated successfully");
  } catch (error) {
    console.error("Error updating conversation:", error);
    throw error;
  }
};

// Function to get all conversations for a user
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

// Function to get a specific conversation by ID
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

