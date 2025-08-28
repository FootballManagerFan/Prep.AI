const recordBtn = document.getElementById("recordBtn");
const recordIcon = document.getElementById("recordIcon");
const recordLabel = document.getElementById("recordLabel");
const status = document.getElementById("status");
const chatMessages = document.getElementById("chatMessages");
const resumeUploadArea = document.getElementById("resumeUploadArea");
const resumeInput = document.getElementById("resumeInput");
const resumeStatus = document.getElementById("resumeStatus");
const resetResumeBtn = document.getElementById("resetResumeBtn");
const textInput = document.getElementById("textInput");
const sendTextBtn = document.getElementById("sendTextBtn");
const testBtn = document.getElementById("testBtn");

let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let silenceTimer = null;
let audioContext = null;
let analyser = null;
let stream = null;
let conversationEnded = false; // Track if conversation was manually ended
let resumeUploaded = false;

// Monaco Editor variables
let editor = null;
let currentLanguage = 'python';

// Initialize Monaco Editor when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeMonacoEditor();
    setupEditorEventListeners();
});

// Initialize Monaco Editor
function initializeMonacoEditor() {
    require.config({ paths: { vs: 'https://unpkg.com/monaco-editor@0.45.0/min/vs' } });
    
    require(['vs/editor/editor.main'], function() {
        // Set up language-specific configurations
        const languageConfigs = {
            python: {
                language: 'python',
                theme: 'vs-dark',
                value: `# Welcome to Python!
# Write your solution here

def solve_problem():
    # Your code here
    pass

# Test your solution
if __name__ == "__main__":
    result = solve_problem()
    print(result)`
            },
            javascript: {
                language: 'javascript',
                theme: 'vs-dark',
                value: `// Welcome to JavaScript!
// Write your solution here

function solveProblem() {
    // Your code here
    return null;
}

// Test your solution
console.log(solveProblem());`
            },
            java: {
                language: 'java',
                theme: 'vs-dark',
                value: `// Welcome to Java!
// Write your solution here

public class Solution {
    public static void main(String[] args) {
        // Your code here
        System.out.println("Hello, World!");
    }
}`
            },
            cpp: {
                language: 'cpp',
                theme: 'vs-dark',
                value: `// Welcome to C++!
// Write your solution here

#include <iostream>
using namespace std;

int main() {
    // Your code here
    cout << "Hello, World!" << endl;
    return 0;
}`
            }
        };

        // Create editor instance
        editor = monaco.editor.create(document.getElementById('editorContainer'), {
            ...languageConfigs.python,
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: false,
            cursorStyle: 'line',
            theme: 'vs-dark'
        });

        // Set initial language
        updateEditorLanguage('python');
    });
}

// Set up event listeners for editor controls
function setupEditorEventListeners() {
    const languageSelect = document.getElementById('languageSelect');
    const runCodeBtn = document.getElementById('runCodeBtn');
    const clearOutputBtn = document.getElementById('clearOutputBtn');

    languageSelect.addEventListener('change', function() {
        const newLanguage = this.value;
        updateEditorLanguage(newLanguage);
    });

    runCodeBtn.addEventListener('click', function() {
        runCode();
    });

    clearOutputBtn.addEventListener('click', function() {
        clearOutput();
    });
}

// Update editor language and content
function updateEditorLanguage(language) {
    if (!editor) return;
    
    currentLanguage = language;
    
    const languageConfigs = {
        python: {
            language: 'python',
            value: `# Welcome to Python!
# Write your solution here

def solve_problem():
    # Your code here
    pass

# Test your solution
if __name__ == "__main__":
    result = solve_problem()
    print(result)`
        },
        javascript: {
            language: 'javascript',
            value: `// Welcome to JavaScript!
// Write your solution here

function solveProblem() {
    // Your code here
    return null;
}

// Test your solution
console.log(solveProblem());`
        },
        java: {
            language: 'java',
            value: `// Welcome to Java!
// Write your solution here

public class Solution {
    public static void main(String[] args) {
        // Your code here
        System.out.println("Hello, World!");
    }
}`
        },
        cpp: {
            language: 'cpp',
            value: `// Welcome to C++!
// Write your solution here

#include <iostream>
using namespace std;

int main() {
    // Your code here
    cout << "Hello, World!" << endl;
    return 0;
}`
        }
    };

    const config = languageConfigs[language];
    monaco.editor.setModelLanguage(editor.getModel(), config.language);
    editor.setValue(config.value);
}

