import { useState, useEffect } from 'react';
import { motion } from 'framer-motion'; // Changed from 'motion/react' to the correct import
import { FaArrowLeft, FaSearch, FaTrash, FaClock, FaCode } from 'react-icons/fa';
import { MdSpeakerNotes } from 'react-icons/md';
import { GiNorthStarShuriken } from 'react-icons/gi';
import { useAuth } from './AuthContext';
import { getUserConversations, deleteConversation } from './services/firestore';

function ProfilePage({ onClose, onSelectConversation }) {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [indexError, setIndexError] = useState(false);
  
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        setIndexError(false);
        const userConversations = await getUserConversations(currentUser.uid);
        setConversations(userConversations);
        setError(null);
      } catch (err) {
        console.error("Error fetching conversations:", err);
        
        if (err.message && err.message.includes('index')) {
          setIndexError(true);
          setError("Firebase index is being created. This might take a few minutes.");
        } else {
          setError("Failed to load your conversation history.");
        }
      } finally {
        setLoading(false);
      }
    };
    
    if (currentUser?.uid) {
      fetchConversations();
    }
  }, [currentUser]);
  
  const filteredConversations = conversations.filter(convo => 
    convo.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    convo.originalCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const handleDeleteConversation = async (id) => {
    try {
      const success = await deleteConversation(id);
      
      if (success) {
        setConversations(conversations.filter(convo => convo.id !== id));
        setShowDeleteConfirm(null);
      } else {
        setError("Failed to delete conversation. Please try again.");
        setTimeout(() => setError(null), 3000);
        setShowDeleteConfirm(null);
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
      setError("An error occurred while deleting the conversation.");
      setTimeout(() => setError(null), 3000);
      setShowDeleteConfirm(null);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    
    let date;
    
    try {
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } 

      else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      }

      else if (typeof timestamp === 'number') {
        date = new Date(timestamp);
      }
      else if (timestamp instanceof Date) {
        date = timestamp;
      }

      else {
        return 'Invalid date';
      }

      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      const now = new Date();
      const diffInMs = now - date;
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      
      if (diffInDays === 0) {
        return new Intl.DateTimeFormat('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        }).format(date);
      } else if (diffInDays === 1) {
        return 'Yesterday';
      } else if (diffInDays < 7) {
        return `${diffInDays} days ago`;
      } else {
        return new Intl.DateTimeFormat('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        }).format(date);
      }
    } catch (error) {
      console.error("Error formatting date:", error, timestamp);
      return 'Date error';
    }
  };
  
  const getExcerpt = (code, maxLength = 100) => {
    if (!code) return '';
    return code.length > maxLength ? `${code.substring(0, maxLength)}...` : code;
  };
  
  const getMessageCount = (messages) => {
    if (!messages || !Array.isArray(messages)) return 0;
    return messages.length;
  };

  const handleConversationSelect = (conversationId) => {
    if (!showDeleteConfirm) {
      onSelectConversation(conversationId);
    }
  };

  return (
    <div className='bg-black flex w-full h-screen items-center justify-center'>
      <div className="w-[350px] h-[450px] flex flex-col bg-white/5 text-white overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-yellow-500/20">
          <div className="flex items-center gap-2">
            <motion.button
              onClick={onClose}
              className="text-yellow-400 hover:text-yellow-300 p-1"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <FaArrowLeft />
            </motion.button>
            <h1 className="text-lg font-semibold">Your Conversation History</h1>
          </div>
        </div>
        
        <div className="flex items-center p-3 bg-yellow-500/5">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-500/30 text-yellow-300 text-xl font-bold mr-3">
            {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 
             currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : '?'}
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-sm">{currentUser?.displayName || 'Codexa User'}</h2>
            <p className="text-xs text-gray-400">{currentUser?.email}</p>
          </div>
          <div className="text-xs text-gray-400">
            {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}
          </div>
        </div>
        
        {/* search bar */}
        <div className="p-2 border-b border-yellow-500/20">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full px-3 py-2 pl-9 bg-black/40 border border-yellow-500/30 rounded-md text-white text-sm focus:outline-none focus:border-yellow-400"
            />
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-yellow-500/50" />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full gap-2">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full"
              />
              <span className="ml-2 text-sm text-yellow-300">Loading conversations...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <p className={`${indexError ? "text-yellow-400" : "text-red-400"} mb-2`}>
                {error}
              </p>
              {indexError ? (
                <p className="text-gray-400 text-sm mb-4">
                  This happens once when you first use the app. Please wait a moment and try again.
                </p>
              ) : null}
              <button 
                onClick={() => window.location.reload()}
                className="text-sm text-yellow-400 hover:underline"
              >
                Try Again
              </button>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              {searchQuery ? (
                <p className="text-gray-400">No conversations match your search.</p>
              ) : (
                <div className="text-center">
                  <MdSpeakerNotes className="text-3xl text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400">You don't have any conversations yet.</p>
                  <p className="text-gray-500 text-sm mt-1">Start analyzing code to create one!</p>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-yellow-500/10">
              {filteredConversations.map((conversation) => (
                <div key={conversation.id} className="relative">
                  {showDeleteConfirm === conversation.id && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-black/90 z-10 flex items-center justify-center"
                    >
                      <div className="bg-gray-800 p-4 rounded-lg max-w-[250px] text-center">
                        <p className="text-sm mb-3">Delete this conversation?</p>
                        <div className="flex justify-center gap-3">
                          <button 
                            onClick={() => setShowDeleteConfirm(null)}
                            className="px-4 py-1.5 text-xs border border-gray-600 rounded hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => handleDeleteConversation(conversation.id)}
                            className="px-4 py-1.5 text-xs bg-red-500/20 text-red-300 border border-red-500/30 rounded hover:bg-red-500/30"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <motion.div
                    className="px-3 py-3 cursor-pointer hover:bg-white/5"
                    whileHover={{ scale: showDeleteConfirm ? 1 : 1.01 }}
                    onClick={() => handleConversationSelect(conversation.id)}
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-yellow-300 mb-0.5 line-clamp-1 pr-4">
                        {conversation.title || 'Untitled Conversation'}
                      </h3>
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500 mr-2">
                          {formatDate(conversation.updatedAt)}
                        </span>
                        <button 
                          className="text-gray-500 hover:text-yellow-400 p-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(conversation.id);
                          }}
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-300 line-clamp-2 font-mono bg-black/30 p-2 rounded mt-1 mb-2">
                      {getExcerpt(conversation.originalCode)}
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <FaClock size={10} />
                          {formatDate(conversation.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MdSpeakerNotes size={10} />
                          {getMessageCount(conversation.messages)} messages
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-gray-400">
                        <FaCode size={10} />
                        {conversation.originalCode?.length || 0} chars
                      </span>
                    </div>
                  </motion.div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Error toast notification */}
        {error && !indexError && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-md text-red-300 text-sm"
          >
            {error}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;