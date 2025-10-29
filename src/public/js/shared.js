// Shared JavaScript functions for Prep.AI
// This file eliminates duplicate code across multiple HTML files

// Common utility functions
const PrepAI = {
    // Clear output function - used across multiple pages
    clearOutput: function(outputElementId = 'codeOutput') {
        const element = document.getElementById(outputElementId);
        if (element) {
            element.textContent = '# Output cleared';
        }
    },

    // Run code function - used across multiple pages
    runCode: function(editor, outputElementId = 'codeOutput') {
        if (!editor) return;
        
        const code = editor.getValue();
        const output = document.getElementById(outputElementId);
        
        if (output) {
            output.textContent = `# Code executed:\n${code}\n\n# Note: This is a demo. In a real application, your code would be executed and results would be shown here.`;
        }
    },

    // Change programming language function
    changeLanguage: function(editor, currentProblem, languageSelectorId = 'languageSelector') {
        const languageSelector = document.getElementById(languageSelectorId);
        if (!languageSelector) return;
        
        const currentLanguage = languageSelector.value;
        
        if (editor && currentProblem && currentProblem.starterCode) {
            const newCode = currentProblem.starterCode[currentLanguage];
            if (newCode) {
                editor.setValue(newCode);
                if (window.monaco && window.monaco.editor) {
                    monaco.editor.setModelLanguage(editor.getModel(), currentLanguage);
                }
            }
        }
        return currentLanguage;
    },

    // Show error message function
    showError: function(message, containerSelector = '.left-panel') {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;
        
        const container = document.querySelector(containerSelector);
        if (container) {
            container.innerHTML = '';
            container.appendChild(errorDiv);
        }
    },

    // Format terminal output with proper styling
    formatTerminalOutput: function(output) {
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
                return `<span class="text-red-400">${this.escapeHtml(line)}</span><br>`;
            } else if (line.includes('Warning:') || line.includes('DeprecationWarning:')) {
                return `<span class="text-yellow-400">${this.escapeHtml(line)}</span><br>`;
            } else if (line.match(/^\s*>>>/)) {
                return `<span class="text-blue-400">${this.escapeHtml(line)}</span><br>`;
            } else if (line.match(/^\s*\.\.\./)) {
                return `<span class="text-blue-400">${this.escapeHtml(line)}</span><br>`;
            } else {
                return `<span class="text-green-300">${this.escapeHtml(line)}</span><br>`;
            }
        });
        
        return formattedLines.join('');
    },

    // Escape HTML to prevent XSS
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Start problem function - used across practice pages
    startProblem: function(problemId, category = '') {
        const url = category ? `/test?problem=${problemId}&category=${category}` : `/test?problem=${problemId}`;
        window.location.href = url;
    },

    // Generate random problem function
    generateRandomProblem: function(problems) {
        if (!problems || problems.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * problems.length);
        return problems[randomIndex];
    },

    // Create problem card HTML - eliminates repetitive card structures
    createProblemCard: function(problem, index) {
        const difficultyColors = {
            'Easy': 'bg-green-100 text-green-600',
            'Medium': 'bg-yellow-100 text-yellow-600',
            'Hard': 'bg-red-100 text-red-600'
        };
        
        const colorClass = difficultyColors[problem.difficulty] || 'bg-gray-100 text-gray-600';
        
        return `
            <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div class="flex items-center mb-4">
                    <div class="w-10 h-10 ${colorClass} rounded-lg flex items-center justify-center mr-3">
                        <span class="font-bold text-lg">${index}</span>
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold text-gray-900">${problem.title}</h3>
                        <span class="text-sm ${colorClass.replace('bg-', 'text-').replace('100', '600')} font-medium">${problem.difficulty}</span>
                    </div>
                </div>
                <p class="text-gray-600 mb-4">${problem.description}</p>
                <button onclick="PrepAI.startProblem('${problem.id}', '${problem.category.toLowerCase().replace(' ', '-')}')" 
                        class="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
                    Start Problem
                </button>
            </div>
        `;
    },

    // Create header HTML - eliminates repetitive header structures
    createHeader: function(title, subtitle, backLink = '/', showHome = true) {
        return `
            <header class="bg-white shadow-sm border-b border-gray-200">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between items-center py-6">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                                </svg>
                            </div>
                            <div>
                                <h1 class="text-2xl font-bold gradient-text">Prep.AI</h1>
                                <p class="text-sm text-gray-600">${subtitle}</p>
                            </div>
                        </div>
                        
                        <div class="flex items-center space-x-4">
                            <a href="${backLink}" class="text-blue-600 hover:text-blue-700 text-sm font-medium px-3 py-1 rounded hover:bg-blue-50 transition-colors">
                                ← Back
                            </a>
                            ${showHome ? '<a href="/" class="text-blue-600 hover:text-blue-700 text-sm font-medium px-3 py-1 rounded hover:bg-blue-50 transition-colors">Home</a>' : ''}
                        </div>
                    </div>
                </div>
            </header>
        `;
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PrepAI;
}