// Run code function (placeholder for now)
function runCode() {
    const code = editor.getValue();
    const outputPanel = document.getElementById('outputPanel');
    
    // For now, just display the code (we'll add execution later)
    outputPanel.innerHTML = `<span class="text-green-600">✓ Code ready to execute!</span><br><span class="text-slate-600">Language: ${currentLanguage}</span><br><span class="text-slate-600">Lines: ${code.split('\n').length}</span>`;
    
    // TODO: Send code to backend for execution
    console.log('Code to execute:', code);
    console.log('Language:', currentLanguage);
}

// Clear output function
function clearOutput() {
    const outputPanel = document.getElementById('outputPanel');
    outputPanel.innerHTML = '<span class="text-slate-400">// Output cleared...</span>';
}

recordBtn.addEventListener("click", async () => {
  if (!isRecording) {
    isRecording = true;
    conversationEnded = false; // Reset the flag when starting
    recordBtn.classList.add("recording");
    recordLabel.textContent = "Click to stop recording";
    status.textContent = "Recording... Speak now!";
    await startRecording();
  } else {
    stopRecording(true); // Manual stop
  }
});

async function startRecording() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Set up audio analysis for silence detection
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    
    mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      console.log("Data chunk received:", event.data.size);
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      console.log("Recording stopped. Chunks collected:", audioChunks.length);
      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
      console.log("Blob size:", audioBlob.size);
      await uploadAudio(audioBlob);
    };

    mediaRecorder.start();
    console.log("MediaRecorder started. State:", mediaRecorder.state);
    
    // Start silence detection
    detectSilence();
  } catch (error) {
    console.error("Error starting recording:", error);
    status.textContent = "Error starting recording. Please check your microphone permissions.";
    isRecording = false;
    recordBtn.classList.remove("recording");
    recordLabel.textContent = "Click to start recording";
  }
}

function detectSilence() {
  if (!isRecording) return;
  
  const dataArray = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(dataArray);
  
  // Calculate volume level
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += (dataArray[i] - 128) * (dataArray[i] - 128);
  }
  const volume = Math.sqrt(sum / dataArray.length) / 128;
  
  // If volume is very low (silence), start timer
  if (volume < 0.01) {
    if (!silenceTimer) {
      console.log("Silence detected, starting 2-second timer...");
      silenceTimer = setTimeout(() => {
        if (isRecording) {
          console.log("Silence timer completed, stopping recording");
          status.textContent = "Processing your response...";
          stopRecording();
        }
      }, 2000); // 2 seconds of silence
    }
  } else {
    // Clear silence timer if sound is detected
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
      console.log("Sound detected, cleared silence timer");
    }
  }
  
  // Continue monitoring
  if (isRecording) {
    requestAnimationFrame(detectSilence);
  }
}

function stopRecording(isManual = false) {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
  }
  
  // Clean up audio analysis
  if (audioContext) {
    audioContext.close();
  }
  if (silenceTimer) {
    clearTimeout(silenceTimer);
    silenceTimer = null;
  }
  
  isRecording = false;

  // Only reset button if this was a manual stop
  if (isManual) {
    conversationEnded = true; // Mark conversation as ended
    recordBtn.classList.remove("recording");
    recordLabel.textContent = "Click to start recording";
    status.textContent = "Conversation ended.";
  }
}

