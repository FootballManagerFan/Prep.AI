const recordBtn = document.getElementById("recordBtn");
const recordIcon = document.getElementById("recordIcon");
const recordLabel = document.getElementById("recordLabel");
const status = document.getElementById("status");
const chatMessages = document.getElementById("chatMessages");
const resumeUploadArea = document.getElementById("resumeUploadArea");
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
    initializeSplitPane();
});

// Initialize Monaco Editor
function initializeMonacoEditor() {
    // Check if Monaco is already loaded
    if (typeof require === 'undefined') {
        console.error('Monaco Editor loader not found');
        return;
    }
    
    require.config({ paths: { vs: 'https://unpkg.com/monaco-editor@0.45.0/min/vs' } });
    
            require(['vs/editor/editor.main'], function() {
            console.log('Monaco Editor loaded successfully');
            
            try {
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
        const editorContainer = document.getElementById('editorContainer');
        if (!editorContainer) {
            console.error('Editor container not found');
            return;
        }

        editor = monaco.editor.create(editorContainer, {
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
        
        console.log('Monaco Editor initialized successfully');
        
        // Add a fallback for when Monaco fails to initialize
        } catch (error) {
            console.error('Failed to initialize Monaco Editor:', error);
            // Show fallback message in editor container
            const editorContainer = document.getElementById('editorContainer');
            if (editorContainer) {
                editorContainer.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500"><p>Code editor failed to load. Please refresh the page.</p></div>';
            }
        }
    });
}

// Set up event listeners for editor controls
function setupEditorEventListeners() {
    const languageSelect = document.getElementById('languageSelect');
    const runCodeBtn = document.getElementById('runCodeBtn');
    const clearOutputBtn = document.getElementById('clearOutputBtn');
    const toggleOutputBtn = document.getElementById('toggleOutputBtn');

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

    // Toggle output section visibility
    toggleOutputBtn.addEventListener('click', function() {
        const outputSection = document.getElementById('outputSection');
        const verticalDivider = document.getElementById('verticalSplitDivider');
        const isCollapsed = outputSection.classList.contains('output-section-collapsed');
        
        if (isCollapsed) {
            // Expand
            outputSection.classList.remove('output-section-collapsed');
            verticalDivider.classList.remove('vertical-split-divider-collapsed');
            outputSection.style.height = '200px';
            outputSection.style.overflow = 'auto';
            outputSection.style.border = '';
            outputSection.style.padding = '';
            verticalDivider.style.height = '6px';
            verticalDivider.style.overflow = 'visible';
            this.textContent = '📊';
            this.title = 'Hide Output Panel';
        } else {
            // Collapse
            outputSection.classList.add('output-section-collapsed');
            verticalDivider.classList.add('vertical-split-divider-collapsed');
            outputSection.style.height = '0px';
            outputSection.style.overflow = 'hidden';
            outputSection.style.border = 'none';
            outputSection.style.padding = '0';
            verticalDivider.style.height = '0px';
            verticalDivider.style.overflow = 'hidden';
            this.textContent = '📈';
            this.title = 'Show Output Panel';
        }
        
        // Trigger Monaco editor resize if available
        if (window.monaco && editor) {
            setTimeout(() => editor.layout(), 300);
        }
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

// Run code function (updated for Docker execution)
async function runCode() {
    const code = editor.getValue();
    const outputPanel = document.getElementById('outputPanel');
    
    try {
        // Show loading state with terminal-like styling
        outputPanel.innerHTML = `
            <div class="terminal-header bg-gray-800 text-green-400 px-3 py-2 rounded-t-lg border-b border-gray-700 font-mono text-xs">
                <span class="flex items-center">
                    <span class="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                    <span class="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                    <span class="text-green-400 mr-3"></span>
                    <span class="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                    <span class="text-gray-400">Terminal</span>
                </span>
            </div>
            <div class="terminal-body bg-gray-900 text-green-400 p-3 rounded-b-lg font-mono text-sm">
                <div class="flex items-center">
                    <span class="text-green-400 mr-2">$</span>
                    <span class="text-blue-400">${currentLanguage === 'python' ? 'python' : 'node'} script</span>
                    <span class="text-gray-500 ml-2"># Executing in secure container...</span>
                </div>
            </div>
        `;
        
        const response = await fetch('/execute-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                code: code, 
                language: currentLanguage 
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Format output like a real terminal
            const formattedOutput = formatTerminalOutput(data.output);
            outputPanel.innerHTML = `
                <div class="terminal-header bg-gray-800 text-green-400 px-3 py-2 rounded-t-lg border-b border-gray-700 font-mono text-xs">
                    <span class="flex items-center">
                        <span class="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                        <span class="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                        <span class="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                        <span class="text-gray-400">Terminal</span>
                    </span>
                </div>
                <div class="terminal-body bg-gray-900 text-green-400 p-3 rounded-b-lg font-mono text-sm">
                    <div class="flex items-center mb-2">
                        <span class="text-green-400 mr-2">$</span>
                        <span class="text-blue-400">${currentLanguage === 'python' ? 'python' : 'node'} script</span>
                        <span class="text-gray-500 ml-2"># Execution completed successfully</span>
                    </div>
                    <div class="terminal-output bg-black bg-opacity-50 p-2 rounded border border-gray-700 mt-2">
                        ${formattedOutput}
                    </div>
                </div>
            `;
        } else {
            // Show error in terminal style
            outputPanel.innerHTML = `
                <div class="terminal-header bg-gray-800 text-red-400 px-3 py-2 rounded-t-lg border-b border-gray-700 font-mono text-xs">
                    <span class="flex items-center">
                        <span class="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                        <span class="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                        <span class="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                        <span class="text-gray-400">Terminal</span>
                    </span>
                </div>
                <div class="terminal-body bg-gray-900 text-red-400 p-3 rounded-b-lg font-mono text-sm">
                    <div class="flex items-center mb-2">
                        <span class="text-red-400 mr-2">$</span>
                    <span class="text-red-400">Error</span>
                        <span class="text-gray-500 ml-2"># Execution failed</span>
                    </div>
                    <div class="terminal-output bg-black bg-opacity-50 p-2 rounded border border-gray-700 mt-2 text-red-300">
                        ${data.error}
                    </div>
                </div>
            `;
        }
    } catch (error) {
        // Show network/connection errors
        outputPanel.innerHTML = `
            <div class="terminal-header bg-gray-800 text-red-400 px-3 py-2 rounded-t-lg border-b border-gray-700 font-mono text-xs">
                <span class="flex items-center">
                    <span class="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                    <span class="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                    <span class="text-red-400 mr-3"></span>
                    <span class="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                    <span class="text-gray-400">Terminal</span>
                </span>
            </div>
            <div class="terminal-body bg-gray-900 text-red-400 p-3 rounded-b-lg font-mono text-sm">
                <div class="flex items-center mb-2">
                    <span class="text-red-400 mr-2">$</span>
                    <span class="text-red-400">Connection Error</span>
                    <span class="text-gray-500 ml-2"># Network issue</span>
                </div>
                <div class="terminal-output bg-black bg-opacity-50 p-2 rounded border border-gray-700 mt-2 text-red-300">
                    ${error.message}
                </div>
            </div>
        `;
    }
}

// Clear output function
function clearOutput() {
    const outputPanel = document.getElementById('outputPanel');
    outputPanel.innerHTML = `
        <div class="terminal-header bg-gray-800 text-gray-400 px-3 py-2 rounded-t-lg border-b border-gray-700 font-mono text-xs">
            <span class="flex items-center">
                <span class="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                <span class="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                <span class="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                <span class="text-gray-400">Terminal</span>
            </span>
        </div>
        <div class="terminal-body bg-gray-900 text-gray-400 p-3 rounded-b-lg font-mono text-sm">
            <div class="flex items-center">
                <span class="text-gray-500 mr-2">$</span>
                <span class="text-gray-500">clear</span>
                <span class="text-gray-600 ml-2"># Output cleared</span>
            </div>
        </div>
    `;
}

// Format terminal output with proper styling
function formatTerminalOutput(output) {
    if (!output) return '<span class="text-gray-500">(no output)</span>';
    
    // AGGRESSIVE cleaning - remove ALL weird Docker symbols and non-standard characters
    let cleanOutput = output
        // Remove all Docker artifacts and weird symbols (comprehensive list)
        .replace(/[☺♂♣‼∟⌂☻♥♦♠♣•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼]/g, '')
        // Remove any other non-printable characters except basic punctuation
        .replace(/[^\x20-\x7E\n\r\t]/g, '')
        // Remove empty lines and normalize spacing
        .replace(/\n\s*\n/g, '\n')
        .trim();
    
    // Split output into lines and format each line
    const lines = cleanOutput.split('\n');
    const formattedLines = lines.map(line => {
        if (line.trim() === '') return '<br>';
        
        // Detect different types of output and style accordingly
        if (line.includes('Error:') || line.includes('Traceback:')) {
            return `<span class="text-red-400">${escapeHtml(line)}</span><br>`;
        } else if (line.includes('Warning:') || line.includes('DeprecationWarning:')) {
            return `<span class="text-yellow-400">${escapeHtml(line)}</span><br>`;
        } else if (line.match(/^\s*>>>/)) {
            return `<span class="text-blue-400">${escapeHtml(line)}</span><br>`;
        } else if (line.match(/^\s*\.\.\./)) {
            return `<span class="text-blue-400">${escapeHtml(line)}</span><br>`;
        } else {
            return `<span class="text-green-300">${escapeHtml(line)}</span><br>`;
        }
    });
    
    return formattedLines.join('');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

recordBtn.addEventListener("click", async () => {
  if (!isRecording) {
    isRecording = true;
    conversationEnded = false; // Reset the flag when starting
    recordBtn.classList.add("recording");
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
  messageText.className = type === 'user' ? 'text-black' : 'text-slate-800';
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
// Resume upload functionality - Updated for new button
const resumeUploadBtn = document.getElementById('resumeUploadBtn');
const resumeInput = document.createElement('input');
resumeInput.type = 'file';
resumeInput.accept = '.pdf';
resumeInput.style.display = 'none';
document.body.appendChild(resumeInput);

resumeUploadBtn.addEventListener('click', () => {
  resumeInput.click();
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
    resumeStatus.classList.remove('hidden');
    resumeStatus.querySelector('p').textContent = 'Processing resume...';
    resumeUploadBtn.disabled = true;
    resumeUploadBtn.style.opacity = '0.6';
    
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
               resumeStatus.classList.remove('hidden');
        resumeStatus.querySelector('p').textContent = `✅ Resume processed successfully! (${data.textLength} characters extracted)`;
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
     
           resumeStatus.classList.remove('hidden');
      resumeStatus.querySelector('p').textContent = `❌ Error: ${errorMessage}`;
      resumeStatus.querySelector('p').className = 'text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg inline-block shadow-sm border border-red-200';
     showNotification(`❌ ${errorMessage}`, 'error');
  } finally {
    resumeUploadBtn.disabled = false;
    resumeUploadBtn.style.opacity = '1';
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

// Split Pane Functionality
function initializeSplitPane() {
    const splitPane = document.querySelector('.split-pane');
    const leftPane = document.querySelector('.split-pane-left');
    const rightPane = document.querySelector('.split-pane-right');
    const divider = document.getElementById('splitDivider');
    
    console.log('Split pane elements found:', { splitPane, leftPane, rightPane, divider });
    
    if (!splitPane || !leftPane || !rightPane || !divider) {
        console.error('Split pane elements not found');
        return;
    }
    
    // Initialize output panel with terminal styling
    const outputPanel = document.getElementById('outputPanel');
    if (outputPanel) {
        outputPanel.innerHTML = `
            <div class="terminal-header bg-gray-800 text-gray-400 px-3 py-2 rounded-t-lg border-b border-gray-700 font-mono text-xs">
                <span class="flex items-center">
                    <span class="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                    <span class="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                    <span class="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                    <span class="text-gray-400">Terminal</span>
                </span>
            </div>
            <div class="terminal-body bg-gray-900 text-gray-400 p-3 rounded-b-lg font-mono text-sm">
                <div class="flex items-center">
                    <span class="text-gray-500 mr-2">$</span>
                    <span class="text-gray-500">Ready</span>
                    <span class="text-gray-600 ml-2"># Waiting for code execution...</span>
                </div>
            </div>
        `;
    }
    
    let isResizing = false;
    let startX, startLeftWidth, startRightWidth;

    function startResize(e) {
        isResizing = true;
        startX = e.clientX;
        startLeftWidth = leftPane.offsetWidth;
        startRightWidth = rightPane.offsetWidth;
        
        // Visual feedback during resize
        divider.style.background = '#3b82f6';
        divider.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.3)';
        
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
        
        // Prevent text selection during resize
        e.preventDefault();
    }

    function resize(e) {
        if (!isResizing) return;
        
        const deltaX = e.clientX - startX;
        const newLeftWidth = startLeftWidth + deltaX;
        const newRightWidth = startRightWidth - deltaX;
        
        // Minimum widths
        const minWidth = 300;
        
        if (newLeftWidth >= minWidth && newRightWidth >= minWidth) {
            // Use flex-basis for better flexbox compatibility
            const totalWidth = splitPane.offsetWidth;
            const leftPercentage = (newLeftWidth / totalWidth) * 100;
            const rightPercentage = (newRightWidth / totalWidth) * 100;
            
            leftPane.style.flexBasis = leftPercentage + '%';
            rightPane.style.flexBasis = rightPercentage + '%';
        }
    }

    function stopResize() {
        isResizing = false;
        
        // Reset visual feedback
        divider.style.background = '#e5e7eb';
        divider.style.boxShadow = 'none';
        
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
    }

    // Add event listeners with improved responsiveness
    divider.addEventListener('mousedown', startResize);
    divider.addEventListener('mouseenter', function() {
        divider.style.cursor = 'col-resize';
        divider.style.background = '#3b82f6';
    });
    divider.addEventListener('mouseleave', function() {
        if (!isResizing) {
            divider.style.cursor = 'col-resize';
            divider.style.background = '#e5e7eb';
        }
    });
    
    // Make the entire divider area responsive
    const resizeHandle = divider.querySelector('.resize-handle');
    if (resizeHandle) {
        resizeHandle.addEventListener('mousedown', startResize);
        resizeHandle.addEventListener('mouseenter', function() {
            divider.style.cursor = 'col-resize';
            divider.style.background = '#3b82f6';
        });
    }
    

    
    // Touch support for mobile
    divider.addEventListener('touchstart', function(e) {
        startResize(e.touches[0]);
    });
    
    document.addEventListener('touchend', stopResize);
    document.addEventListener('touchmove', function(e) {
        if (isResizing) {
            resize(e.touches[0]);
        }
    });
    


    // Initialize with 50/50 split using flex-basis
    leftPane.style.flexBasis = '50%';
    rightPane.style.flexBasis = '50%';
    
    console.log('Split pane initialized successfully');
    console.log('Initial pane sizes:', {
        leftWidth: leftPane.offsetWidth,
        rightWidth: rightPane.offsetWidth,
        leftFlexBasis: leftPane.style.flexBasis,
        rightFlexBasis: rightPane.style.flexBasis
    });
    
    // Initialize vertical split pane for code editor and output
    initializeVerticalSplitPane();
}

// Vertical Split Pane Functionality for Code Editor and Output
function initializeVerticalSplitPane() {
    const rightPane = document.querySelector('.split-pane-right');
    const editorContainer = document.getElementById('editorContainer');
    const outputSection = document.getElementById('outputSection');
    const verticalDivider = document.getElementById('verticalSplitDivider');
    
    console.log('Vertical split pane elements found:', { rightPane, editorContainer, outputSection, verticalDivider });
    
    if (!rightPane || !editorContainer || !outputSection || !verticalDivider) {
        console.error('Vertical split pane elements not found');
        return;
    }
    
    let isVerticalResizing = false;
    let startY, startEditorHeight, startOutputHeight;
    
    function startVerticalResize(e) {
        isVerticalResizing = true;
        startY = e.clientY;
        startEditorHeight = editorContainer.offsetHeight;
        startOutputHeight = outputSection.offsetHeight;
        
        // Visual feedback during resize
        verticalDivider.style.background = '#3b82f6';
        verticalDivider.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.3)';
        
        document.addEventListener('mousemove', verticalResize);
        document.addEventListener('mouseup', stopVerticalResize);
        
        // Prevent text selection during resize
        e.preventDefault();
    }
    
         function verticalResize(e) {
         if (!isVerticalResizing) return;
         
         const deltaY = e.clientY - startY;
         const newEditorHeight = startEditorHeight + deltaY;
         const newOutputHeight = startOutputHeight - deltaY;
         
         // Allow output to be completely hidden (minimum height 0)
         const minEditorHeight = 200;
         const minOutputHeight = 0;
         
         if (newEditorHeight >= minEditorHeight && newOutputHeight >= minOutputHeight) {
             editorContainer.style.height = newEditorHeight + 'px';
             
             // If output height is very small, hide it completely
             if (newOutputHeight <= 10) {
                 outputSection.style.height = '0px';
                 outputSection.style.overflow = 'hidden';
                 outputSection.style.border = 'none';
                 outputSection.style.padding = '0';
                 
                 // Hide the vertical divider as well
                 verticalDivider.style.height = '0px';
                 verticalDivider.style.overflow = 'hidden';
                 
                 // Add collapsed class for CSS styling
                 outputSection.classList.add('output-section-collapsed');
                 verticalDivider.classList.add('vertical-split-divider-collapsed');
             } else {
                 outputSection.style.height = newOutputHeight + 'px';
                 outputSection.style.overflow = 'auto';
                 outputSection.style.border = '';
                 outputSection.style.padding = '';
                 
                 // Show the vertical divider
                 verticalDivider.style.height = '6px';
                 verticalDivider.style.overflow = 'visible';
                 
                 // Remove collapsed classes
                 outputSection.classList.remove('output-section-collapsed');
                 verticalDivider.classList.remove('vertical-split-divider-collapsed');
             }
             
             // Trigger Monaco editor resize if available
             if (window.monaco && editor) {
                 editor.layout();
             }
         }
     }
    
    function stopVerticalResize() {
        isVerticalResizing = false;
        
        // Reset visual feedback
        verticalDivider.style.background = '#e5e7eb';
        verticalDivider.style.boxShadow = 'none';
        
        document.removeEventListener('mousemove', verticalResize);
        document.removeEventListener('mouseup', stopVerticalResize);
    }
    
         // Add event listeners for vertical resize
     verticalDivider.addEventListener('mousedown', startVerticalResize);
     verticalDivider.addEventListener('mouseenter', function() {
         verticalDivider.style.cursor = 'row-resize';
         verticalDivider.style.background = '#3b82f6';
     });
     verticalDivider.addEventListener('mouseleave', function() {
         if (!isVerticalResizing) {
             verticalDivider.style.cursor = 'row-resize';
             verticalDivider.style.background = '#e5e7eb';
         }
     });
     
     // Double-click to quickly toggle output section
     verticalDivider.addEventListener('dblclick', function() {
         const toggleOutputBtn = document.getElementById('toggleOutputBtn');
         if (toggleOutputBtn) {
             toggleOutputBtn.click();
         }
     });
    
    // Make the entire vertical divider area responsive
    const verticalResizeHandle = verticalDivider.querySelector('.vertical-resize-handle');
    if (verticalResizeHandle) {
        verticalResizeHandle.addEventListener('mousedown', startVerticalResize);
        verticalResizeHandle.addEventListener('mouseenter', function() {
            verticalDivider.style.cursor = 'row-resize';
            verticalDivider.style.background = '#3b82f6';
        });
    }
    
    // Touch support for mobile
    verticalDivider.addEventListener('touchstart', function(e) {
        startVerticalResize(e.touches[0]);
    });
    
    document.addEventListener('touchend', stopVerticalResize);
    document.addEventListener('touchmove', function(e) {
        if (isVerticalResizing) {
            verticalResize(e.touches[0]);
        }
    });
    
    console.log('Vertical split pane initialized successfully');
}