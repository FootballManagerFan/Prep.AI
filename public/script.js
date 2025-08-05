const recordBtn = document.getElementById("recordBtn");
const recordIcon = document.getElementById("recordIcon");
const recordLabel = document.getElementById("recordLabel");
const status = document.getElementById("status");
const chatMessages = document.getElementById("chatMessages");

let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let silenceTimer = null;
let audioContext = null;
let analyser = null;
let stream = null;
let conversationEnded = false; // Track if conversation was manually ended

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

// Cleanup functionality
const cleanupBtn = document.getElementById("cleanupBtn");

cleanupBtn.addEventListener("click", async () => {
  if (confirm("Are you sure you want to delete all uploaded files? This action cannot be undone.")) {
    try {
      cleanupBtn.disabled = true;
      cleanupBtn.textContent = "Cleaning...";
      
      const response = await fetch('/clean-uploads', { method: 'POST' });
      const data = await response.json();
      
      if (response.ok) {
        alert(`✅ ${data.message}\nFiles removed: ${data.filesRemoved}`);
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      alert('❌ Network error. Please try again.');
    } finally {
      cleanupBtn.disabled = false;
      cleanupBtn.textContent = "🧹 Clean Uploads Folder";
    }
  }
});