async function uploadAudio(blob) {
  const formData = new FormData();
  formData.append("audio", blob, "recording.webm");
  
  try {
    const res = await fetch("/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    // Add user message to chat
    addMessageToChat('You', data.transcription, 'user');
    
    // Add AI message to chat
    addMessageToChat('AI Interviewer', data.nextQuestion, 'ai');
    
    status.textContent = "AI responded! Starting to listen for your next answer...";
    
    // Only auto-restart if conversation wasn't manually ended
    if (!conversationEnded) {
      setTimeout(() => {
        if (!isRecording && !conversationEnded) {
          isRecording = true;
          // Don't change button text - keep it as "Stop Recording"
          status.textContent = "Recording... Speak now!";
          startRecording();
        }
      }, 1000); // 1 second delay to let user read the AI response
    }
    
  } catch (err) {
    console.error("Upload failed:", err);
    status.textContent = "Upload failed. Please try again.";
  }
}

function addMessageToChat(sender, message, type) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'flex items-start space-x-3 ' + (type === 'user' ? 'justify-end' : '');
  
  const avatar = document.createElement('div');
  avatar.className = 'w-8 h-8 bg-gradient-to-r from-' + (type === 'user' ? 'secondary-500 to-secondary-600' : 'primary-500 to-primary-600') + ' rounded-full flex items-center justify-center text-white text-sm font-semibold';
  avatar.textContent = type === 'user' ? 'U' : 'AI';
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'flex-1 ' + (type === 'user' ? 'max-w-[80%]' : '');
  
  const messageBubble = document.createElement('div');
  messageBubble.className = type === 'user' 
    ? 'bg-gradient-to-r from-secondary-500 to-secondary-600 text-white rounded-2xl rounded-tr-md px-4 py-3 shadow-sm'
    : 'bg-white rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border border-slate-200';
  
  const messageText = document.createElement('p');
  messageText.className = type === 'user' ? '' : 'text-slate-800';
  messageText.textContent = message;
  
  const senderLabel = document.createElement('p');
  senderLabel.className = 'text-xs text-slate-400 mt-1 ' + (type === 'user' ? 'text-right' : '');
  senderLabel.textContent = sender;
  
  messageBubble.appendChild(messageText);
  contentDiv.appendChild(messageBubble);
  contentDiv.appendChild(senderLabel);
  
  if (type === 'user') {
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(avatar);
  } else {
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
  }
  
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Cleanup functionality with custom modal
const cleanupBtn = document.getElementById("cleanupBtn");
const confirmModal = document.getElementById("confirmModal");
const cancelBtn = document.getElementById("cancelBtn");
const confirmBtn = document.getElementById("confirmBtn");

// Show custom confirmation modal
cleanupBtn.addEventListener("click", () => {
  confirmModal.classList.remove("hidden");
});

// Hide modal on cancel
cancelBtn.addEventListener("click", () => {
  confirmModal.classList.add("hidden");
});

// Hide modal when clicking outside
confirmModal.addEventListener("click", (e) => {
  if (e.target === confirmModal) {
    confirmModal.classList.add("hidden");
  }
});

// Handle ESC key to close modal
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !confirmModal.classList.contains("hidden")) {
    confirmModal.classList.add("hidden");
  }
});

// Actual cleanup action
confirmBtn.addEventListener("click", async () => {
  // Hide modal first
  confirmModal.classList.add("hidden");
  
  try {
    cleanupBtn.disabled = true;
    cleanupBtn.textContent = "Cleaning...";
    
    const response = await fetch('/clean-uploads', { method: 'POST' });
    const data = await response.json();
    
    if (response.ok) {
      // Create custom success notification
      showNotification(`✅ ${data.message}\nFiles removed: ${data.filesRemoved}`, 'success');
    } else {
      showNotification(`❌ Error: ${data.error}`, 'error');
    }
  } catch (error) {
    console.error('Cleanup error:', error);
    showNotification('❌ Network error. Please try again.', 'error');
  } finally {
    cleanupBtn.disabled = false;
    cleanupBtn.textContent = "🧹 Clean Uploads Folder";
  }
});

