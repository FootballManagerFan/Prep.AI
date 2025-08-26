const recordBtn = document.getElementById("recordBtn");
const recordIcon = document.getElementById("recordIcon");
const recordLabel = document.getElementById("recordLabel");
const status = document.getElementById("status");
const chatMessages = document.getElementById("chatMessages");
const resumeUploadArea = document.getElementById("resumeUploadArea");
const resumeInput = document.getElementById("resumeInput");
const resumeStatus = document.getElementById("resumeStatus");
const resetResumeBtn = document.getElementById("resetResumeBtn");

let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let silenceTimer = null;
let audioContext = null;
let analyser = null;
let stream = null;
let conversationEnded = false; // Track if conversation was manually ended
let resumeUploaded = false;

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
    
    if (response.ok) {
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
      throw new Error(data.details || data.error || 'Upload failed');
    }
  } catch (error) {
    console.error('Resume upload error:', error);
    resumeStatus.textContent = `❌ Error: ${error.message}`;
    resumeStatus.className = 'mt-3 text-sm text-red-600';
    showNotification(`❌ Error: ${error.message}`, 'error');
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