// Custom notification function
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-full ${
    type === 'success' ? 'bg-green-500 text-white' : 
    type === 'error' ? 'bg-red-500 text-white' : 
    'bg-blue-500 text-white'
  }`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Slide in
  setTimeout(() => {
    notification.classList.remove('translate-x-full');
  }, 100);
  
  // Slide out and remove after 4 seconds
  setTimeout(() => {
    notification.classList.add('translate-x-full');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 4000);
}
//Resume upload functionality
resumeUploadArea.addEventListener('click', () => {
  resumeInput.click();
});

resumeUploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  resumeUploadArea.classList.add('border-primary-400', 'bg-primary-50');
});

resumeUploadArea.addEventListener('dragleave', (e) => {
  e.preventDefault();
  resumeUploadArea.classList.remove('border-primary-400', 'bg-primary-50');
});

resumeUploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  resumeUploadArea.classList.remove('border-primary-400', 'bg-primary-50');
  
  const files = e.dataTransfer.files;
  if (files.length > 0 && files[0].type === 'application/pdf') {
    handleResumeUpload(files[0]);
  } else {
    showNotification('❌ Please upload a PDF file only', 'error');
  }
});

resumeInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleResumeUpload(e.target.files[0]);
  }
});

async function handleResumeUpload(file) {
  console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);
  
  // Validate file type
  if (file.type !== 'application/pdf') {
    showNotification('❌ Please select a PDF file only', 'error');
    return;
  }
  
  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    showNotification('❌ File too large. Please select a PDF under 10MB', 'error');
    return;
  }
  
  const formData = new FormData();
  formData.append('resume', file);
  
  try {
    resumeStatus.textContent = 'Processing resume...';
    resumeStatus.classList.remove('hidden');
    resumeUploadArea.style.pointerEvents = 'none';
    resumeUploadArea.style.opacity = '0.6';
    
    console.log('Sending upload request...');
    const response = await fetch('/upload-resume', {
      method: 'POST',
      body: formData
    });
    
    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', data);
    
         if (response.ok && data.initialQuestion) {
       resumeUploaded = true;
       resumeStatus.textContent = `✅ Resume processed successfully! (${data.textLength} characters extracted)`;
       resumeStatus.className = 'mt-3 text-sm text-green-600';
       resetResumeBtn.classList.remove('hidden');
       
       // Add initial AI question based on resume
       addMessageToChat('AI Interviewer', data.initialQuestion, 'ai');
       
       showNotification('✅ Resume uploaded and processed!', 'success');
       
       // Update status
       status.textContent = 'Resume processed! Ready to start your personalized interview.';
          } else {
       throw new Error(data.error || data.details || 'Upload failed');
     }
   } catch (error) {
     console.error('Resume upload error:', {
       message: error.message,
       response: error.response,
       data: error.data
     });
     
     let errorMessage = error.message;
     
     // Handle network errors
     if (error.message.includes('fetch')) {
       errorMessage = 'Network error. Please check your connection and try again.';
     }
     
     resumeStatus.textContent = `❌ Error: ${errorMessage}`;
     resumeStatus.className = 'mt-3 text-sm text-red-600';
     showNotification(`❌ ${errorMessage}`, 'error');
  } finally {
    resumeUploadArea.style.pointerEvents = 'auto';
    resumeUploadArea.style.opacity = '1';
  }
}
// Reset resume functionality
resetResumeBtn.addEventListener('click', async () => {
  try {
    const response = await fetch('/reset-resume', { method: 'POST' });
    const data = await response.json();
    
    if (response.ok) {
      resumeUploaded = false;
      resumeStatus.classList.add('hidden');
      resetResumeBtn.classList.add('hidden');
      resumeInput.value = '';
      
      // Clear chat messages except the initial welcome
      const messages = chatMessages.querySelectorAll('.flex.items-start.space-x-3');
      messages.forEach((msg, index) => {
        if (index > 0) { // Keep the first welcome message
          msg.remove();
        }
      });
      
      status.textContent = 'Resume reset. Ready to upload a new resume or start interview.';
      showNotification('✅ Resume context reset successfully', 'success');
    }
  } catch (error) {
    console.error('Reset error:', error);
         showNotification('❌ Error resetting resume', 'error');
   }
 });

// Text input functionality
sendTextBtn.addEventListener('click', async () => {
  const message = textInput.value.trim();
  if (!message) return;
  
  // Add user message to chat
  addMessageToChat('You', message, 'user');
  textInput.value = '';
  
  try {
    sendTextBtn.disabled = true;
    sendTextBtn.textContent = 'Sending...';
    status.textContent = 'Processing your response...';
    
    const response = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    
    const data = await response.json();
    
    if (response.ok && data.reply) {
      // Add AI response to chat
      addMessageToChat('AI Interviewer', data.reply, 'ai');
      status.textContent = 'AI responded! Continue the conversation.';
    } else {
      throw new Error(data.error || 'Failed to send message');
    }
  } catch (error) {
    console.error('Text send error:', error);
    addMessageToChat('AI Interviewer', '❌ Sorry, there was an error processing your message. Please try again.', 'ai');
    status.textContent = 'Error occurred. Please try again.';
  } finally {
    sendTextBtn.disabled = false;
    sendTextBtn.textContent = 'Send Response';
  }
});

// Allow Enter key to send text (Shift+Enter for new line)
textInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendTextBtn.click();
  }
});

// System test functionality
testBtn.addEventListener('click', async () => {
  try {
    testBtn.disabled = true;
    testBtn.textContent = 'Testing...';
    
    const results = [];
    
    // Test PDF parser
    try {
      const pdfResponse = await fetch('/test-pdf');
      const pdfData = await pdfResponse.json();
      results.push(`✅ PDF Parser: ${pdfData.message}`);
    } catch (e) {
      results.push(`❌ PDF Parser: ${e.message}`);
    }
    
    // Test OpenAI connection
    try {
      const aiResponse = await fetch('/test-openai');
      const aiData = await aiResponse.json();
      if (aiData.success) {
        results.push(`✅ OpenAI: ${aiData.message}`);
      } else {
        results.push(`❌ OpenAI: ${aiData.error} (${aiData.code})`);
      }
    } catch (e) {
      results.push(`❌ OpenAI: ${e.message}`);
    }
    
    // Show results
    const resultText = results.join('\n');
    showNotification(resultText, results.every(r => r.startsWith('✅')) ? 'success' : 'error');
    
    // Also add to chat for visibility
    addMessageToChat('System', `Test Results:\n${resultText}`, 'ai');
    
  } catch (error) {
    console.error('Test error:', error);
    showNotification('❌ Test failed: ' + error.message, 'error');
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = '🔍 Test System';
  }
});